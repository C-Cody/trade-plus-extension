import { useEffect, useRef, useState } from "react";
import { parseRobuxInput, sumValue } from "../domain/trade";
import { useTradeSendFlow } from "../hooks/useTradeSendFlow";
import type { TradeItem } from "./ItemCard";
import { OfferSide } from "./OfferSide";
import { ConfirmSendModal } from "./trade-stage/ConfirmSendModal";
import { DifferenceRow } from "./trade-stage/DifferenceRow";
import { StageActions } from "./trade-stage/StageActions";
import { TwoFactorModal } from "./trade-stage/TwoFactorModal";
type Props = {
    counterTradeId?: string;
    currentUserId: number | null;
    recipientUserId: number | null;
    yourRap: number;
    theirRap: number;
    yourOffer: TradeItem[];
    theirOffer: TradeItem[];
    myRobux: string;
    theirRobux: string;
    onMyRobuxChange: (value: string) => void;
    onTheirRobuxChange: (value: string) => void;
    onRemoveYourItem: (itemId: string) => void;
    onRemoveTheirItem: (itemId: string) => void;
};

export function TradeStage({
    counterTradeId,
    currentUserId,
    recipientUserId,
    yourRap,
    theirRap,
    yourOffer,
    theirOffer,
    myRobux,
    theirRobux,
    onMyRobuxChange,
    onTheirRobuxChange,
    onRemoveYourItem,
    onRemoveTheirItem,
}: Props) {
    const [stayOnPageAfterSend, setStayOnPageAfterSend] = useState(false);
    const confirmModalRef = useRef<HTMLDivElement | null>(null);
    const twoFactorModalRef = useRef<HTMLDivElement | null>(null);
    const restoreFocusRef = useRef<HTMLElement | null>(null);

    const yourTotalValue = sumValue(yourOffer) + parseRobuxInput(myRobux);
    const theirTotalValue = sumValue(theirOffer) + parseRobuxInput(theirRobux);
    const differenceRap = theirRap - yourRap;
    const differenceValue = theirTotalValue - yourTotalValue;
    const myRobuxNumber = parseRobuxInput(myRobux);
    const theirRobuxNumber = parseRobuxInput(theirRobux);

    const canAttemptSend =
        typeof currentUserId === "number" &&
        typeof recipientUserId === "number";

    const tradePayload =
        typeof currentUserId === "number" && typeof recipientUserId === "number"
            ? {
                  senderOffer: {
                      userId: currentUserId,
                      robux: myRobuxNumber,
                      collectibleItemInstanceIds: yourOffer.map((item) =>
                          String(item.id),
                      ),
                  },
                  recipientOffer: {
                      userId: recipientUserId,
                      robux: theirRobuxNumber,
                      collectibleItemInstanceIds: theirOffer.map((item) =>
                          String(item.id),
                      ),
                  },
              }
            : null;
    const {
        confirmOpen,
        twoFactorOpen,
        twoFactorCode,
        sending,
        sendError,
        sendSuccess,
        setTwoFactorCode,
        openConfirm,
        closeConfirm,
        cancelTwoFactor,
        onConfirmSend,
        onSubmitTwoFactor,
    } = useTradeSendFlow({
        tradePayload,
        currentUserId,
        counterTradeId,
        stayOnPageAfterSend,
    });

    useEffect(() => {
        const activeModal = confirmOpen
            ? confirmModalRef.current
            : twoFactorOpen
              ? twoFactorModalRef.current
              : null;

        if (!activeModal) {
            if (restoreFocusRef.current) {
                restoreFocusRef.current.focus();
                restoreFocusRef.current = null;
            }
            return;
        }

        if (!restoreFocusRef.current) {
            const active = document.activeElement;
            if (active instanceof HTMLElement) {
                restoreFocusRef.current = active;
            }
        }

        const selectors =
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
        const focusable = Array.from(
            activeModal.querySelectorAll<HTMLElement>(selectors),
        ).filter((el) => !el.hasAttribute("disabled"));
        focusable[0]?.focus();

        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                event.preventDefault();
                if (confirmOpen) {
                    closeConfirm();
                } else if (twoFactorOpen) {
                    cancelTwoFactor();
                }
                return;
            }

            if (event.key !== "Tab" || focusable.length === 0) {
                return;
            }

            const first = focusable.at(0);
            const last = focusable.at(-1);
            if (!first || !last) {
                return;
            }
            const current = document.activeElement as HTMLElement | null;

            if (event.shiftKey && current === first) {
                event.preventDefault();
                last.focus();
                return;
            }

            if (!event.shiftKey && current === last) {
                event.preventDefault();
                first.focus();
            }
        };

        document.addEventListener("keydown", onKeyDown);
        return () => {
            document.removeEventListener("keydown", onKeyDown);
        };
    }, [cancelTwoFactor, closeConfirm, confirmOpen, twoFactorOpen]);

    function onBackToPreviousPage() {
        if (window.history.length > 1) {
            window.history.back();
            return;
        }

        window.location.assign("https://www.roblox.com/trades");
    }

    return (
        <section className="tp-stage">
            <div className="tp-offer-board">
                <OfferSide
                    title="Your Offer"
                    items={yourOffer}
                    totalRap={yourRap}
                    totalValue={yourTotalValue}
                    robux={myRobux}
                    receiveLabel="They'll receive"
                    onRobuxChange={onMyRobuxChange}
                    onRemoveItem={onRemoveYourItem}
                />

                <div className="tp-offer-divider" aria-hidden="true" />

                <OfferSide
                    title="Your request"
                    items={theirOffer}
                    totalRap={theirRap}
                    totalValue={theirTotalValue}
                    robux={theirRobux}
                    receiveLabel="You'll receive"
                    onRobuxChange={onTheirRobuxChange}
                    onRemoveItem={onRemoveTheirItem}
                />
            </div>

            <DifferenceRow
                differenceRap={differenceRap}
                differenceValue={differenceValue}
            />
            <StageActions
                canAttemptSend={canAttemptSend}
                isCounterTrade={Boolean(counterTradeId)}
                sending={sending}
                sendError={sendError}
                sendSuccess={sendSuccess}
                onOpenConfirm={openConfirm}
                onBack={onBackToPreviousPage}
            />
            <ConfirmSendModal
                open={confirmOpen}
                sending={sending}
                differenceValue={differenceValue}
                stayOnPageAfterSend={stayOnPageAfterSend}
                modalRef={confirmModalRef}
                onToggleStayOnPage={setStayOnPageAfterSend}
                onBack={closeConfirm}
                onSend={() => void onConfirmSend()}
            />
            <TwoFactorModal
                open={twoFactorOpen}
                sending={sending}
                twoFactorCode={twoFactorCode}
                modalRef={twoFactorModalRef}
                onCodeChange={setTwoFactorCode}
                onBack={cancelTwoFactor}
                onSend={() => void onSubmitTwoFactor()}
            />
        </section>
    );
}
