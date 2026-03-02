import { existsSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { defineConfig } from "wxt";

// WXT config for build/dev behavior, extension manifest fields, and browser profiles/permissions.
function resolveFirefoxBinary(): string | undefined {
    const localAppData = process.env.LOCALAPPDATA ?? "";
    const candidates = [
        process.env.FIREFOX_BINARY,
        "C:\\Program Files\\Mozilla Firefox\\firefox.exe",
        "C:\\Program Files (x86)\\Mozilla Firefox\\firefox.exe",
        localAppData
            ? `${localAppData}\\Microsoft\\WindowsApps\\Mozilla.Firefox_n80bbvh6b1yt2\\firefox.exe`
            : undefined,
        localAppData
            ? `${localAppData}\\ms-playwright\\firefox-1509\\firefox\\firefox.exe`
            : undefined,
    ].filter(
        (value): value is string =>
            typeof value === "string" && value.length > 0,
    );

    return candidates.find((path) => existsSync(path));
}

const firefoxBinary = resolveFirefoxBinary();
const firefoxProfilePath = resolve(".wxt/firefox-profile");
if (!existsSync(firefoxProfilePath)) {
    mkdirSync(firefoxProfilePath, { recursive: true });
}
const HOST_PATTERNS = [
    "*://www.roblox.com/*",
    "*://users.roblox.com/*",
    "*://inventory.roblox.com/*",
    "*://trades.roblox.com/*",
    "*://thumbnails.roblox.com/*",
    "*://api.rolimons.com/*",
] as const;
const ICON_PATH = "icons/TradePlusThumbnail.png";
const ICONS = {
    16: ICON_PATH,
    32: ICON_PATH,
    48: ICON_PATH,
    128: ICON_PATH,
} as const;

export default defineConfig({
    modules: ["@wxt-dev/module-react"],
    webExt: {
        keepProfileChanges: true,
        chromiumProfile: resolve(".wxt/chrome-profile"),
        firefoxProfile: firefoxProfilePath,
        binaries: firefoxBinary
            ? {
                  firefox: firefoxBinary,
              }
            : undefined,
        startUrls: ["https://www.roblox.com/users/261/trade"],
    },
    manifest: ({ manifestVersion }) => ({
        name: "Trade Plus",
        description: "Replace Roblox trade page with an improved one.",
        version: "0.1.0",
        icons: ICONS,
        ...(manifestVersion === 3
            ? {
                  action: {
                      default_icon: ICONS,
                  },
              }
            : {
                  browser_action: {
                      default_icon: ICONS,
                  },
              }),
        permissions:
            manifestVersion === 2
                ? ["storage", ...HOST_PATTERNS]
                : ["storage"],
        host_permissions: [...HOST_PATTERNS],
        browser_specific_settings: {
            gecko: {
                id: "trade-plus@example.com",
                strict_min_version: "128.0",
            },
        },
    }),
});
