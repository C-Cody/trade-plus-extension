import { afterEach, describe, expect, it, vi } from "vitest";
import { completeTradeTwoFactorChallenge, sendTrade } from "./tradeApi";
import { TradeChallengeRequiredError, TradeSendPayload } from "./types";

const PAYLOAD: TradeSendPayload = {
    senderOffer: {
        userId: 1,
        robux: 0,
        collectibleItemInstanceIds: ["a"],
    },
    recipientOffer: {
        userId: 2,
        robux: 0,
        collectibleItemInstanceIds: ["b"],
    },
};

function response(
    status: number,
    body: unknown,
    headers?: Record<string, string>,
): Response {
    return new Response(JSON.stringify(body), {
        status,
        headers,
    });
}

describe("sendTrade", () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it("uses /v2/trades/send for normal sends", async () => {
        const fetchMock = vi
            .spyOn(globalThis, "fetch")
            .mockResolvedValue(response(200, { tradeId: 123 }));

        const tradeId = await sendTrade(PAYLOAD);

        expect(tradeId).toBe(123);
        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(fetchMock.mock.calls[0]).toBeDefined();
        expect(fetchMock.mock.calls[0]![0]).toBe(
            "https://trades.roblox.com/v2/trades/send",
        );
    });

    it("uses /v2/trades/{id}/counter for counter sends", async () => {
        const fetchMock = vi
            .spyOn(globalThis, "fetch")
            .mockResolvedValue(response(200, {}));

        const tradeId = await sendTrade(PAYLOAD, {
            counterTradeId: "555",
        });

        expect(tradeId).toBeNull();
        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(fetchMock.mock.calls[0]).toBeDefined();
        expect(fetchMock.mock.calls[0]![0]).toBe(
            "https://trades.roblox.com/v2/trades/555/counter",
        );
    });

    it("retries once when first request returns csrf token", async () => {
        const fetchMock = vi.spyOn(globalThis, "fetch");
        fetchMock
            .mockResolvedValueOnce(
                response(403, [{ message: "Token Validation Failed" }], {
                    "x-csrf-token": "token-1",
                }),
            )
            .mockResolvedValueOnce(response(200, { tradeId: 777 }));

        const tradeId = await sendTrade(PAYLOAD);

        expect(tradeId).toBe(777);
        expect(fetchMock).toHaveBeenCalledTimes(2);

        expect(fetchMock.mock.calls[1]).toBeDefined();
        const secondCallOptions = fetchMock.mock.calls[1]![1] as RequestInit;
        const secondHeaders = secondCallOptions.headers as Record<string, string>;
        expect(secondHeaders["x-csrf-token"]).toBe("token-1");
    });

    it("recognizes a counter 2fa challenge with a generic error message", async () => {
        const metadata = btoa(
            JSON.stringify({
                challengeId: "metadata-challenge-1",
                actionType: "Generic",
            }),
        );
        const fetchMock = vi
            .spyOn(globalThis, "fetch")
            .mockResolvedValueOnce(
                response(
                    403,
                    {
                        errors: [{ code: 0, message: "XSRF token invalid" }],
                    },
                    {
                        "x-csrf-token": "refreshed-csrf-token",
                    },
                ),
            )
            .mockResolvedValueOnce(
                response(
                    403,
                    {
                        errors: [
                            { code: 0, message: "An unknown error occured." },
                        ],
                    },
                    {
                        "rblx-challenge-id": "header-challenge-1",
                        "rblx-challenge-type": "twostepverification",
                        "rblx-challenge-metadata": metadata,
                    },
                ),
            );

        await expect(
            sendTrade(PAYLOAD, { counterTradeId: "555" }),
        ).rejects.toMatchObject({
            name: "TradeChallengeRequiredError",
            challenge: {
                headerChallengeId: "header-challenge-1",
                metadataChallengeId: "metadata-challenge-1",
                actionType: "Generic",
            },
            csrfToken: "refreshed-csrf-token",
        });
        expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it("throws TradeChallengeRequiredError when challenge headers are present", async () => {
        const metadata = btoa(
            JSON.stringify({
                challengeId: "meta-1",
                actionType: "ItemTrade",
            }),
        );

        vi.spyOn(globalThis, "fetch").mockResolvedValue(
            response(
                403,
                [{ message: "Challenge is required to authorize the request" }],
                {
                    "rblx-challenge-id": "header-1",
                    "rblx-challenge-type": "twostepverification",
                    "rblx-challenge-metadata": metadata,
                    "x-csrf-token": "token-2",
                },
            ),
        );

        await expect(sendTrade(PAYLOAD)).rejects.toBeInstanceOf(
            TradeChallengeRequiredError,
        );
    });

    it("throws parsed API message on non-challenge failures", async () => {
        vi.spyOn(globalThis, "fetch").mockResolvedValue(
            response(400, { errors: [{ message: "Bad trade payload" }] }),
        );

        await expect(sendTrade(PAYLOAD)).rejects.toThrow("Bad trade payload");
    });

    it("does not treat incomplete challenge headers as 2fa", async () => {
        const metadata = btoa(
            JSON.stringify({
                challengeId: "meta-2",
                actionType: "ItemTrade",
            }),
        );

        vi.spyOn(globalThis, "fetch").mockResolvedValue(
            response(403, [{ message: "Token Validation Failed" }], {
                "rblx-challenge-id": "header-2",
                "rblx-challenge-metadata": metadata,
            }),
        );

        await expect(sendTrade(PAYLOAD)).rejects.toThrow(
            "Token Validation Failed",
        );
    });

    it("sends provided csrf token on first attempt", async () => {
        const fetchMock = vi
            .spyOn(globalThis, "fetch")
            .mockResolvedValue(response(200, { tradeId: 101 }));

        await sendTrade(PAYLOAD, { csrfToken: "provided-token" });

        expect(fetchMock.mock.calls[0]).toBeDefined();
        const init = fetchMock.mock.calls[0]![1] as RequestInit;
        const headers = init.headers as Record<string, string>;
        expect(headers["x-csrf-token"]).toBe("provided-token");
    });

    it("uses csrf token from error response in TradeChallengeRequiredError", async () => {
        const metadata = btoa(
            JSON.stringify({
                challengeId: "meta-3",
                actionType: "ItemTrade",
            }),
        );

        vi.spyOn(globalThis, "fetch").mockResolvedValue(
            response(
                403,
                [{ message: "Challenge is required to authorize the request" }],
                {
                    "rblx-challenge-id": "header-3",
                    "rblx-challenge-type": "twostepverification",
                    "rblx-challenge-metadata": metadata,
                    "x-csrf-token": "csrf-from-header",
                },
            ),
        );

        await expect(sendTrade(PAYLOAD)).rejects.toMatchObject({
            name: "TradeChallengeRequiredError",
            csrfToken: "csrf-from-header",
        });
    });
});

describe("completeTradeTwoFactorChallenge", () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it("returns challenge headers after verify + continue success", async () => {
        vi.spyOn(globalThis, "fetch")
            .mockResolvedValueOnce(
                response(200, {
                    verificationToken: "verify-token-1",
                }),
            )
            .mockResolvedValueOnce(response(200, {}));

        const result = await completeTradeTwoFactorChallenge(
            42,
            {
                headerChallengeId: "header-42",
                metadataChallengeId: "meta-42",
                actionType: "ItemTrade",
            },
            "123456",
        );

        expect(result.challengeHeaders["Rblx-Challenge-Id"]).toBe("header-42");
        expect(result.challengeHeaders["Rblx-Challenge-Type"]).toBe(
            "twostepverification",
        );
        expect(result.csrfToken).toBeNull();
    });

    it("throws parsed verify error message", async () => {
        vi.spyOn(globalThis, "fetch").mockResolvedValue(
            response(400, [{ message: "Invalid two-step code" }]),
        );

        await expect(
            completeTradeTwoFactorChallenge(
                42,
                {
                    headerChallengeId: "header-42",
                    metadataChallengeId: "meta-42",
                    actionType: "ItemTrade",
                },
                "000000",
            ),
        ).rejects.toThrow("Invalid two-step code");
    });

    it("throws when verify response has no verification token", async () => {
        vi.spyOn(globalThis, "fetch").mockResolvedValue(response(200, {}));

        await expect(
            completeTradeTwoFactorChallenge(
                42,
                {
                    headerChallengeId: "header-42",
                    metadataChallengeId: "meta-42",
                    actionType: "ItemTrade",
                },
                "123456",
            ),
        ).rejects.toThrow("2FA verification token was missing.");
    });

    it("throws parsed continue error message", async () => {
        vi.spyOn(globalThis, "fetch")
            .mockResolvedValueOnce(
                response(200, { verificationToken: "verify-token-2" }),
            )
            .mockResolvedValueOnce(
                response(403, { errors: [{ message: "Challenge continuation failed" }] }),
            );

        await expect(
            completeTradeTwoFactorChallenge(
                42,
                {
                    headerChallengeId: "header-42",
                    metadataChallengeId: "meta-42",
                    actionType: "ItemTrade",
                },
                "123456",
            ),
        ).rejects.toThrow("Challenge continuation failed");
    });

    it("propagates csrf token obtained during verify retry to continue", async () => {
        const fetchMock = vi.spyOn(globalThis, "fetch");
        fetchMock
            .mockResolvedValueOnce(
                response(403, [{ message: "Token Validation Failed" }], {
                    "x-csrf-token": "csrf-verify-1",
                }),
            )
            .mockResolvedValueOnce(
                response(200, { verificationToken: "verify-token-3" }),
            )
            .mockResolvedValueOnce(response(200, {}));

        const result = await completeTradeTwoFactorChallenge(
            42,
            {
                headerChallengeId: "header-42",
                metadataChallengeId: "meta-42",
                actionType: "ItemTrade",
            },
            "222222",
        );

        expect(result.csrfToken).toBe("csrf-verify-1");
        expect(fetchMock.mock.calls[2]).toBeDefined();
        const continueInit = fetchMock.mock.calls[2]![1] as RequestInit;
        const continueHeaders = continueInit.headers as Record<string, string>;
        expect(continueHeaders["x-csrf-token"]).toBe("csrf-verify-1");
    });
});
