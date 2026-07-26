import { defineBackground } from "wxt/utils/define-background";
import {
    SYNC_EXTENSION_ROUTE_ZOOM_MESSAGE,
    type SyncExtensionRouteZoomMessage,
} from "../src/constants/runtimeMessages";
import {
    ROBLOX_WEBSITE_ZOOM_LEVEL_KEY,
    TRADE_PLUS_ZOOM_LEVEL_KEY,
} from "../src/constants/storageKeys";
import { targetFromUrl } from "../src/routes";

const ROLIMONS_URL = "https://api.rolimons.com/items/v3/itemdetails";
const ROLIMONS_REFRESH_MS = 60_000;
const GET_ROLIMONS_ITEMS_MESSAGE = "trade-plus:get-rolimons-items";
const DEFAULT_TRADE_PLUS_ZOOM_LEVEL = 1;
const PROGRAMMATIC_ZOOM_WINDOW_MS = 2_000;
const ROUTE_SWITCH_ZOOM_GUARD_MS = 1_200;
const ZOOM_EPSILON = 0.001;

let rolimonsCache: unknown | null = null;
let rolimonsLastUpdatedAt = 0;
let rolimonsInFlight: Promise<unknown | null> | null = null;
const tabExtensionRouteState = new Map<number, boolean>();
const tabProgrammaticZoomTarget = new Map<number, { until: number; zoom: number }>();
const tabLastRouteSwitchAt = new Map<number, number>();

function toRuntimeError(prefix: string): Error {
    const message = chrome.runtime.lastError?.message ?? "Unknown extension API error";
    return new Error(`${prefix}: ${message}`);
}

function isPromiseLike<T = unknown>(value: unknown): value is Promise<T> {
    return (
        typeof value === "object" &&
        value !== null &&
        "then" in value &&
        typeof (value as { then?: unknown }).then === "function"
    );
}

function storageLocalGet(
    keys: string[],
): Promise<Record<string, unknown>> {
    return new Promise((resolve, reject) => {
        let settled = false;
        const finish = (fn: () => void) => {
            if (settled) return;
            settled = true;
            fn();
        };

        const maybePromise = chrome.storage.local.get(keys, (items) => {
            if (chrome.runtime.lastError) {
                finish(() => reject(toRuntimeError("storage.local.get failed")));
                return;
            }
            finish(() => resolve(items as Record<string, unknown>));
        });

        if (isPromiseLike<Record<string, unknown>>(maybePromise)) {
            maybePromise
                .then((items) => finish(() => resolve(items)))
                .catch((error) =>
                    finish(() =>
                        reject(
                            error instanceof Error
                                ? error
                                : new Error(String(error)),
                        ),
                    ),
                );
        }
    });
}

function storageLocalSet(items: Record<string, unknown>): Promise<void> {
    return new Promise((resolve, reject) => {
        let settled = false;
        const finish = (fn: () => void) => {
            if (settled) return;
            settled = true;
            fn();
        };

        const maybePromise = chrome.storage.local.set(items, () => {
            if (chrome.runtime.lastError) {
                finish(() => reject(toRuntimeError("storage.local.set failed")));
                return;
            }
            finish(resolve);
        });

        if (isPromiseLike<void>(maybePromise)) {
            maybePromise
                .then(() => finish(resolve))
                .catch((error) =>
                    finish(() =>
                        reject(
                            error instanceof Error
                                ? error
                                : new Error(String(error)),
                        ),
                    ),
                );
        }
    });
}

