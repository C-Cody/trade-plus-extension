type Props = {
    canAttemptSend: boolean;
    isCounterTrade: boolean;
    sending: boolean;
    sendError: string | null;
    sendSuccess: string | null;
    onOpenConfirm: () => void;
    onBack: () => void;
};

export function StageActions({
    canAttemptSend,
    isCounterTrade,
    sending,
    sendError,
    sendSuccess,
    onOpenConfirm,
    onBack,
}: Props) {
    return (
        <>
            <div className="tp-stage-actions">
                <button
                    type="button"
                    className="tp-stage-btn tp-stage-btn--primary"
                    onClick={onOpenConfirm}
                    disabled={!canAttemptSend || sending}
                >
                    {isCounterTrade ? "Counter trade" : "Send trade"}
                </button>
                <button
                    type="button"
                    className="tp-stage-btn tp-stage-btn--ghost"
                    onClick={onBack}
                    disabled={sending}
                >
                    Back
                </button>
            </div>
            {sendError ? (
                <p className="tp-stage-note tp-stage-note--error">
                    {sendError}
                </p>
            ) : null}
            {sendSuccess ? <p className="tp-stage-note">{sendSuccess}</p> : null}
        </>
    );
}
