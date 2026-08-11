import { TradeChallenge } from "./types";

type RobloxApiError = {
    code?: number;
    message?: string;
};

type RobloxApiErrorEnvelope = {
    errors?: RobloxApiError[];
    message?: string;
};

type ChallengeMetadataPayload = {
    challengeId?: string;
    actionType?: string;
    verificationToken?: string;
    rememberDevice?: boolean;
};

export function parseRobloxErrorMessage(data: unknown): string | null {
    if (Array.isArray(data)) {
        const first = data[0];
        if (first && typeof first === "object") {
            const message = (first as RobloxApiError).message;
            if (typeof message === "string" && message.length > 0) {
                return message;
            }
        }
    }

    if (data && typeof data === "object") {
        const envelope = data as RobloxApiErrorEnvelope;

        if (
            typeof envelope.message === "string" &&
            envelope.message.length > 0
        ) {
            return envelope.message;
        }

        const nestedMessage = envelope.errors?.[0]?.message;
        if (typeof nestedMessage === "string" && nestedMessage.length > 0) {
            return nestedMessage;
        }
    }

    return null;
}

export function parseChallengeFromHeaders(res: Response): TradeChallenge | null {
    const headerChallengeId = res.headers.get("rblx-challenge-id");
    const challengeType = res.headers.get("rblx-challenge-type");
    const metadataBase64 = res.headers.get("rblx-challenge-metadata");

    if (
        !headerChallengeId ||
        challengeType?.toLowerCase() !== "twostepverification" ||
        !metadataBase64
    ) {
        return null;
    }

    try {
        const decoded = atob(metadataBase64);
        const metadata = JSON.parse(decoded) as ChallengeMetadataPayload;

        if (
            typeof metadata.challengeId !== "string" ||
            typeof metadata.actionType !== "string"
        ) {
            return null;
        }

        return {
            headerChallengeId,
            metadataChallengeId: metadata.challengeId,
            actionType: metadata.actionType,
        };
    } catch {
        return null;
    }
}
