import { createRoot, type Root } from "react-dom/client";
import { defineContentScript } from "wxt/utils/define-content-script";
import { TradePlusApp } from "../src/TradePlusApp";
import { observeSpaNavigation } from "../src/runtime/navigation";
import { PAGE_STYLE_CSS, SHADOW_CSS } from "../src/runtime/styles";
import { targetFromUrl } from "../src/routes";

const PAGE_STYLE_ID = "trade-plus-page-style";

let host: HTMLDivElement | null = null;
let appRoot: Root | null = null;
const PAGE_FETCH_BRIDGE_FLAG = "tradePlusPageFetchBridgeInstalled";

function ensurePageFetchBridge() {
    const pageWindow = window as Window & {
        [PAGE_FETCH_BRIDGE_FLAG]?: boolean;
    };
    if (pageWindow[PAGE_FETCH_BRIDGE_FLAG]) {
        return;
    }

    const script = document.createElement("script");
    script.textContent = `(() => {
      if (window.${PAGE_FETCH_BRIDGE_FLAG}) return;
      window.${PAGE_FETCH_BRIDGE_FLAG} = true;
      window.addEventListener("message", async (event) => {
        if (event.source !== window) return;
        const data = event.data;
        if (!data || data.type !== "trade-plus:page-fetch-request" || !data.requestId || !data.url) return;
        try {
          const response = await fetch(data.url, {
            method: data.init?.method,
            headers: data.init?.headers,
            body: data.init?.body ?? undefined,
            credentials: data.init?.credentials ?? "include",
          });
          const body = await response.text();
          window.postMessage({
            type: "trade-plus:page-fetch-response",
            requestId: data.requestId,
            ok: true,
            status: response.status,
            statusText: response.statusText,
            headers: [...response.headers.entries()],
            body,
          }, "*");
        } catch (error) {
          window.postMessage({
            type: "trade-plus:page-fetch-response",
            requestId: data.requestId,
            ok: false,
            error: error instanceof Error ? error.message : "Unknown page fetch error",
          }, "*");
        }
      });
    })();`;
    (document.documentElement || document.head || document.body).append(script);
    script.remove();
}

function ensurePageStyle() {
    if (document.getElementById(PAGE_STYLE_ID)) {
        return;
    }

    const style = document.createElement("style");
    style.id = PAGE_STYLE_ID;
    style.textContent = PAGE_STYLE_CSS;
    document.head.append(style);
}

function render(target: NonNullable<ReturnType<typeof targetFromUrl>>) {
    const routeKey =
        target.kind === "trade-counter"
            ? `trade-counter:${target.tradeId}`
            : `user-trade:${target.userId}`;
    appRoot?.render(<TradePlusApp key={routeKey} target={target} />);
}

function mount(target: ReturnType<typeof targetFromUrl>) {
    if (!target) {
        return;
    }

    if (host) {
        render(target);
        return;
    }

    host = document.createElement("div");
    host.id = "trade-plus-root";
    document.body.append(host);

    const shadowRoot = host.attachShadow({ mode: "open" });

    const style = document.createElement("style");
    style.textContent = SHADOW_CSS;
    shadowRoot.append(style);

    const mountPoint = document.createElement("div");
    shadowRoot.append(mountPoint);

    appRoot = createRoot(mountPoint);

    ensurePageStyle();
    document.documentElement.setAttribute("data-trade-plus-active", "true");
    render(target);
}

function unmount() {
    document.documentElement.removeAttribute("data-trade-plus-active");
    appRoot?.unmount();
    appRoot = null;
    host?.remove();
    host = null;
}

function syncRoute() {
    const target = targetFromUrl(window.location.href);

    if (!target) {
        unmount();
        return;
    }

    console.info("[Trade Plus] active on route", target);
    mount(target);
}

export default defineContentScript({
    matches: ["*://www.roblox.com/*"],
    runAt: "document_end",
    main() {
        ensurePageFetchBridge();
        observeSpaNavigation(syncRoute);
        syncRoute();
    },
});
