import { useEffect, useMemo, useState } from "react";
import {
    getAuthenticatedUserId,
    getTradeDetails,
    getUserNameById,
} from "../api";
import type { TradePlusTarget } from "../routes";
import { loadUserCollectibles } from "../api";
import type { TradeItem } from "../components/ItemCard";
import { sumRap, sumValue } from "../domain/trade";

type TradeIdentityState = {
    currentUserId: number | null;
    otherUserId: number | null;
    otherUserName: string | null;
    initialMyOfferIds: string[];
    initialTheirOfferIds: string[];
    initialMyRobux: string;
    initialTheirRobux: string;
    identityLoading: boolean;
};

const INITIAL_IDENTITY_STATE: TradeIdentityState = {
    currentUserId: null,
    otherUserId: null,
    otherUserName: null,
    initialMyOfferIds: [],
    initialTheirOfferIds: [],
    initialMyRobux: "0",
    initialTheirRobux: "0",
    identityLoading: true,
};

type TradeSeed = {
    fallbackCounterpartyId: number | null;
    fallbackCounterpartyName: string | null;
    initialMyOfferIds: string[];
    initialTheirOfferIds: string[];
    initialMyRobux: string;
    initialTheirRobux: string;
};

const EMPTY_TRADE_SEED: TradeSeed = {
    fallbackCounterpartyId: null,
    fallbackCounterpartyName: null,
    initialMyOfferIds: [],
    initialTheirOfferIds: [],
    initialMyRobux: "0",
    initialTheirRobux: "0",
};

type CollectiblesLoadState = {
    items: TradeItem[];
    loading: boolean;
    error: string | null;
};

const INITIAL_COLLECTIBLES_STATE: CollectiblesLoadState = {
    items: [],
    loading: true,
    error: null,
};

function useCollectiblesState(params: {
    userId: number | null;
    pendingIdentity: boolean;
    missingUserError: string;
    loadError: string;
}) {
    const [state, setState] = useState<CollectiblesLoadState>(
        INITIAL_COLLECTIBLES_STATE,
    );
    const [reloadTick, setReloadTick] = useState(0);

    useEffect(() => {
        const controller = new AbortController();

        if (params.pendingIdentity) {
            setState(INITIAL_COLLECTIBLES_STATE);
            return () => {
                controller.abort();
            };
        }

        if (typeof params.userId !== "number") {
            setState({
                items: [],
                loading: false,
                error: params.missingUserError,
            });
            return () => {
                controller.abort();
            };
        }

        setState((prev) => ({ ...prev, loading: true, error: null }));

        void loadUserCollectibles(params.userId, { signal: controller.signal })
            .then((items) => {
                if (controller.signal.aborted) {
                    return;
                }

                setState({
                    items,
                    loading: false,
                    error: null,
                });
            })
            .catch(() => {
                if (controller.signal.aborted) {
                    return;
                }

                setState({
                    items: [],
                    loading: false,
                    error: params.loadError,
                });
            });

        return () => {
            controller.abort();
        };
    }, [
        params.userId,
        params.pendingIdentity,
        params.missingUserError,
        params.loadError,
        reloadTick,
    ]);

    const totalRap = useMemo(() => sumRap(state.items), [state.items]);
    const totalValue = useMemo(() => sumValue(state.items), [state.items]);

    return {
        ...state,
        totalRap,
        totalValue,
        reload: () => setReloadTick((prev) => prev + 1),
    };
}

function toOtherUserId(
    target: TradePlusTarget,
    fallback: number | null,
): number | null {
    if (target.kind === "user-trade") {
        return Number(target.userId);
    }

    return fallback;
}

