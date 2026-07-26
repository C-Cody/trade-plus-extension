import { describe, expect, it } from "vitest";
import type { TradeItem } from "./ItemCard";
import { itemDetailsUrl } from "./ItemCard";

function item(itemType: TradeItem["itemType"]): TradeItem {
    return {
        id: "instance",
        assetId: 42,
        itemType,
        name: "Item",
        rap: 100,
        trend: "flat",
    };
}

describe("itemDetailsUrl", () => {
    it("links assets to the catalog", () => {
        expect(itemDetailsUrl(item("Asset"))).toBe(
            "https://www.roblox.com/catalog/42",
        );
    });

    it("links bundles to the bundle details page", () => {
        expect(itemDetailsUrl(item("Bundle"))).toBe(
            "https://www.roblox.com/bundles/42",
        );
    });
});
