import type { RefObject } from "react";
import { signedNumberText } from "./format";

type Props = {
    open: boolean;
    sending: boolean;
    differenceValue: number;
    stayOnPageAfterSend: boolean;
    modalRef: RefObject<HTMLDivElement>;
    onToggleStayOnPage: (checked: boolean) => void;
    onBack: () => void;
    onSend: () => void;
};

export function ConfirmSendModal({
    open,
    sending,
    differenceValue,
    stayOnPageAfterSend,
    modalRef,
    onToggleStayOnPage,
    onBack,
    onSend,
}: Props) {
    if (!open) {
        return null;
    }

    return (
        <div className="tp-modal-backdrop" role="dialog" aria-modal="true">
            <div className="tp-modal" ref={modalRef}>
                <h3>Are you sure?</h3>
                <p>The value difference is {signedNumberText(differenceValue)}</p>
                <label className="tp-modal-checkbox">
                    <input
                        type="checkbox"
                        checked={stayOnPageAfterSend}
                        onChange={(event) =>
                            onToggleStayOnPage(event.target.checked)
                        }
                    />
                    <span>Stay on the page after sending trade</span>
                </label>
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
                        {sending ? "Sending..." : "Send"}
                    </button>
                </div>
            </div>
        </div>
    );
}
