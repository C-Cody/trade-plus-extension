export type RequestOptions = {
    signal?: AbortSignal;
};

export type TradeSendPayload = {
    senderOffer: {
        userId: number;
        robux: number;
        collectibleItemInstanceIds: string[];
    };
    recipientOffer: {
        userId: number;
        robux: number;
        collectibleItemInstanceIds: string[];
    };
};

export type TradeChallenge = {
    headerChallengeId: string;
    metadataChallengeId: string;
    actionType: string;
};

export type TradeChallengeHeaders = {
    "Rblx-Challenge-Id": string;
    "Rblx-Challenge-Type": "twostepverification";
    "Rblx-Challenge-Metadata": string;
};

export type TradeDetailsParticipant = {
    userId: number;
    userName: string | null;
    robux: number;
    collectibleItemInstanceIds: string[];
};

export type TradeDetailsSummary = {
    tradeId: string;
    participantA: TradeDetailsParticipant;
    participantB: TradeDetailsParticipant;
};

export class TradeChallengeRequiredError extends Error {
    challenge: TradeChallenge;
    csrfToken: string | null;

    constructor(
        challenge: TradeChallenge,
        message: string,
        csrfToken: string | null = null,
    ) {
        super(message);
        this.name = "TradeChallengeRequiredError";
        this.challenge = challenge;
        this.csrfToken = csrfToken;
    }
}
