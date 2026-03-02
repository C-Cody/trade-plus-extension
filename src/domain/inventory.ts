import type { TradeItem } from "../components/ItemCard";
import { itemValue } from "./trade";

export type SortMode =
    | "value-desc"
    | "value-asc"
    | "rap-desc"
    | "rap-asc"
    | "name-asc"
    | "name-desc";

export type InventoryFilters = {
    sortMode: SortMode;
    hideHolding: boolean;
    searchQuery: string;
};

export function sortInventoryItems(
    items: TradeItem[],
    mode: SortMode,
): TradeItem[] {
    const sorted = [...items];

    if (mode === "value-desc") {
        sorted.sort((a, b) => itemValue(b) - itemValue(a));
        return sorted;
    }

    if (mode === "value-asc") {
        sorted.sort((a, b) => itemValue(a) - itemValue(b));
        return sorted;
    }

    if (mode === "rap-desc") {
        sorted.sort((a, b) => b.rap - a.rap);
        return sorted;
    }

    if (mode === "rap-asc") {
        sorted.sort((a, b) => a.rap - b.rap);
        return sorted;
    }

    if (mode === "name-asc") {
        sorted.sort((a, b) => a.name.localeCompare(b.name));
        return sorted;
    }

    sorted.sort((a, b) => b.name.localeCompare(a.name));
    return sorted;
}

export function filterInventoryItems(
    items: TradeItem[],
    filters: InventoryFilters,
): TradeItem[] {
    const normalizedQuery = filters.searchQuery.trim().toLowerCase();
    let nextItems = sortInventoryItems(items, filters.sortMode);

    if (filters.hideHolding) {
        nextItems = nextItems.filter((item) => !item.holding);
    }

    if (!normalizedQuery) {
        return nextItems;
    }

    return nextItems.filter((item) =>
        item.name.toLowerCase().includes(normalizedQuery),
    );
}
