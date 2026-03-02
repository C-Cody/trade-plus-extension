import { RobuxIcon } from "../icons/RobuxIcon";
import { RolimonsIcon } from "../icons/RolimonsIcon";
import { signedNumberText } from "./format";

type Props = {
    differenceRap: number;
    differenceValue: number;
};

export function DifferenceRow({ differenceRap, differenceValue }: Props) {
    return (
        <>
            <div className="tp-stage-divider" aria-hidden="true" />
            <p className="tp-offer-rap tp-stage-difference">
                <span className="tp-offer-total-label">Difference</span>
                <span className="tp-offer-item-prices tp-offer-item-prices--total">
                    <span className="tp-offer-item-rap tp-robux-inline">
                        <span className="tp-currency-icon-slot">
                            <RobuxIcon
                                className="tp-robux-icon"
                                width={12}
                                height={12}
                            />
                        </span>
                        <span className="tp-currency-value">
                            {signedNumberText(differenceRap)}
                        </span>
                    </span>
                    <span className="tp-offer-item-value tp-value-inline">
                        <span className="tp-currency-icon-slot">
                            <RolimonsIcon
                                className="tp-value-icon"
                                width={12}
                                height={12}
                            />
                        </span>
                        <span className="tp-currency-value">
                            {signedNumberText(differenceValue)}
                        </span>
                    </span>
                </span>
            </p>
        </>
    );
}