function resolveTradeCounterSeed(
    target: TradePlusTarget,
    currentUserId: number | null,
    tradeDetails: Awaited<ReturnType<typeof getTradeDetails>>,
): TradeSeed {
    if (
        target.kind !== "trade-counter" ||
        !tradeDetails ||
        typeof currentUserId !== "number"
    ) {
        return EMPTY_TRADE_SEED;
    }

    const meIsParticipantA = tradeDetails.participantA.userId === currentUserId;
    const meIsParticipantB = tradeDetails.participantB.userId === currentUserId;
    if (!meIsParticipantA && !meIsParticipantB) {
        return EMPTY_TRADE_SEED;
    }

    const mine = meIsParticipantA
        ? tradeDetails.participantA
        : tradeDetails.participantB;
    const theirs = meIsParticipantA
        ? tradeDetails.participantB
        : tradeDetails.participantA;

    return {
        fallbackCounterpartyId: theirs.userId,
        fallbackCounterpartyName: theirs.userName,
        initialMyOfferIds: [...mine.collectibleItemInstanceIds],
        initialTheirOfferIds: [...theirs.collectibleItemInstanceIds],
        initialMyRobux: String(mine.robux),
        initialTheirRobux: String(theirs.robux),
    };
}

export function useTradeCollectibles(target: TradePlusTarget) {
    const [identity, setIdentity] = useState<TradeIdentityState>(
        INITIAL_IDENTITY_STATE,
    );

    useEffect(() => {
        const controller = new AbortController();

        setIdentity(INITIAL_IDENTITY_STATE);

        async function runIdentityLoad() {
            const [currentUserId, tradeDetails] = await Promise.all([
                getAuthenticatedUserId({
                    signal: controller.signal,
                }),
                target.kind === "trade-counter"
                    ? getTradeDetails(target.tradeId, {
                          signal: controller.signal,
                      })
                    : Promise.resolve(null),
            ]);

            if (controller.signal.aborted) {
                return;
            }

            const tradeSeed = resolveTradeCounterSeed(
                target,
                currentUserId,
                tradeDetails,
            );
            const otherUserId = toOtherUserId(
                target,
                tradeSeed.fallbackCounterpartyId,
            );
            const otherUserName = tradeSeed.fallbackCounterpartyName
                ? tradeSeed.fallbackCounterpartyName
                : typeof otherUserId === "number"
                  ? await getUserNameById(otherUserId, {
                        signal: controller.signal,
                    })
                  : null;

            if (controller.signal.aborted) {
                return;
            }

            setIdentity({
                currentUserId,
                otherUserId,
                otherUserName,
                initialMyOfferIds: tradeSeed.initialMyOfferIds,
                initialTheirOfferIds: tradeSeed.initialTheirOfferIds,
                initialMyRobux: tradeSeed.initialMyRobux,
                initialTheirRobux: tradeSeed.initialTheirRobux,
                identityLoading: false,
            });
        }

        void runIdentityLoad();

        return () => {
            controller.abort();
        };
    }, [target]);

    const mineState = useCollectiblesState({
        userId: identity.currentUserId,
        pendingIdentity: identity.identityLoading,
        missingUserError: "Not authenticated on Roblox.",
        loadError: "Could not load your collectibles.",
    });

    const theirsState = useCollectiblesState({
        userId: identity.otherUserId,
        pendingIdentity: identity.identityLoading,
        missingUserError: "Could not resolve the counterparty user.",
        loadError: "Could not load their collectibles.",
    });

    return {
        currentUserId: identity.currentUserId,
        mine: mineState.items,
        theirs: theirsState.items,
        mineLoading: mineState.loading,
        theirsLoading: theirsState.loading,
        mineError: mineState.error,
        theirsError: theirsState.error,
        otherUserId: identity.otherUserId,
        otherUserName: identity.otherUserName,
        mineRap: mineState.totalRap,
        theirsRap: theirsState.totalRap,
        mineValue: mineState.totalValue,
        theirsValue: theirsState.totalValue,
        initialMyOfferIds: identity.initialMyOfferIds,
        initialTheirOfferIds: identity.initialTheirOfferIds,
        initialMyRobux: identity.initialMyRobux,
        initialTheirRobux: identity.initialTheirRobux,
        reloadMine: mineState.reload,
        reloadTheirs: theirsState.reload,
    };
}
