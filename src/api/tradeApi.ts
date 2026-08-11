import {
    parseChallengeFromHeaders,
    parseRobloxErrorMessage,
} from "./http";
import {
    RequestOptions,
    TradeChallenge,
    TradeChallengeHeaders,
    TradeChallengeRequiredError,
    TradeSendPayload,
} from "./types";

type PageFetchRequest = {
    type: "trade-plus:page-fetch-request";
    requestId: string;
    url: string;
    init: {
        method?: string;
        headers?: HeadersInit;
        body?: BodyInit | null;
        credentials?: RequestCredentials;
    };
};

type PageFetchResponse =
    | {
          type: "trade-plus:page-fetch-response";
          requestId: string;
          ok: true;
          status: number;
          statusText: string;
          headers: Array<[string, string]>;
          body: string;
      }
    | {
          type: "trade-plus:page-fetch-response";
          requestId: string;
          ok: false;
          error: string;
      };

type VerifyChallengeResponse = {
    verificationToken?: string;
};

type RobloxApiErrorItem = {
    code?: number;
    message?: string;
};

type RobloxApiErrorEnvelope = {
    errors?: RobloxApiErrorItem[];
    message?: string;
};

function isFirefox(): boolean {
    return (
        typeof navigator !== "undefined" &&
        /firefox/i.test(navigator.userAgent)
    );
}

function nextRequestId(): string {
    if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
        return crypto.randomUUID();
    }

    return `${Date.now()}-${Math.random()}`;
}

async function fetchFromPageBridge(
    url: string,
    init: RequestInit,
): Promise<Response> {
    return new Promise<Response>((resolve, reject) => {
        const requestId = nextRequestId();
        const timeout = window.setTimeout(() => {
            window.removeEventListener("message", onMessage);
            reject(new Error("Page fetch bridge timed out."));
        }, 20_000);

        const onMessage = (event: MessageEvent<unknown>) => {
            if (event.source !== window) {
                return;
            }

            const payload = event.data as PageFetchResponse | undefined;
            if (
                !payload ||
                payload.type !== "trade-plus:page-fetch-response" ||
                payload.requestId !== requestId
            ) {
                return;
            }

            window.clearTimeout(timeout);
            window.removeEventListener("message", onMessage);

            if (!payload.ok) {
                reject(new Error(payload.error || "Page fetch failed."));
                return;
            }

            resolve(
                new Response(payload.body, {
                    status: payload.status,
                    statusText: payload.statusText,
                    headers: new Headers(payload.headers),
                }),
            );
        };

        window.addEventListener("message", onMessage);

        const request: PageFetchRequest = {
            type: "trade-plus:page-fetch-request",
            requestId,
            url,
            init: {
                method: init.method,
                headers: init.headers,
                body: init.body ?? null,
                credentials: init.credentials,
            },
        };

        window.postMessage(request, "*");
    });
}

function fetchWithPageContext(url: string, init: RequestInit): Promise<Response> {
    if (!isFirefox()) {
        return fetch(url, init);
    }

    return fetchFromPageBridge(url, init).catch(() => fetch(url, init));
}

async function postJsonWithCsrfRetry(
    url: string,
    body: unknown,
    options: {
        signal?: AbortSignal;
        csrfToken?: string | null;
        extraHeaders?: Record<string, string>;
    } = {},
): Promise<{ response: Response; csrfToken: string | null }> {
    let csrfToken = options.csrfToken ?? null;

    for (let attempt = 0; attempt < 2; attempt += 1) {
        const headers: Record<string, string> = {
            "content-type": "application/json",
            ...(options.extraHeaders ?? {}),
        };

        if (csrfToken) {
            headers["x-csrf-token"] = csrfToken;
        }

        const response = await fetchWithPageContext(url, {
            method: "POST",
            credentials: "include",
            headers,
            body: JSON.stringify(body),
            signal: options.signal,
        });

        if (response.ok) {
            return { response, csrfToken };
        }

        if (response.status === 403) {
            const nextToken = response.headers.get("x-csrf-token");
            if (nextToken && nextToken !== csrfToken) {
                csrfToken = nextToken;
                continue;
            }
        }

        return { response, csrfToken };
    }

    throw new Error("Unexpected CSRF retry flow.");
}

