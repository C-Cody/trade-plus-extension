import { describe, expect, it } from "vitest";
import { targetFromUrl } from "./routes";

describe("targetFromUrl", () => {
    it("matches /trades/{tradeId}/counter", () => {
        expect(
            targetFromUrl("https://www.roblox.com/trades/123456/counter"),
        ).toEqual({
            kind: "trade-counter",
            tradeId: "123456",
        });
    });

    it("matches /users/{userId}/trade", () => {
        expect(
            targetFromUrl("https://www.roblox.com/users/987654/trade"),
        ).toEqual({
            kind: "user-trade",
            userId: "987654",
        });
    });

    it("returns null for non-targeted paths", () => {
        expect(
            targetFromUrl("https://www.roblox.com/trades/123456"),
        ).toBeNull();
        expect(
            targetFromUrl("https://www.roblox.com/users/987654/profile"),
        ).toBeNull();
        expect(targetFromUrl("https://www.roblox.com/home")).toBeNull();
    });
});
