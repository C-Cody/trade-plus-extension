export const STAY_ON_PAGE_AFTER_SEND_KEY = "trade-stage:stay-on-page-after-send";
export const ROBLOX_WEBSITE_ZOOM_LEVEL_KEY = "robloxWebsiteZoomLevel";
export const TRADE_PLUS_ZOOM_LEVEL_KEY = "tradePlusZoomLevel";

export function inventoryHideHoldingKey(side: "my" | "their"): string {
    return `inventory-hide-holding:${side}`;
}

export function inventorySortModeKey(side: "my" | "their"): string {
    return `inventory-sort-mode:${side}`;
}

export function inventorySearchKey(side: "my" | "their"): string {
    return `inventory-search:${side}`;
}
