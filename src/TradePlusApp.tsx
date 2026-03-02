import { useEffect, useMemo, useReducer, useRef } from "react";
import { InventoryPanel } from "./components/InventoryPanel";
import { TradeStage } from "./components/TradeStage";
import {
    buildTradeItemMap,
    parseRobuxInput,
    sumRap,
    toOfferItems,
    toSelectableIdSet,
} from "./domain/trade";
import { useTradeCollectibles } from "./hooks/useTradeCollectibles";
import type { TradePlusTarget } from "./routes";
import {
    INITIAL_TRADE_SELECTION_STATE,
    tradeSelectionReducer,
} from "./state/tradeSelection";

type Props = {
    target: TradePlusTarget;
};

function otherPartyLabel(
    target: TradePlusTarget,
    otherUserId: number | null,
    otherUserName: string | null,
): string {
    if (otherUserName) {
        return `${otherUserName}'s inventory`;
    }

    if (target.kind === "user-trade") {
        return `user ${target.userId}'s inventory`;
    }

    if (otherUserId) {
        return `user ${otherUserId}'s inventory`;
    }

    return "counterparty inventory";
}

export function TradePlusApp({ target }: Props) {
    const {
        currentUserId,
        mine: myItems,
        theirs: theirItems,
        mineLoading: myItemsLoading,
        theirsLoading: theirItemsLoading,
        mineError: myItemsError,
        theirsError: theirItemsError,
        otherUserId,
        otherUserName,
        mineValue: myInventoryValue,
        theirsValue: theirInventoryValue,
        initialMyOfferIds,
        initialTheirOfferIds,
        initialMyRobux,
        initialTheirRobux,
    } = useTradeCollectibles(target);

    const [selectionState, dispatch] = useReducer(
        tradeSelectionReducer,
        INITIAL_TRADE_SELECTION_STATE,
    );

    const myItemMap = useMemo(() => buildTradeItemMap(myItems), [myItems]);
    const theirItemMap = useMemo(() => buildTradeItemMap(theirItems), [theirItems]);

    const mySelectableIds = useMemo(
        () => toSelectableIdSet(myItemMap),
        [myItemMap],
    );
    const theirSelectableIds = useMemo(
        () => toSelectableIdSet(theirItemMap),
        [theirItemMap],
    );

    const hydratedTradeIdRef = useRef<string | null>(null);

    useEffect(() => {
        dispatch({ type: "reset" });
        hydratedTradeIdRef.current = null;
    }, [target]);

    useEffect(() => {
        dispatch({ type: "sync-mine", selectableIds: mySelectableIds });
    }, [mySelectableIds]);

    useEffect(() => {
        dispatch({ type: "sync-theirs", selectableIds: theirSelectableIds });
    }, [theirSelectableIds]);

    useEffect(() => {
        if (target.kind !== "trade-counter") {
            return;
        }

        if (myItemsLoading || theirItemsLoading) {
            return;
        }

        if (hydratedTradeIdRef.current === target.tradeId) {
            return;
        }

        dispatch({
            type: "hydrate-from-trade",
            myOfferIds: initialMyOfferIds,
            theirOfferIds: initialTheirOfferIds,
            myRobux: initialMyRobux,
            theirRobux: initialTheirRobux,
            mineSelectableIds: mySelectableIds,
            theirsSelectableIds: theirSelectableIds,
        });

        hydratedTradeIdRef.current = target.tradeId;
    }, [
        target,
        myItemsLoading,
        theirItemsLoading,
        initialMyOfferIds,
        initialTheirOfferIds,
        initialMyRobux,
        initialTheirRobux,
        mySelectableIds,
        theirSelectableIds,
    ]);

    const myOffer = useMemo(
        () => toOfferItems(selectionState.myOfferIds, myItemMap),
        [selectionState.myOfferIds, myItemMap],
    );
    const theirOffer = useMemo(
        () => toOfferItems(selectionState.theirOfferIds, theirItemMap),
        [selectionState.theirOfferIds, theirItemMap],
    );

    const mySelectedSet = useMemo(
        () => new Set(selectionState.myOfferIds),
        [selectionState.myOfferIds],
    );
    const theirSelectedSet = useMemo(
        () => new Set(selectionState.theirOfferIds),
        [selectionState.theirOfferIds],
    );

    const myOfferRap = useMemo(() => sumRap(myOffer), [myOffer]);
    const theirOfferRap = useMemo(() => sumRap(theirOffer), [theirOffer]);

    const myTotalRap = myOfferRap + parseRobuxInput(selectionState.myRobux);
    const theirTotalRap =
        theirOfferRap + parseRobuxInput(selectionState.theirRobux);

    return (
        <div className="tp-shell">
            <main className="tp-layout">
                <InventoryPanel
                    panelKey="my"
                    title="Your inventory"
                    items={myItems}
                    totalValue={myInventoryValue}
                    selectedIds={mySelectedSet}
                    canSelectMore={selectionState.myOfferIds.length < 4}
                    onToggleItem={(itemId) =>
                        dispatch({
                            type: "toggle-mine",
                            itemId,
                            selectableIds: mySelectableIds,
                        })
                    }
                    loading={myItemsLoading}
                    error={myItemsError}
                />
                <TradeStage
                    counterTradeId={
                        target.kind === "trade-counter" ? target.tradeId : undefined
                    }
                    currentUserId={currentUserId}
                    recipientUserId={otherUserId}
                    yourRap={myTotalRap}
                    theirRap={theirTotalRap}
                    yourOffer={myOffer}
                    theirOffer={theirOffer}
                    myRobux={selectionState.myRobux}
                    theirRobux={selectionState.theirRobux}
                    onMyRobuxChange={(value) =>
                        dispatch({ type: "set-my-robux", value })
                    }
                    onTheirRobuxChange={(value) =>
                        dispatch({ type: "set-their-robux", value })
                    }
                    onRemoveYourItem={(itemId) =>
                        dispatch({ type: "remove-mine", itemId })
                    }
                    onRemoveTheirItem={(itemId) =>
                        dispatch({ type: "remove-theirs", itemId })
                    }
                />
                <InventoryPanel
                    panelKey="their"
                    title={otherPartyLabel(target, otherUserId, otherUserName)}
                    items={theirItems}
                    totalValue={theirInventoryValue}
                    selectedIds={theirSelectedSet}
                    canSelectMore={selectionState.theirOfferIds.length < 4}
                    onToggleItem={(itemId) =>
                        dispatch({
                            type: "toggle-theirs",
                            itemId,
                            selectableIds: theirSelectableIds,
                        })
                    }
                    loading={theirItemsLoading}
                    error={theirItemsError}
                    emptyText="This user has no collectible items available."
                />
            </main>
        </div>
    );
}
