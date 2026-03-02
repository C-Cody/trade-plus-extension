import { describe, expect, it } from "vitest";
import type { TradeItem } from "../components/ItemCard";
import { filterInventoryItems } from "./inventory";

const ITEMS: TradeItem[] = [
    {
        id: "1",
        assetId: 1,
        name: "Alpha Hat",
        rap: 100,
        defaultValue: 500,
        trend: "flat",
    },
    {
        id: "2",
        assetId: 2,
        name: "Beta Wings",
        rap: 300,
        trend: "flat",
        holding: true,
    },
    { id: "3", assetId: 3, name: "Gamma Sword", rap: 200, trend: "flat" },
];

describe("inventory domain", () => {
    it("sorts by value high to low", () => {
        const result = filterInventoryItems(ITEMS, {
            sortMode: "value-desc",
            hideHolding: false,
            searchQuery: "",
        });
        expect(result.map((item) => item.id)).toEqual(["1", "2", "3"]);
    });

    it("sorts by rap high to low", () => {
        const result = filterInventoryItems(ITEMS, {
            sortMode: "rap-desc",
            hideHolding: false,
            searchQuery: "",
        });
        expect(result.map((item) => item.id)).toEqual(["2", "3", "1"]);
    });

    it("hides holding items when enabled", () => {
        const result = filterInventoryItems(ITEMS, {
            sortMode: "value-desc",
            hideHolding: true,
            searchQuery: "",
        });
        expect(result.map((item) => item.id)).toEqual(["1", "3"]);
    });

    it("applies case-insensitive search", () => {
        const result = filterInventoryItems(ITEMS, {
            sortMode: "name-asc",
            hideHolding: false,
            searchQuery: "gAmMa",
        });
        expect(result.map((item) => item.id)).toEqual(["3"]);
    });
});
