import { describe, expect, it } from "vitest";
import {
    INITIAL_TRADE_SELECTION_STATE,
    tradeSelectionReducer,
} from "./tradeSelection";

describe("tradeSelectionReducer", () => {
    it("resets to initial state", () => {
        const dirtyState = {
            myOfferIds: ["a"],
            theirOfferIds: ["b"],
            myRobux: "12",
            theirRobux: "99",
        };

        expect(tradeSelectionReducer(dirtyState, { type: "reset" })).toEqual(
            INITIAL_TRADE_SELECTION_STATE,
        );
    });

    it("toggles selection with selectable guards", () => {
        const selectable = new Set(["a", "b"]);
        let state = tradeSelectionReducer(INITIAL_TRADE_SELECTION_STATE, {
            type: "toggle-mine",
            itemId: "a",
            selectableIds: selectable,
        });

        expect(state.myOfferIds).toEqual(["a"]);

        state = tradeSelectionReducer(state, {
            type: "toggle-mine",
            itemId: "x",
            selectableIds: selectable,
        });
        expect(state.myOfferIds).toEqual(["a"]);

        state = tradeSelectionReducer(state, {
            type: "toggle-mine",
            itemId: "a",
            selectableIds: selectable,
        });
        expect(state.myOfferIds).toEqual([]);
    });

    it("prunes invalid ids during sync", () => {
        const state = {
            ...INITIAL_TRADE_SELECTION_STATE,
            myOfferIds: ["a", "b", "c"],
        };

        const synced = tradeSelectionReducer(state, {
            type: "sync-mine",
            selectableIds: new Set(["b", "c"]),
        });
        expect(synced.myOfferIds).toEqual(["b", "c"]);
    });

    it("normalizes robux input to positive integers", () => {
        let state = tradeSelectionReducer(INITIAL_TRADE_SELECTION_STATE, {
            type: "set-my-robux",
            value: "250",
        });
        expect(state.myRobux).toBe("250");

        state = tradeSelectionReducer(state, {
            type: "set-their-robux",
            value: "-20",
        });
        expect(state.theirRobux).toBe("0");
    });
});