export async function sendTrade(
    payload: TradeSendPayload,
    options: RequestOptions & {
        challengeHeaders?: TradeChallengeHeaders;
        csrfToken?: string | null;
        counterTradeId?: string;
    } = {},
): Promise<number | null> {
    const url = options.counterTradeId
        ? `https://trades.roblox.com/v2/trades/${options.counterTradeId}/counter`
        : "https://trades.roblox.com/v2/trades/send";
    const { response: res, csrfToken } = await postJsonWithCsrfRetry(
        url,
        payload,
        {
            signal: options.signal,
            csrfToken: options.csrfToken ?? null,
            extraHeaders: options.challengeHeaders,
        },
    );

    if (res.ok) {
        const data = (await res.json().catch(() => null)) as
            | { tradeId?: number }
            | null;
        if (typeof data?.tradeId === "number") {
            return data.tradeId;
        }

        return null;
    }

    let message = `Trade send failed with status ${res.status}.`;
    const maybeJson = (await res.json().catch(() => null)) as
        | RobloxApiErrorItem[]
        | RobloxApiErrorEnvelope
        | null;
    const parsedMessage = parseRobloxErrorMessage(maybeJson);
    if (parsedMessage) {
        message = parsedMessage;
    }

    const parsedChallenge = parseChallengeFromHeaders(res);
    const headerCsrfToken = res.headers.get("x-csrf-token");
    if (parsedChallenge) {
        throw new TradeChallengeRequiredError(
            parsedChallenge,
            message,
            csrfToken ?? headerCsrfToken,
        );
    }

    throw new Error(message);
}

export async function completeTradeTwoFactorChallenge(
    userId: number,
    challenge: TradeChallenge,
    code: string,
    options: RequestOptions & {
        csrfToken?: string | null;
    } = {},
): Promise<{
    challengeHeaders: TradeChallengeHeaders;
    csrfToken: string | null;
}> {
    const verifyResult = await postJsonWithCsrfRetry(
        `https://twostepverification.roblox.com/v1/users/${userId}/challenges/authenticator/verify`,
        {
            actionType: challenge.actionType,
            challengeId: challenge.metadataChallengeId,
            code,
        },
        options,
    );
    const verifyRes = verifyResult.response;
    let csrfToken = verifyResult.csrfToken;

    const verifyJson = (await verifyRes.json().catch(() => null)) as
        | VerifyChallengeResponse
        | RobloxApiErrorEnvelope
        | RobloxApiErrorItem[]
        | null;

    if (!verifyRes.ok) {
        const message =
            parseRobloxErrorMessage(verifyJson) ??
            `2FA verify failed with status ${verifyRes.status}.`;
        throw new Error(message);
    }

    const verificationToken =
        verifyJson && typeof verifyJson === "object"
            ? (verifyJson as VerifyChallengeResponse).verificationToken
            : undefined;

    if (
        typeof verificationToken !== "string" ||
        verificationToken.length === 0
    ) {
        throw new Error("2FA verification token was missing.");
    }

    const challengeMetadata = {
        verificationToken,
        rememberDevice: false,
        challengeId: challenge.metadataChallengeId,
        actionType: challenge.actionType,
    };

    const continueResult = await postJsonWithCsrfRetry(
        "https://apis.roblox.com/challenge/v1/continue",
        {
            challengeId: challenge.headerChallengeId,
            challengeType: "twostepverification",
            challengeMetadata: JSON.stringify(challengeMetadata),
        },
        { ...options, csrfToken },
    );
    const continueRes = continueResult.response;
    csrfToken = continueResult.csrfToken;

    if (!continueRes.ok) {
        const continueJson = (await continueRes.json().catch(() => null)) as
            | RobloxApiErrorEnvelope
            | RobloxApiErrorItem[]
            | null;
        const message =
            parseRobloxErrorMessage(continueJson) ??
            `2FA challenge continuation failed with status ${continueRes.status}.`;
        throw new Error(message);
    }

    return {
        challengeHeaders: {
            "Rblx-Challenge-Id": challenge.headerChallengeId,
            "Rblx-Challenge-Type": "twostepverification",
            "Rblx-Challenge-Metadata": btoa(JSON.stringify(challengeMetadata)),
        },
        csrfToken,
    };
}
