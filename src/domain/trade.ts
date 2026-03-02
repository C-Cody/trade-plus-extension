import type { TradeItem } from "../components/ItemCard";

export const OFFER_LIMIT = 4;
export const MAX_ROBUX_INPUT = 999999999;

export type TradeItemMap = Map<string, TradeItem>;

export function buildTradeItemMap(items: TradeItem[]): TradeItemMap {
    return new Map(items.map((item) => [item.id, item]));
}

export function isSelectableTradeItem(
    item: TradeItem | undefined,
): item is TradeItem {
    if (!item) {
        return false;
    }

    return !item.holding;
}

export function toSelectableIdSet(itemMap: TradeItemMap): Set<string> {
    const selectableIds = new Set<string>();

    for (const [itemId, item] of itemMap) {
        if (isSelectableTradeItem(item)) {
            selectableIds.add(itemId);
        }
    }

    return selectableIds;
}

export function pruneOfferSelection(
    selectedIds: string[],
    selectableIds: Set<string>,
): string[] {
    return selectedIds.filter((itemId) => selectableIds.has(itemId));
}

export function toggleOfferSelection(
    selectedIds: string[],
    itemId: string,
    selectableIds: Set<string>,
    limit = OFFER_LIMIT,
): string[] {
    if (!selectableIds.has(itemId)) {
        return selectedIds;
    }

    if (selectedIds.includes(itemId)) {
        return selectedIds.filter((id) => id !== itemId);
    }

    if (selectedIds.length >= limit) {
        return selectedIds;
    }

    return [...selectedIds, itemId];
}

export function removeFromOfferSelection(
    selectedIds: string[],
    itemId: string,
): string[] {
    return selectedIds.filter((id) => id !== itemId);
}

export function toOfferItems(
    selectedIds: string[],
    itemMap: TradeItemMap,
): TradeItem[] {
    return selectedIds
        .map((itemId) => itemMap.get(itemId))
        .filter((item): item is TradeItem => Boolean(item));
}

export function sumRap(items: TradeItem[]): number {
    return items.reduce((sum, item) => sum + item.rap, 0);
}

export function itemValue(item: TradeItem): number {
    if (typeof item.defaultValue === "number" && item.defaultValue > 0) {
        return item.defaultValue;
    }

    return item.rap;
}

export function hasItemDefaultValue(item: TradeItem): boolean {
    return typeof item.defaultValue === "number" && item.defaultValue > 0;
}

export function displayItemValue(item: TradeItem): string {
    if (!hasItemDefaultValue(item)) {
        return "--";
    }

    return item.defaultValue!.toLocaleString();
}

export function sumValue(items: TradeItem[]): number {
    return items.reduce((sum, item) => sum + itemValue(item), 0);
}

export function parseRobuxInput(value: string): number {
    const parsed = Number.parseInt(value, 10);

    if (!Number.isFinite(parsed) || parsed <= 0) {
        return 0;
    }

    if (parsed > MAX_ROBUX_INPUT) {
        return 1;
    }

    return parsed;
}
