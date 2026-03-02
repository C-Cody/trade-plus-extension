export const STAY_ON_PAGE_AFTER_SEND_KEY = "trade-stage:stay-on-page-after-send";

export function inventoryHideHoldingKey(side: "my" | "their"): string {
    return `inventory-hide-holding:${side}`;
}

export function inventorySortModeKey(side: "my" | "their"): string {
    return `inventory-sort-mode:${side}`;
}

export function inventorySearchKey(side: "my" | "their"): string {
    return `inventory-search:${side}`;
}
