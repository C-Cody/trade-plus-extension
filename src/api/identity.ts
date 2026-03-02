import { RequestOptions, TradeDetailsParticipant, TradeDetailsSummary } from "./types";

type AuthUserResponse = {
    id: number;
    name: string;
};

type TradeOffer = {
    user?: {
        id?: number;
    };
};

type TradeResponse = {
    offers?: TradeOffer[];
};

type TradeDetailsUser = {
    id?: number;
    name?: string;
    displayName?: string;
};

type TradeDetailsItem = {
    collectibleItemInstanceId?: string;
};

type TradeDetailsOffer = {
    user?: TradeDetailsUser;
    robux?: number;
    items?: TradeDetailsItem[];
};

type TradeDetailsResponse = {
    participantAOffer?: TradeDetailsOffer;
    participantBOffer?: TradeDetailsOffer;
    offers?: TradeDetailsOffer[];
};

function asRecord(value: unknown): Record<string, unknown> | null {
    return value && typeof value === "object"
        ? (value as Record<string, unknown>)
        : null;
}

function asTradeDetailsOfferArray(value: unknown): TradeDetailsOffer[] {
    return Array.isArray(value) ? (value as TradeDetailsOffer[]) : [];
}

async function getJson<T>(
    url: string,
    options: RequestOptions = {},
): Promise<T | null> {
    const response = await fetch(url, {
        credentials: "include",
        signal: options.signal,
    });

    if (!response.ok) {
        return null;
    }

    return (await response.json()) as T;
}

export async function getAuthenticatedUserId(
    options: RequestOptions = {},
): Promise<number | null> {
    const data = await getJson<AuthUserResponse>(
        "https://users.roblox.com/v1/users/authenticated",
        options,
    );
    return typeof data?.id === "number" ? data.id : null;
}

export async function getUserNameById(
    userId: number,
    options: RequestOptions = {},
): Promise<string | null> {
    const data = await getJson<AuthUserResponse>(
        `https://users.roblox.com/v1/users/${userId}`,
        options,
    );
    return typeof data?.name === "string" && data.name.length > 0
        ? data.name
        : null;
}

export async function getTradeCounterpartyId(
    tradeId: string,
    currentUserId: number | null,
    options: RequestOptions = {},
): Promise<number | null> {
    const data = await getJson<TradeResponse>(
        `https://trades.roblox.com/v1/trades/${tradeId}`,
        options,
    );
    const offers = data?.offers ?? [];

    if (!offers.length) {
        return null;
    }

    if (typeof currentUserId === "number") {
        const counterpart = offers.find(
            (offer) => offer.user?.id && offer.user.id !== currentUserId,
        );
        if (counterpart?.user?.id) {
            return counterpart.user.id;
        }
    }

    return offers[0]?.user?.id ?? null;
}

function toTradeDetailsParticipant(
    offer: TradeDetailsOffer | undefined,
): TradeDetailsParticipant | null {
    const userId = offer?.user?.id;
    if (typeof userId !== "number") {
        return null;
    }

    const itemIds = (offer?.items ?? [])
        .map((item) => item.collectibleItemInstanceId)
        .filter((itemId): itemId is string => typeof itemId === "string");

    return {
        userId,
        userName:
            typeof offer?.user?.name === "string" && offer.user.name.length > 0
                ? offer.user.name
                : null,
        robux: typeof offer?.robux === "number" ? offer.robux : 0,
        collectibleItemInstanceIds: itemIds,
    };
}

export async function getTradeDetails(
    tradeId: string,
    options: RequestOptions = {},
): Promise<TradeDetailsSummary | null> {
    const raw = await getJson<unknown>(
        `https://trades.roblox.com/v2/trades/${tradeId}`,
        options,
    );

    const root = asRecord(raw);
    if (!root) {
        return null;
    }

    const data: TradeDetailsResponse = {
        participantAOffer: asRecord(root.participantAOffer) as
            | TradeDetailsOffer
            | undefined,
        participantBOffer: asRecord(root.participantBOffer) as
            | TradeDetailsOffer
            | undefined,
        offers: asTradeDetailsOfferArray(root.offers),
    };

    const participantA =
        toTradeDetailsParticipant(data.participantAOffer) ??
        toTradeDetailsParticipant(data.offers?.[0]);
    const participantB =
        toTradeDetailsParticipant(data.participantBOffer) ??
        toTradeDetailsParticipant(data.offers?.[1]);

    if (!participantA || !participantB) {
        return null;
    }

    return {
        tradeId,
        participantA,
        participantB,
    };
}
