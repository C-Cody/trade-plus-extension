import { useState } from "react";
import {
    completeTradeTwoFactorChallenge,
    sendTrade,
    TradeChallenge,
    TradeChallengeRequiredError,
    TradeSendPayload,
} from "../api";
import {
    CHALLENGE_REQUIRED_EXACT_MESSAGE,
    SEND_ERROR_COULD_NOT_COMPLETE_2FA,
    SEND_ERROR_COULD_NOT_CONTINUE_2FA,
    SEND_ERROR_COULD_NOT_RESOLVE_USERS,
    SEND_ERROR_COULD_NOT_SEND_TRADE,
    SEND_ERROR_ENTER_2FA_CODE,
} from "../constants/messages";

function isChallengeRequiredMessage(message: string): boolean {
    return message.trim().toLowerCase() === CHALLENGE_REQUIRED_EXACT_MESSAGE;
}

function formatSendSuccessMessage(tradeId: number | null): string {
    return typeof tradeId === "number"
        ? `Trade sent (ID ${tradeId}).`
        : "Trade sent.";
}

type Params = {
    tradePayload: TradeSendPayload | null;
    currentUserId: number | null;
    counterTradeId?: string;
    stayOnPageAfterSend: boolean;
};

export function useTradeSendFlow({
    tradePayload,
    currentUserId,
    counterTradeId,
    stayOnPageAfterSend,
}: Params) {
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [twoFactorOpen, setTwoFactorOpen] = useState(false);
    const [twoFactorCode, setTwoFactorCode] = useState("");
    const [pendingChallenge, setPendingChallenge] =
        useState<TradeChallenge | null>(null);
    const [pendingCsrfToken, setPendingCsrfToken] = useState<string | null>(
        null,
    );
    const [sending, setSending] = useState(false);
    const [sendError, setSendError] = useState<string | null>(null);
    const [sendSuccess, setSendSuccess] = useState<string | null>(null);

    function resetStatusMessages() {
        setSendError(null);
        setSendSuccess(null);
    }

    function clearChallengeFlowState() {
        setConfirmOpen(false);
        setTwoFactorOpen(false);
        setPendingChallenge(null);
        setPendingCsrfToken(null);
    }

    function onSendSuccess(tradeId: number | null) {
        clearChallengeFlowState();

        if (stayOnPageAfterSend) {
            setSendSuccess(formatSendSuccessMessage(tradeId));
            return;
        }

        window.location.assign("https://www.roblox.com/trades?tab=Outbound");
    }

    async function onConfirmSend() {
        if (!tradePayload) {
            setSendError(SEND_ERROR_COULD_NOT_RESOLVE_USERS);
            return;
        }

        setSending(true);
        resetStatusMessages();

        try {
            const tradeId = await sendTrade(tradePayload, {
                csrfToken: pendingCsrfToken,
                counterTradeId,
            });
            onSendSuccess(tradeId);
        } catch (error) {
            if (error instanceof TradeChallengeRequiredError) {
                setConfirmOpen(false);
                setPendingChallenge(error.challenge);
                setPendingCsrfToken(error.csrfToken ?? null);
                setTwoFactorCode("");
                setTwoFactorOpen(true);
                setSendError(
                    isChallengeRequiredMessage(error.message)
                        ? null
                        : error.message,
                );
            } else {
                setConfirmOpen(false);
                setSendError(
                    error instanceof Error && error.message.length > 0
                        ? error.message
                        : SEND_ERROR_COULD_NOT_SEND_TRADE,
                );
            }
        } finally {
            setSending(false);
        }
    }

    async function onSubmitTwoFactor() {
        if (!tradePayload || !pendingChallenge || typeof currentUserId !== "number") {
            setTwoFactorOpen(false);
            setSendError(SEND_ERROR_COULD_NOT_CONTINUE_2FA);
            return;
        }

        if (twoFactorCode.trim().length === 0) {
            setSendError(SEND_ERROR_ENTER_2FA_CODE);
            return;
        }

        setSending(true);
        resetStatusMessages();

        try {
            const { challengeHeaders, csrfToken } =
                await completeTradeTwoFactorChallenge(
                    currentUserId,
                    pendingChallenge,
                    twoFactorCode.trim(),
                    { csrfToken: pendingCsrfToken },
                );

            const tradeId = await sendTrade(tradePayload, {
                challengeHeaders,
                csrfToken,
                counterTradeId,
            });
            onSendSuccess(tradeId);
        } catch (error) {
            setTwoFactorOpen(false);
            setSendError(
                error instanceof Error && error.message.length > 0
                    ? error.message
                    : SEND_ERROR_COULD_NOT_COMPLETE_2FA,
            );
        } finally {
            setSending(false);
        }
    }

    function openConfirm() {
        resetStatusMessages();
        setConfirmOpen(true);
    }

    function closeConfirm() {
        setConfirmOpen(false);
    }

    function cancelTwoFactor() {
        setTwoFactorOpen(false);
        setPendingChallenge(null);
        setPendingCsrfToken(null);
    }

    return {
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
    };
}
