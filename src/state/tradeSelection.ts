import {
    OFFER_LIMIT,
    parseRobuxInput,
    pruneOfferSelection,
    removeFromOfferSelection,
    toggleOfferSelection,
} from "../domain/trade";

export type TradeSelectionState = {
    myOfferIds: string[];
    theirOfferIds: string[];
    myRobux: string;
    theirRobux: string;
};

export type TradeSelectionAction =
    | { type: "reset" }
    | {
          type: "hydrate-from-trade";
          myOfferIds: string[];
          theirOfferIds: string[];
          myRobux: string;
          theirRobux: string;
          mineSelectableIds: Set<string>;
          theirsSelectableIds: Set<string>;
      }
    | { type: "sync-mine"; selectableIds: Set<string> }
    | { type: "sync-theirs"; selectableIds: Set<string> }
    | { type: "toggle-mine"; itemId: string; selectableIds: Set<string> }
    | { type: "toggle-theirs"; itemId: string; selectableIds: Set<string> }
    | { type: "remove-mine"; itemId: string }
    | { type: "remove-theirs"; itemId: string }
    | { type: "set-my-robux"; value: string }
    | { type: "set-their-robux"; value: string };

export const INITIAL_TRADE_SELECTION_STATE: TradeSelectionState = {
    myOfferIds: [],
    theirOfferIds: [],
    myRobux: "0",
    theirRobux: "0",
};

type OfferSide = "mine" | "theirs";

function offerIdsForSide(state: TradeSelectionState, side: OfferSide): string[] {
    return side === "mine" ? state.myOfferIds : state.theirOfferIds;
}

function withOfferIds(
    state: TradeSelectionState,
    side: OfferSide,
    nextIds: string[],
): TradeSelectionState {
    const currentIds = offerIdsForSide(state, side);
    if (nextIds === currentIds) {
        return state;
    }

    if (side === "mine") {
        return { ...state, myOfferIds: nextIds };
    }

    return { ...state, theirOfferIds: nextIds };
}

function withRobux(
    state: TradeSelectionState,
    side: OfferSide,
    value: string,
): TradeSelectionState {
    const parsed = String(parseRobuxInput(value));
    if (side === "mine") {
        return { ...state, myRobux: parsed };
    }

    return { ...state, theirRobux: parsed };
}

export function tradeSelectionReducer(
    state: TradeSelectionState,
    action: TradeSelectionAction,
): TradeSelectionState {
    if (action.type === "reset") {
        return INITIAL_TRADE_SELECTION_STATE;
    }

    if (action.type === "sync-mine") {
        return withOfferIds(
            state,
            "mine",
            pruneOfferSelection(offerIdsForSide(state, "mine"), action.selectableIds),
        );
    }

    if (action.type === "hydrate-from-trade") {
        return {
            myOfferIds: pruneOfferSelection(
                action.myOfferIds.slice(0, OFFER_LIMIT),
                action.mineSelectableIds,
            ),
            theirOfferIds: pruneOfferSelection(
                action.theirOfferIds.slice(0, OFFER_LIMIT),
                action.theirsSelectableIds,
            ),
            myRobux: String(parseRobuxInput(action.myRobux)),
            theirRobux: String(parseRobuxInput(action.theirRobux)),
        };
    }

    if (action.type === "sync-theirs") {
        return withOfferIds(
            state,
            "theirs",
            pruneOfferSelection(
                offerIdsForSide(state, "theirs"),
                action.selectableIds,
            ),
        );
    }

    if (action.type === "toggle-mine") {
        return withOfferIds(
            state,
            "mine",
            toggleOfferSelection(
                offerIdsForSide(state, "mine"),
                action.itemId,
                action.selectableIds,
                OFFER_LIMIT,
            ),
        );
    }

    if (action.type === "toggle-theirs") {
        return withOfferIds(
            state,
            "theirs",
            toggleOfferSelection(
                offerIdsForSide(state, "theirs"),
                action.itemId,
                action.selectableIds,
                OFFER_LIMIT,
            ),
        );
    }

    if (action.type === "remove-mine") {
        return withOfferIds(
            state,
            "mine",
            removeFromOfferSelection(offerIdsForSide(state, "mine"), action.itemId),
        );
    }

    if (action.type === "remove-theirs") {
        return withOfferIds(
            state,
            "theirs",
            removeFromOfferSelection(
                offerIdsForSide(state, "theirs"),
                action.itemId,
            ),
        );
    }

    if (action.type === "set-my-robux") {
        return withRobux(state, "mine", action.value);
    }

    return withRobux(state, "theirs", action.value);
}
