import type { TradeItem } from "../components/ItemCard";
import { RequestOptions } from "./types";

type RobloxItemType = TradeItem["itemType"];

type TradableTarget = {
    itemType?: string;
    targetId?: string;
};

type TradableItemInstance = {
    collectibleItemInstanceId?: string;
    itemTarget?: TradableTarget;
    itemName?: string;
    serialNumber?: number | null;
    recentAveragePrice?: number;
    isOnHold?: boolean;
};

type TradableItem = {
    collectibleItemId?: string;
    itemTarget?: TradableTarget;
    itemName?: string;
    recentAveragePrice?: number;
    instances?: TradableItemInstance[];
};

type TradableItemsResponse = {
    userId?: number;
    items?: TradableItem[];
    nextPageCursor?: string | null;
};

type ThumbnailsResponse = {
    data?: Array<{
        targetId?: number | string;
        imageUrl?: string | null;
    }>;
};

type RolimonsItemTuple = [
    string,
    string,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
];

type RolimonsItemDetailsResponse = {
    success?: boolean;
    assets?: Record<string, RolimonsItemTuple>;
    bundles?: Record<string, RolimonsItemTuple>;
};

type RolimonsMessageResponse = RolimonsItemDetailsResponse | null;

type Collectible = {
    uniqueId: string;
    targetId: number;
    itemType: RobloxItemType;
    holding: boolean;
    serialNumber?: number;
    name: string;
    rap: number;
};

const TRADABLE_ITEMS_PAGE_LIMIT = 50;
const TRADABLE_ITEMS_MAX_PAGES = 50;
const TRADABLE_ITEMS_RETRIES = 3;
const RETRY_DELAY_MS = 350;
const GET_ROLIMONS_ITEMS_MESSAGE = "trade-plus:get-rolimons-items";
let rolimonsItemDetailsPromise: Promise<
    Map<string, { defaultValue: number; projected: boolean }>
> | null = null;
const thumbnailRequestCache = new Map<string, Promise<Map<number, string>>>();

class HttpStatusError extends Error {
    status: number;

    constructor(status: number, message: string) {
        super(message);
        this.name = "HttpStatusError";
        this.status = status;
    }
}

function asRecord(value: unknown): Record<string, unknown> | null {
    return value && typeof value === "object"
        ? (value as Record<string, unknown>)
        : null;
}

async function getJson<T>(
    url: string,
    options: RequestOptions = {},
    config: { failOnHttp?: boolean } = {},
): Promise<T | null> {
    const response = await fetch(url, {
        credentials: "include",
        signal: options.signal,
    });

    if (!response.ok) {
        if (config.failOnHttp) {
            throw new HttpStatusError(
                response.status,
                `Request failed with status ${response.status} for ${url}`,
            );
        }
        return null;
    }

    return (await response.json()) as T;
}

function parseTradableItemsResponse(
    raw: unknown,
): TradableItemsResponse | null {
    const root = asRecord(raw);
    if (!root) {
        return null;
    }

    return {
        userId: typeof root.userId === "number" ? root.userId : undefined,
        items: Array.isArray(root.items) ? (root.items as TradableItem[]) : [],
        nextPageCursor:
            typeof root.nextPageCursor === "string" ||
            root.nextPageCursor === null
                ? root.nextPageCursor
                : undefined,
    };
}

function parseRolimonsResponse(raw: unknown): RolimonsMessageResponse {
    const root = asRecord(raw);
    if (
        !root ||
        root.success !== true ||
        !asRecord(root.assets) ||
        !asRecord(root.bundles)
    ) {
        return null;
    }

    return root as RolimonsItemDetailsResponse;
}

function itemKey(itemType: RobloxItemType, targetId: number): string {
    return `${itemType}:${targetId}`;
}

function thumbnailCacheKey(
    itemType: RobloxItemType,
    targetIds: number[],
): string {
    const uniqueSortedIds = [...new Set(targetIds)].sort((a, b) => a - b);
    return `${itemType}:${uniqueSortedIds.join(",")}`;
}

async function getTradableItemsPage(
    userId: number,
    cursor: string | undefined,
    options: RequestOptions,
): Promise<TradableItemsResponse | null> {
    const params = new URLSearchParams({
        limit: String(TRADABLE_ITEMS_PAGE_LIMIT),
    });

    if (cursor) {
        params.set("cursor", cursor);
    }

    const raw = await getJson<unknown>(
        `https://trades.roblox.com/v2/users/${userId}/tradableitems?${params.toString()}`,
        options,
        { failOnHttp: true },
    );

    return parseTradableItemsResponse(raw);
}

