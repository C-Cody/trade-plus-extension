import { describe, expect, it } from "vitest";
import type { TradeItem } from "../components/ItemCard";
import {
    OFFER_LIMIT,
    buildTradeItemMap,
    parseRobuxInput,
    pruneOfferSelection,
    removeFromOfferSelection,
    sumRap,
    sumValue,
    toggleOfferSelection,
    toOfferItems,
    toSelectableIdSet,
} from "./trade";

function makeItem(id: string, rap: number, holding = false): TradeItem {
    return {
        id,
        assetId: Number(id.replace(/\D/g, "")) || 1,
        itemType: "Asset",
        name: `item-${id}`,
        rap,
        trend: "flat",
        holding,
    };
}

describe("trade domain", () => {
    it("filters non-selectable ids from an existing selection", () => {
        const selectableIds = new Set(["a", "b"]);
        expect(pruneOfferSelection(["a", "x", "b"], selectableIds)).toEqual([
            "a",
            "b",
        ]);
    });

    it("enforces offer limit and blocks non-selectable items", () => {
        const selectableIds = new Set(["a", "b", "c", "d", "e"]);
        const atLimit = ["a", "b", "c", "d"];

        expect(
            toggleOfferSelection(atLimit, "e", selectableIds, OFFER_LIMIT),
        ).toEqual(atLimit);
        expect(
            toggleOfferSelection(["a"], "x", selectableIds, OFFER_LIMIT),
        ).toEqual(["a"]);
    });

    it("maps selected ids to concrete offer items", () => {
        const itemMap = buildTradeItemMap([
            makeItem("a", 10),
            makeItem("b", 20),
        ]);
        expect(
            toOfferItems(["b", "a", "missing"], itemMap).map((item) => item.id),
        ).toEqual(["b", "a"]);
    });

    it("builds selectable id set by excluding holding items", () => {
        const itemMap = buildTradeItemMap([
            makeItem("a", 10),
            makeItem("b", 20, true),
        ]);
        expect([...toSelectableIdSet(itemMap)]).toEqual(["a"]);
    });

    it("handles removal, rap totals and robux parsing", () => {
        const items = [
            makeItem("a", 100),
            { ...makeItem("b", 250), defaultValue: 500 },
        ];

        expect(removeFromOfferSelection(["a", "b"], "a")).toEqual(["b"]);
        expect(sumRap(items)).toBe(350);
        expect(sumValue(items)).toBe(600);
        expect(parseRobuxInput("250")).toBe(250);
        expect(parseRobuxInput("-3")).toBe(0);
        expect(parseRobuxInput("abc")).toBe(0);
        expect(parseRobuxInput("1000000000")).toBe(1);
    });
});
