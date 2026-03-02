import { describe, expect, it } from "vitest";
import { parseChallengeFromHeaders, parseRobloxErrorMessage } from "./http";

describe("parseRobloxErrorMessage", () => {
    it("reads message from array payload", () => {
        expect(parseRobloxErrorMessage([{ message: "array-error" }])).toBe(
            "array-error",
        );
    });

    it("returns null when array first item has no message", () => {
        expect(
            parseRobloxErrorMessage([{ code: 0 }, { message: "ignored" }]),
        ).toBeNull();
    });

    it("prefers top-level message over nested errors", () => {
        expect(
            parseRobloxErrorMessage({
                message: "top-level",
                errors: [{ message: "nested" }],
            }),
        ).toBe("top-level");
    });

    it("falls back to nested error message", () => {
        expect(
            parseRobloxErrorMessage({
                errors: [{ message: "nested-only" }],
            }),
        ).toBe("nested-only");
    });

    it("returns null for non-object payloads", () => {
        expect(parseRobloxErrorMessage("oops")).toBeNull();
        expect(parseRobloxErrorMessage(null)).toBeNull();
    });
});

describe("parseChallengeFromHeaders", () => {
    it("returns null when challenge headers are missing", () => {
        const res = new Response("{}", { status: 403 });
        expect(parseChallengeFromHeaders(res)).toBeNull();
    });

    it("returns null when metadata is invalid base64/json", () => {
        const res = new Response("{}", {
            status: 403,
            headers: {
                "rblx-challenge-id": "header-1",
                "rblx-challenge-metadata": "%%%invalid%%%",
            },
        });
        expect(parseChallengeFromHeaders(res)).toBeNull();
    });

    it("returns null when decoded metadata misses required fields", () => {
        const res = new Response("{}", {
            status: 403,
            headers: {
                "rblx-challenge-id": "header-1",
                "rblx-challenge-metadata": btoa(
                    JSON.stringify({
                        challengeId: "meta-1",
                    }),
                ),
            },
        });
        expect(parseChallengeFromHeaders(res)).toBeNull();
    });

    it("parses valid challenge metadata", () => {
        const res = new Response("{}", {
            status: 403,
            headers: {
                "rblx-challenge-id": "header-1",
                "rblx-challenge-metadata": btoa(
                    JSON.stringify({
                        challengeId: "meta-1",
                        actionType: "ItemTrade",
                    }),
                ),
            },
        });

        expect(parseChallengeFromHeaders(res)).toEqual({
            headerChallengeId: "header-1",
            metadataChallengeId: "meta-1",
            actionType: "ItemTrade",
        });
    });
});
