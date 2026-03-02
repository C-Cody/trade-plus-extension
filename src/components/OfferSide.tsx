import { displayItemValue, itemValue, MAX_ROBUX_INPUT } from "../domain/trade";
import { RobuxIcon } from "./icons/RobuxIcon";
import { RolimonsIcon } from "./icons/RolimonsIcon";
import type { TradeItem } from "./ItemCard";

type Props = {
    title: string;
    items: TradeItem[];
    totalRap: number;
    totalValue: number;
    robux: string;
    receiveLabel: string;
    onRobuxChange: (value: string) => void;
    onRemoveItem: (itemId: string) => void;
};

function receivedRobuxText(rawRobux: string): string {
    const parsed = Number.parseInt(rawRobux, 10);
    const normalized = Number.isFinite(parsed) ? parsed : 0;
    const received = Math.round(normalized * 0.7);
    return received.toLocaleString();
}

export function OfferSide({
    title,
    items,
    totalRap,
    totalValue,
    robux,
    receiveLabel,
    onRobuxChange,
    onRemoveItem,
}: Props) {
    const slots = Array.from({ length: 4 }, (_, i) => i);

    return (
        <section className="tp-offer-side">
            <header className="tp-offer-head">
                <strong>{title}</strong>
            </header>
            <div className="tp-offer-grid">
                {slots.map((index) => {
                    const item = items[index];

                    if (!item) {
                        return (
                            <div
                                key={`${title}-empty-${index}`}
                                className="tp-offer-slot"
                                aria-hidden="true"
                            />
                        );
                    }

                    return (
                        <button
                            key={item.id}
                            type="button"
                            className="tp-offer-slot tp-offer-slot--filled"
                            onClick={() => onRemoveItem(item.id)}
                        >
                            <span className="tp-offer-item-thumb">
                                {item.thumbnailUrl ? (
                                    <img
                                        src={item.thumbnailUrl}
                                        alt={item.name}
                                        loading="lazy"
                                    />
                                ) : (
                                    <span>{"\u274C"}</span>
                                )}
                                <span className="tp-offer-remove-overlay">
                                    {"\u274C"}
                                </span>
                            </span>
                            <span className="tp-offer-item-meta">
                                <span className="tp-offer-item-top">
                                    <span className="tp-offer-item-name">
                                        {item.name}
                                    </span>
                                    {typeof item.serialNumber === "number" ? (
                                        <span className="tp-offer-item-serial">
                                            {`#${item.serialNumber}`}
                                        </span>
                                    ) : null}
                                </span>
                                <span className="tp-offer-item-prices">
                                    <span className="tp-offer-item-rap tp-robux-inline">
                                        <span className="tp-currency-icon-slot">
                                            <RobuxIcon
                                                className="tp-robux-icon"
                                                width={12}
                                                height={12}
                                            />
                                        </span>
                                        <span className="tp-currency-value">
                                            {item.rap.toLocaleString()}
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
                                            {displayItemValue(item)}
                                        </span>
                                    </span>
                                </span>
                            </span>
                        </button>
                    );
                })}
            </div>
            <label className="tp-robux-row">
                <span className="tp-robux-label-icon">
                    <RobuxIcon
                        className="tp-robux-icon"
                        width={12}
                        height={12}
                    />
                </span>
                <input
                    type="number"
                    min="0"
                    max={MAX_ROBUX_INPUT}
                    step="1"
                    value={robux}
                    onChange={(event) => onRobuxChange(event.target.value)}
                />
                <span className="tp-robux-helper">
                    {receiveLabel}{" "}
                    <span className="tp-robux-inline">
                        <span className="tp-currency-icon-slot">
                            <RobuxIcon
                                className="tp-robux-icon"
                                width={12}
                                height={12}
                            />
                        </span>
                        <span className="tp-currency-value">
                            {receivedRobuxText(robux)}
                        </span>
                    </span>
                </span>
            </label>
            <p className="tp-offer-rap">
                <span className="tp-offer-total-label">Total</span>
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
                            {totalRap.toLocaleString()}
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
                            {totalValue.toLocaleString()}
                        </span>
                    </span>
                </span>
            </p>
        </section>
    );
}