function wait(ms: number, signal?: AbortSignal): Promise<void> {
    return new Promise((resolve, reject) => {
        const timeout = setTimeout(resolve, ms);

        if (!signal) {
            return;
        }

        const onAbort = () => {
            clearTimeout(timeout);
            reject(new Error("Aborted"));
        };

        if (signal.aborted) {
            onAbort();
            return;
        }

        signal.addEventListener("abort", onAbort, { once: true });
    });
}

function isRetryableTradableItemsError(error: unknown): boolean {
    if (!(error instanceof HttpStatusError)) {
        return false;
    }

    return error.status === 429 || (error.status >= 500 && error.status < 600);
}

function toTargetId(targetId: string | undefined): number | null {
    if (!targetId) {
        return null;
    }

    const parsed = Number.parseInt(targetId, 10);
    return Number.isFinite(parsed) ? parsed : null;
}

function toItemType(itemType: string | undefined): RobloxItemType {
    return itemType?.toLowerCase() === "bundle" ? "Bundle" : "Asset";
}

function toCollectibleFromInstance(
    item: TradableItem,
    instance: TradableItemInstance,
): Collectible | null {
    if (typeof instance.collectibleItemInstanceId !== "string") {
        return null;
    }

    const targetId =
        toTargetId(instance.itemTarget?.targetId) ??
        toTargetId(item.itemTarget?.targetId);
    if (targetId === null) {
        return null;
    }
    const itemType = toItemType(
        instance.itemTarget?.itemType ?? item.itemTarget?.itemType,
    );

    const name =
        (typeof instance.itemName === "string" && instance.itemName.length > 0
            ? instance.itemName
            : null) ??
        (typeof item.itemName === "string" && item.itemName.length > 0
            ? item.itemName
            : null);

    if (!name) {
        return null;
    }

    return {
        uniqueId: instance.collectibleItemInstanceId,
        targetId,
        itemType,
        holding: instance.isOnHold === true,
        serialNumber:
            typeof instance.serialNumber === "number"
                ? instance.serialNumber
                : undefined,
        name,
        rap:
            typeof instance.recentAveragePrice === "number"
                ? instance.recentAveragePrice
                : (item.recentAveragePrice ?? 0),
    };
}

function mapTradableItems(page: TradableItemsResponse): Collectible[] {
    const mapped: Collectible[] = [];

    for (const item of page.items ?? []) {
        for (const instance of item.instances ?? []) {
            const collectible = toCollectibleFromInstance(item, instance);
            if (collectible) {
                mapped.push(collectible);
            }
        }
    }

    return mapped;
}

async function getTradableItems(
    userId: number,
    options: RequestOptions = {},
): Promise<Collectible[]> {
    const items: Collectible[] = [];
    let cursor: string | undefined;
    let pagesLeft = TRADABLE_ITEMS_MAX_PAGES;

    while (pagesLeft > 0) {
        let page: TradableItemsResponse | null = null;

        for (let attempt = 1; attempt <= TRADABLE_ITEMS_RETRIES; attempt += 1) {
            try {
                page = await getTradableItemsPage(userId, cursor, options);
                break;
            } catch (error) {
                if (!isRetryableTradableItemsError(error)) {
                    throw error;
                }

                if (attempt >= TRADABLE_ITEMS_RETRIES) {
                    throw error;
                }

                await wait(RETRY_DELAY_MS * attempt, options.signal);
            }
        }

        if (!page) {
            break;
        }

        items.push(...mapTradableItems(page));

        const nextCursor = page.nextPageCursor ?? undefined;
        if (!nextCursor) {
            break;
        }

        cursor = nextCursor;
        pagesLeft -= 1;
    }

    return items;
}

async function getThumbnailMap(
    itemType: RobloxItemType,
    targetIds: number[],
    options: RequestOptions = {},
): Promise<Map<number, string>> {
    if (!targetIds.length) {
        return new Map();
    }

    const map = new Map<number, string>();
    const chunkSize = 60;

    for (let i = 0; i < targetIds.length; i += chunkSize) {
        const chunk = targetIds.slice(i, i + chunkSize);
        const joinedIds = chunk.join(",");
        const isBundle = itemType === "Bundle";
        const path = isBundle ? "bundles/thumbnails" : "assets";
        const idParameter = isBundle ? "bundleIds" : "assetIds";
        const returnPolicy = isBundle ? "" : "&returnPolicy=PlaceHolder";
        const thumbnailSize = isBundle ? "420x420" : "250x250";
        const data = await getJson<ThumbnailsResponse>(
            `https://thumbnails.roblox.com/v1/${path}?${idParameter}=${joinedIds}&size=${thumbnailSize}&format=Png&isCircular=false${returnPolicy}`,
            options,
        );

        for (const entry of data?.data ?? []) {
            const targetId =
                typeof entry.targetId === "number"
                    ? entry.targetId
                    : toTargetId(entry.targetId);
            if (
                targetId !== null &&
                typeof entry.imageUrl === "string" &&
                entry.imageUrl.length > 0
            ) {
                map.set(targetId, entry.imageUrl);
            }
        }
    }

    return map;
}