function tabsGetZoom(tabId: number): Promise<number> {
    return new Promise((resolve, reject) => {
        let settled = false;
        const timer = setTimeout(() => {
            if (settled) return;
            settled = true;
            reject(new Error("tabs.getZoom timed out"));
        }, 3000);

        const finish = (fn: () => void) => {
            if (settled) return;
            settled = true;
            clearTimeout(timer);
            fn();
        };

        const maybePromise = chrome.tabs.getZoom(tabId, (zoomFactor) => {
            if (chrome.runtime.lastError) {
                finish(() => reject(toRuntimeError("tabs.getZoom failed")));
                return;
            }
            finish(() => resolve(zoomFactor));
        });

        if (isPromiseLike<number>(maybePromise)) {
            maybePromise
                .then((zoomFactor) => finish(() => resolve(zoomFactor)))
                .catch((error) =>
                    finish(() =>
                        reject(
                            error instanceof Error
                                ? error
                                : new Error(String(error)),
                        ),
                    ),
                );
        }
    });
}

function tabsSetZoom(tabId: number, zoomFactor: number): Promise<void> {
    return new Promise((resolve, reject) => {
        let settled = false;
        const timer = setTimeout(() => {
            if (settled) return;
            settled = true;
            reject(new Error("tabs.setZoom timed out"));
        }, 3000);

        const finish = (fn: () => void) => {
            if (settled) return;
            settled = true;
            clearTimeout(timer);
            fn();
        };

        const maybePromise = chrome.tabs.setZoom(tabId, zoomFactor, () => {
            if (chrome.runtime.lastError) {
                finish(() => reject(toRuntimeError("tabs.setZoom failed")));
                return;
            }
            finish(resolve);
        });

        if (isPromiseLike<void>(maybePromise)) {
            maybePromise
                .then(() => finish(resolve))
                .catch((error) =>
                    finish(() =>
                        reject(
                            error instanceof Error
                                ? error
                                : new Error(String(error)),
                        ),
                    ),
                );
        }
    });
}

function tabsGet(tabId: number): Promise<chrome.tabs.Tab> {
    return new Promise((resolve, reject) => {
        let settled = false;
        const finish = (fn: () => void) => {
            if (settled) return;
            settled = true;
            fn();
        };

        const maybePromise = chrome.tabs.get(tabId, (tab) => {
            if (chrome.runtime.lastError) {
                finish(() => reject(toRuntimeError("tabs.get failed")));
                return;
            }
            finish(() => resolve(tab));
        });

        if (isPromiseLike<chrome.tabs.Tab>(maybePromise)) {
            maybePromise
                .then((tab) => finish(() => resolve(tab)))
                .catch((error) =>
                    finish(() =>
                        reject(
                            error instanceof Error
                                ? error
                                : new Error(String(error)),
                        ),
                    ),
                );
        }
    });
}

function isRolimonsMessage(message: unknown): boolean {
    return (
        typeof message === "object" &&
        message !== null &&
        (message as { type?: string }).type === GET_ROLIMONS_ITEMS_MESSAGE
    );
}

function isZoomSyncMessage(message: unknown): message is SyncExtensionRouteZoomMessage {
    return (
        typeof message === "object" &&
        message !== null &&
        (message as { type?: string }).type === SYNC_EXTENSION_ROUTE_ZOOM_MESSAGE &&
        typeof (message as { extensionRouteActive?: unknown })
            .extensionRouteActive === "boolean"
    );
}

function isRobloxWebsiteUrl(url: string | undefined): boolean {
    if (!url) {
        return false;
    }

    try {
        return new URL(url).hostname === "www.roblox.com";
    } catch {
        return false;
    }
}

