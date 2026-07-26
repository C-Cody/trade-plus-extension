import { useMemo, useRef, useState } from "react";
import {
    inventoryHideHoldingKey,
    inventorySortModeKey,
} from "../constants/storageKeys";
import { filterInventoryItems, type SortMode } from "../domain/inventory";
import { useHasVerticalOverflow } from "../hooks/useHasVerticalOverflow";
import { usePersistentValue } from "../hooks/usePersistentValue";
import { RolimonsIcon } from "./icons/RolimonsIcon";
import { ItemCard, type TradeItem } from "./ItemCard";

type Props = {
    panelKey: "my" | "their";
    title: string;
    items: TradeItem[];
    totalValue: number;
    selectedIds: Set<string>;
    canSelectMore: boolean;
    onToggleItem: (itemId: string) => void;
    loading?: boolean;
    error?: string | null;
    emptyText?: string;
};

export function InventoryPanel({
    panelKey,
    title,
    items,
    totalValue,
    selectedIds,
    canSelectMore,
    onToggleItem,
    loading = false,
    error = null,
    emptyText = "No collectibles found.",
}: Props) {
    const [sortModeRaw, setSortModeRaw] = usePersistentValue(
        inventorySortModeKey(panelKey),
        "value-desc",
        "string",
    );
    const [hideHolding, setHideHolding] = usePersistentValue(
        inventoryHideHoldingKey(panelKey),
        false,
        "boolean",
    );
    const [searchQuery, setSearchQuery] = useState("");
    const sortMode: SortMode =
        sortModeRaw === "value-desc" ||
        sortModeRaw === "value-asc" ||
        sortModeRaw === "rap-desc" ||
        sortModeRaw === "rap-asc" ||
        sortModeRaw === "name-asc" ||
        sortModeRaw === "name-desc"
            ? sortModeRaw
            : "value-desc";
    const gridRef = useRef<HTMLDivElement | null>(null);

    const visibleItems = useMemo(
        () =>
            filterInventoryItems(items, { sortMode, hideHolding, searchQuery }),
        [items, sortMode, hideHolding, searchQuery],
    );
    const nonHoldingCount = useMemo(
        () => items.filter((item) => !item.holding).length,
        [items],
    );
    const gridHasOverflow = useHasVerticalOverflow(gridRef.current, [
        visibleItems,
        loading,
        error,
    ]);

    return (
        <section className="tp-panel tp-panel--inventory">
            <div className="tp-panel-top">
                <div className="tp-title-block">
                    <h2>{title}</h2>
                    <label className="tp-holding-toggle">
                        <span>Hide holding</span>
                        <input
                            type="checkbox"
                            checked={hideHolding}
                            onChange={(event) =>
                                setHideHolding(event.target.checked)
                            }
                        />
                    </label>
                </div>
                <div className="tp-panel-right-controls">
                    <label className="tp-sort-inline">
                        <span>Sort by</span>
                        <select
                            value={sortMode}
                            onChange={(event) =>
                                setSortModeRaw(event.target.value)
                            }
                        >
                            <option value="value-desc">
                                High to low Value
                            </option>
                            <option value="value-asc">Low to high Value</option>
                            <option value="rap-desc">High to low RAP</option>
                            <option value="rap-asc">Low to high RAP</option>
                            <option value="name-asc">Name A-Z</option>
                            <option value="name-desc">Name Z-A</option>
                        </select>
                    </label>
                    <label className="tp-search-inline">
                        <span>Search</span>
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(event) =>
                                setSearchQuery(event.target.value)
                            }
                            placeholder="Item name"
                        />
                    </label>
                </div>
            </div>

            <div className="tp-panel-stats">
                <span>
                    {items.length} items ({nonHoldingCount} non-holding)
                </span>
                <span className="tp-value-inline">
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
            </div>

            {loading ? (
                <p className="tp-panel-note">Loading collectibles...</p>
            ) : null}
            {error ? (
                <p className="tp-panel-note tp-panel-note--error">{error}</p>
            ) : null}
            {!loading && !error && items.length === 0 ? (
                <p className="tp-panel-note">{emptyText}</p>
            ) : null}
            {!loading &&
            !error &&
            items.length > 0 &&
            visibleItems.length === 0 ? (
                <p className="tp-panel-note">
                    No visible items with current filter.
                </p>
            ) : null}

            <div
                ref={gridRef}
                className={`tp-item-grid${
                    visibleItems.length === 0 || !gridHasOverflow
                        ? " tp-item-grid--no-scroll"
                        : " tp-item-grid--scrollable"
                }`}
            >
                {visibleItems.map((item) => {
                    const selected = selectedIds.has(item.id);
                    return (
                        <ItemCard
                            key={item.id}
                            item={item}
                            selected={selected}
                            canSelectMore={canSelectMore || selected}
                            onToggle={onToggleItem}
                        />
                    );
                })}
            </div>
        </section>
    );
}
