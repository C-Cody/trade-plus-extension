import { displayItemValue } from "../domain/trade";
import { RobuxIcon } from "./icons/RobuxIcon";
import { RolimonsIcon } from "./icons/RolimonsIcon";

export type TradeItem = {
    id: string;
    assetId: number;
    name: string;
    serialNumber?: number;
    projected?: boolean;
    rap: number;
    defaultValue?: number;
    trend: "up" | "down" | "flat";
    thumbnailUrl?: string;
    holding?: boolean;
};

type Props = {
    item: TradeItem;
    selected: boolean;
    canSelectMore: boolean;
    onToggle: (itemId: string) => void;
};

export function ItemCard({ item, selected, canSelectMore, onToggle }: Props) {
    const blocked = item.holding || (!selected && !canSelectMore);

    return (
        <article
            className={`tp-item-card${selected ? " tp-item-card--selected" : ""}`}
        >
            <button
                type="button"
                className={`tp-item-thumb tp-item-thumb-btn${item.holding ? " tp-item-thumb--holding" : ""}`}
                onClick={() => {
                    if (!blocked) {
                        onToggle(item.id);
                    }
                }}
                aria-pressed={selected}
                disabled={blocked}
            >
                {item.thumbnailUrl ? (
                    <img
                        src={item.thumbnailUrl}
                        alt={item.name}
                        loading="lazy"
                    />
                ) : (
                    <span className="tp-item-fallback">{"\u274C"}</span>
                )}
                {typeof item.serialNumber === "number" ? (
                    <span className="tp-item-star">
                        {`#${item.serialNumber}`}
                    </span>
                ) : null}
                {item.projected ? (
                    <span
                        className="tp-item-corner-badge tp-item-corner-badge--projected"
                        title="Projected"
                        aria-label="Projected item"
                    >
                        {"\u26A0\uFE0F"}
                    </span>
                ) : null}
                {item.holding ? (
                    <span className="tp-item-chip">Holding</span>
                ) : null}
            </button>
            <div className="tp-item-meta">
                <h4>
                    <a
                        className="tp-item-link"
                        href={`https://www.roblox.com/catalog/${item.assetId}`}
                        target="_blank"
                        rel="noreferrer"
                    >
                        {item.name}
                    </a>
                </h4>
                <p>
                    <span className="tp-robux-inline">
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
                </p>
                <p className="tp-item-value-row">
                    <span className="tp-value-inline">
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
                </p>
            </div>
        </article>
    );
}