async function getThumbnailMapDeduped(
    itemType: RobloxItemType,
    targetIds: number[],
    options: RequestOptions = {},
): Promise<Map<number, string>> {
    if (!targetIds.length) {
        return new Map();
    }

    const cacheKey = thumbnailCacheKey(itemType, targetIds);
    const existing = thumbnailRequestCache.get(cacheKey);
    if (existing) {
        return existing;
    }

    const request = getThumbnailMap(itemType, targetIds, options)
        .then((map) => {
            return map;
        })
        .catch((error) => {
            thumbnailRequestCache.delete(cacheKey);
            throw error;
        });

    thumbnailRequestCache.set(cacheKey, request);
    if (thumbnailRequestCache.size > 40) {
        thumbnailRequestCache.clear();
        thumbnailRequestCache.set(cacheKey, request);
    }

    return request;
}

function getRolimonsItemDetails(): Promise<
    Map<string, { defaultValue: number; projected: boolean }>
> {
    if (rolimonsItemDetailsPromise) {
        return rolimonsItemDetailsPromise;
    }

    rolimonsItemDetailsPromise = (async () => {
        try {
            const raw = await new Promise<unknown>((resolve, reject) => {
                chrome.runtime.sendMessage(
                    { type: GET_ROLIMONS_ITEMS_MESSAGE },
                    (response) => {
                        if (chrome.runtime.lastError) {
                            reject(new Error(chrome.runtime.lastError.message));
                            return;
                        }

                        resolve(response);
                    },
                );
            });
            const data = parseRolimonsResponse(raw);

            if (!data?.success || !data.assets || !data.bundles) {
                return new Map();
            }

            const valueMap = new Map<
                string,
                { defaultValue: number; projected: boolean }
            >();

            const collections: Array<
                [RobloxItemType, Record<string, RolimonsItemTuple>]
            > = [
                ["Asset", data.assets],
                ["Bundle", data.bundles],
            ];

            for (const [itemType, items] of collections) {
                for (const [targetIdRaw, itemTuple] of Object.entries(items)) {
                    const targetId = Number.parseInt(targetIdRaw, 10);
                    const defaultValue = itemTuple?.[4];
                    const projected = itemTuple?.[7] === 1;

                    if (!Number.isFinite(targetId)) {
                        continue;
                    }

                    if (typeof defaultValue !== "number" || defaultValue <= 0) {
                        continue;
                    }

                    valueMap.set(itemKey(itemType, targetId), {
                        defaultValue,
                        projected,
                    });
                }
            }

            return valueMap;
        } catch {
            return new Map();
        }
    })();

    return rolimonsItemDetailsPromise;
}

export async function loadUserCollectibles(
    userId: number,
    options: RequestOptions = {},
): Promise<TradeItem[]> {
    const collectibles = await getTradableItems(userId, options);
    const assetIds = collectibles
        .filter((item) => item.itemType === "Asset")
        .map((item) => item.targetId);
    const bundleIds = collectibles
        .filter((item) => item.itemType === "Bundle")
        .map((item) => item.targetId);
    const [assetThumbnailMap, bundleThumbnailMap, rolimonsItemDetails] =
        await Promise.all([
            getThumbnailMapDeduped("Asset", assetIds, options),
            getThumbnailMapDeduped("Bundle", bundleIds, options),
            getRolimonsItemDetails(),
        ]);

    return collectibles.map((item) => {
        const rolimonsItem = rolimonsItemDetails.get(
            itemKey(item.itemType, item.targetId),
        );
        const thumbnailMap =
            item.itemType === "Bundle" ? bundleThumbnailMap : assetThumbnailMap;

        return {
            id: item.uniqueId,
            assetId: item.targetId,
            itemType: item.itemType,
            holding: item.holding,
            serialNumber: item.serialNumber,
            name: item.name,
            rap: item.rap,
            defaultValue: rolimonsItem?.defaultValue,
            projected: rolimonsItem?.projected,
            trend: "flat",
            thumbnailUrl: thumbnailMap.get(item.targetId),
        };
    });
}
