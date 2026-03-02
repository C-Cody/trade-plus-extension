import type { RefObject } from "react";
import { TWO_FACTOR_PROMPT } from "../../constants/messages";

type Props = {
    open: boolean;
    sending: boolean;
    twoFactorCode: string;
    modalRef: RefObject<HTMLDivElement>;
    onCodeChange: (value: string) => void;
    onBack: () => void;
    onSend: () => void;
};

export function TwoFactorModal({
    open,
    sending,
    twoFactorCode,
    modalRef,
    onCodeChange,
    onBack,
    onSend,
}: Props) {
    if (!open) {
        return null;
    }

    return (
        <div className="tp-modal-backdrop" role="dialog" aria-modal="true">
            <div className="tp-modal" ref={modalRef}>
                <h3>Two-Step Verification</h3>
                <p>{TWO_FACTOR_PROMPT}</p>
                <input
                    className="tp-modal-input"
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    value={twoFactorCode}
                    onChange={(event) => onCodeChange(event.target.value)}
                    onKeyDown={(event) => {
                        if (event.key !== "Enter" || sending) {
                            return;
                        }

                        event.preventDefault();
                        onSend();
                    }}
                    placeholder="2FA code"
                />
                <div className="tp-modal-actions">
                    <button
                        type="button"
                        className="tp-stage-btn tp-stage-btn--ghost"
                        onClick={onBack}
                        disabled={sending}
                    >
                        Back
                    </button>
                    <button
                        type="button"
                        className="tp-stage-btn tp-stage-btn--primary"
                        onClick={onSend}
                        disabled={sending}
                    >
                        {sending ? "Verifying..." : "Send"}
                    </button>
                </div>
            </div>
        </div>
    );
}
