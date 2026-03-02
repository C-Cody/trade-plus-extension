import { defineBackground } from "wxt/utils/define-background";

const ROLIMONS_URL = "https://api.rolimons.com/items/v2/itemdetails";
const ROLIMONS_REFRESH_MS = 60_000;
const GET_ROLIMONS_ITEMS_MESSAGE = "trade-plus:get-rolimons-items";

let rolimonsCache: unknown | null = null;
let rolimonsLastUpdatedAt = 0;
let rolimonsInFlight: Promise<unknown | null> | null = null;

function isRolimonsMessage(message: unknown): boolean {
    return (
        typeof message === "object" &&
        message !== null &&
        (message as { type?: string }).type === GET_ROLIMONS_ITEMS_MESSAGE
    );
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

        return false;
    });
});