async function enforceZoomForTabContext(
    tabId: number,
    extensionRouteActive: boolean,
    persistCurrentAsNormal = false,
): Promise<void> {
    let currentZoom = 0;
    try {
        currentZoom = await tabsGetZoom(tabId);
    } catch {
        return;
    }

    if (persistCurrentAsNormal) {
        void storageLocalSet({
            [ROBLOX_WEBSITE_ZOOM_LEVEL_KEY]: currentZoom,
        });
    }

    const stored = await storageLocalGet([
        ROBLOX_WEBSITE_ZOOM_LEVEL_KEY,
        TRADE_PLUS_ZOOM_LEVEL_KEY,
    ]);

    let tradePlusZoomLevel =
        typeof stored[TRADE_PLUS_ZOOM_LEVEL_KEY] === "number"
            ? (stored[TRADE_PLUS_ZOOM_LEVEL_KEY] as number)
            : undefined;
    let robloxWebsiteZoomLevel =
        typeof stored[ROBLOX_WEBSITE_ZOOM_LEVEL_KEY] === "number"
            ? (stored[ROBLOX_WEBSITE_ZOOM_LEVEL_KEY] as number)
            : undefined;

    if (typeof tradePlusZoomLevel !== "number") {
        tradePlusZoomLevel = DEFAULT_TRADE_PLUS_ZOOM_LEVEL;
    }

    if (typeof robloxWebsiteZoomLevel !== "number") {
        robloxWebsiteZoomLevel = currentZoom;
        if (
            !extensionRouteActive &&
            Math.abs(currentZoom - DEFAULT_TRADE_PLUS_ZOOM_LEVEL) > ZOOM_EPSILON
        ) {
            void storageLocalSet({
                [ROBLOX_WEBSITE_ZOOM_LEVEL_KEY]: currentZoom,
            });
        }
    }

    const desiredZoom = extensionRouteActive
        ? tradePlusZoomLevel
        : robloxWebsiteZoomLevel;

    if (Math.abs(desiredZoom - currentZoom) <= ZOOM_EPSILON) {
        return;
    }

    try {
        tabProgrammaticZoomTarget.set(tabId, {
            zoom: desiredZoom,
            until: Date.now() + PROGRAMMATIC_ZOOM_WINDOW_MS,
        });
        await tabsSetZoom(tabId, desiredZoom);
    } catch {
        // Ignore zoom API failures (browser differences, closed tabs, or temporary races).
    }
}

function shouldHaveExtensionZoom(url: string | undefined): boolean {
    if (!url) {
        return false;
    }

    try {
        return targetFromUrl(url) !== null;
    } catch {
        return false;
    }
}

async function refreshRolimons(force = false): Promise<unknown | null> {
    const now = Date.now();
    const isFresh =
        rolimonsCache !== null &&
        now - rolimonsLastUpdatedAt < ROLIMONS_REFRESH_MS;

    if (!force && isFresh) {
        return rolimonsCache;
    }

    if (rolimonsInFlight) {
        return rolimonsInFlight;
    }

    rolimonsInFlight = (async () => {
        try {
            const response = await fetch(ROLIMONS_URL, {
                method: "GET",
                credentials: "omit",
                cache: "no-store",
            });
            if (!response.ok) {
                return rolimonsCache;
            }

            const payload = await response.json().catch(() => null);
            if (!payload) {
                return rolimonsCache;
            }

            rolimonsCache = payload;
            rolimonsLastUpdatedAt = Date.now();
            return rolimonsCache;
        } catch {
            return rolimonsCache;
        } finally {
            rolimonsInFlight = null;
        }
    })();

    return rolimonsInFlight;
}

export default defineBackground(() => {
    void refreshRolimons(true);
    setInterval(() => {
        void refreshRolimons(true);
    }, ROLIMONS_REFRESH_MS);

    chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
        if (isRolimonsMessage(message)) {
            void refreshRolimons(false).then((payload) => {
                sendResponse(payload);
            });
            return true;
        }

        if (isZoomSyncMessage(message)) {
            const tabId = _sender.tab?.id;
            if (typeof tabId === "number") {
                const wasExtensionRouteActive =
                    tabExtensionRouteState.get(tabId) === true;
                tabExtensionRouteState.set(tabId, message.extensionRouteActive);
                if (wasExtensionRouteActive !== message.extensionRouteActive) {
                    tabLastRouteSwitchAt.set(tabId, Date.now());
                }
                void (async () => {
                    await enforceZoomForTabContext(
                        tabId,
                        message.extensionRouteActive,
                        message.extensionRouteActive &&
                            !wasExtensionRouteActive,
                    );
                    let currentZoom: number | null = null;
                    try {
                        currentZoom = await tabsGetZoom(tabId);
                    } catch {
                        currentZoom = null;
                    }
                    sendResponse({ ok: true, currentZoom });
                })();
                return true;
            }
            sendResponse({ ok: false, currentZoom: null });
            return false;
        }

        return false;
    });

    chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
        const url = changeInfo.url ?? tab.url;
        if (!isRobloxWebsiteUrl(url)) {
            tabExtensionRouteState.delete(tabId);
            tabProgrammaticZoomTarget.delete(tabId);
            return;
        }

        const extensionRouteActive = shouldHaveExtensionZoom(url);
        const wasExtensionRouteActive =
            tabExtensionRouteState.get(tabId) === true;
        tabExtensionRouteState.set(tabId, extensionRouteActive);
        if (wasExtensionRouteActive !== extensionRouteActive) {
            tabLastRouteSwitchAt.set(tabId, Date.now());
        }
        void enforceZoomForTabContext(
            tabId,
            extensionRouteActive,
            extensionRouteActive && !wasExtensionRouteActive,
        );
    });

    chrome.tabs.onZoomChange.addListener((zoomChangeInfo) => {
        if (typeof zoomChangeInfo.tabId !== "number") {
            return;
        }

        const tabId = zoomChangeInfo.tabId;
        const newZoom =
            typeof zoomChangeInfo.newZoomFactor === "number"
                ? zoomChangeInfo.newZoomFactor
                : null;
        const target = tabProgrammaticZoomTarget.get(tabId);
        if (target && Date.now() <= target.until) {
            if (
                newZoom === null ||
                Math.abs(target.zoom - newZoom) <= ZOOM_EPSILON
            ) {
                tabProgrammaticZoomTarget.delete(tabId);
                return;
            }
        }

        void tabsGet(tabId)
            .then(async (tab) => {
                if (!isRobloxWebsiteUrl(tab.url)) {
                    return;
                }

                const extensionRouteActive = shouldHaveExtensionZoom(tab.url);

                if (typeof zoomChangeInfo.newZoomFactor !== "number") {
                    return;
                }

                if (!extensionRouteActive) {
                    const lastSwitchAt = tabLastRouteSwitchAt.get(tabId);
                    if (
                        typeof lastSwitchAt === "number" &&
                        Date.now() - lastSwitchAt < ROUTE_SWITCH_ZOOM_GUARD_MS
                    ) {
                        const stored = await storageLocalGet([
                            TRADE_PLUS_ZOOM_LEVEL_KEY,
                        ]);
                        const tradeZoomLevel =
                            typeof stored[TRADE_PLUS_ZOOM_LEVEL_KEY] === "number"
                                ? (stored[TRADE_PLUS_ZOOM_LEVEL_KEY] as number)
                                : undefined;
                        if (
                            typeof tradeZoomLevel === "number" &&
                            Math.abs(
                                tradeZoomLevel - zoomChangeInfo.newZoomFactor,
                            ) <= ZOOM_EPSILON
                        ) {
                            return;
                        }
                    }

                    await storageLocalSet({
                        [ROBLOX_WEBSITE_ZOOM_LEVEL_KEY]:
                            zoomChangeInfo.newZoomFactor,
                    });
                    return;
                }

                const lastSwitchAt = tabLastRouteSwitchAt.get(tabId);
                if (
                    typeof lastSwitchAt === "number" &&
                    Date.now() - lastSwitchAt < ROUTE_SWITCH_ZOOM_GUARD_MS
                ) {
                    return;
                }

                await storageLocalSet({
                    [TRADE_PLUS_ZOOM_LEVEL_KEY]: zoomChangeInfo.newZoomFactor,
                });
            })
            .catch(() => {
                // Tab may already be gone.
            });
    });

    chrome.tabs.onRemoved.addListener((tabId) => {
        tabExtensionRouteState.delete(tabId);
        tabProgrammaticZoomTarget.delete(tabId);
        tabLastRouteSwitchAt.delete(tabId);
    });
});
