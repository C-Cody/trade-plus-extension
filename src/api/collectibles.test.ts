import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type RuntimeMessageCallback = (response: unknown) => void;

function jsonResponse(body: unknown, status = 200): Response {
    return new Response(JSON.stringify(body), {
        status,
        headers: { "content-type": "application/json" },
    });
}

function installChromeMock(rolimonsResponse: unknown): void {
    vi.stubGlobal("chrome", {
        runtime: {
            lastError: undefined,
            sendMessage: (
                _message: unknown,
                callback: RuntimeMessageCallback,
            ) => callback(rolimonsResponse),
        },
    });
}

describe("loadUserCollectibles", () => {
    beforeEach(() => {
        vi.resetModules();
    });

    afterEach(() => {
        vi.restoreAllMocks();
        vi.unstubAllGlobals();
    });

    it("loads asset and bundle values and thumbnails from their proper collections", async () => {
        installChromeMock({
            success: true,
            assets: {
                "42": ["Asset", "AST", 100, 200, 300, 2, 1, 0, 0, 0, 0],
            },
            bundles: {
                "42": ["Bundle", "BND", 400, 500, 600, 3, 2, 1, 0, 0, 0],
            },
        });

        const fetchMock = vi
            .spyOn(globalThis, "fetch")
            .mockImplementation(async (input) => {
                const url = String(input);

                if (url.includes("/tradableitems?")) {
                    return jsonResponse({
                        items: [
                            {
                                itemTarget: {
                                    itemType: "Asset",
                                    targetId: "42",
                                },
                                itemName: "Asset",
                                recentAveragePrice: 100,
                                instances: [
                                    {
                                        collectibleItemInstanceId:
                                            "asset-instance",
                                        itemTarget: {
                                            itemType: "Asset",
                                            targetId: "42",
                                        },
                                        itemName: "Asset",
                                        recentAveragePrice: 100,
                                        isOnHold: false,
                                    },
                                ],
                            },
                            {
                                itemTarget: {
                                    itemType: "Bundle",
                                    targetId: "42",
                                },
                                itemName: "Bundle",
                                recentAveragePrice: 400,
                                instances: [
                                    {
                                        collectibleItemInstanceId:
                                            "bundle-instance",
                                        itemTarget: {
                                            itemType: "Bundle",
                                            targetId: "42",
                                        },
                                        itemName: "Bundle",
                                        recentAveragePrice: 400,
                                        isOnHold: true,
                                    },
                                ],
                            },
                        ],
                        nextPageCursor: null,
                    });
                }

                if (url.includes("/v1/assets?assetIds=42")) {
                    return jsonResponse({
                        data: [
                            {
                                targetId: 42,
                                imageUrl: "https://images.test/asset.png",
                            },
                        ],
                    });
                }

                if (
                    url.includes("/v1/bundles/thumbnails?bundleIds=42") &&
                    url.includes("&size=420x420")
                ) {
                    return jsonResponse({
                        data: [
                            {
                                targetId: "42",
                                imageUrl: "https://images.test/bundle.png",
                            },
                        ],
                    });
                }

                throw new Error(`Unexpected request: ${url}`);
            });

        const { loadUserCollectibles } = await import("./collectibles");
        const items = await loadUserCollectibles(123);

        expect(items).toEqual([
            expect.objectContaining({
                id: "asset-instance",
                assetId: 42,
                itemType: "Asset",
                defaultValue: 300,
                projected: false,
                thumbnailUrl: "https://images.test/asset.png",
                holding: false,
            }),
            expect.objectContaining({
                id: "bundle-instance",
                assetId: 42,
                itemType: "Bundle",
                defaultValue: 600,
                projected: true,
                thumbnailUrl: "https://images.test/bundle.png",
                holding: true,
            }),
        ]);

        const urls = fetchMock.mock.calls.map(([input]) => String(input));
        expect(urls).toContainEqual(
            expect.stringContaining("/v1/assets?assetIds=42"),
        );
        expect(urls).toContainEqual(
            expect.stringContaining("/v1/bundles/thumbnails?bundleIds=42"),
        );
        expect(urls).toContainEqual(expect.stringContaining("&size=420x420"));
        expect(urls).not.toContainEqual(
            expect.stringMatching(/\/v1\/bundles\/thumbnails\?.*&size=250x250/),
        );
    });

    it("uses the parent target metadata when an instance omits it", async () => {
        installChromeMock({
            success: true,
            assets: {},
            bundles: {
                "7001": ["Bundle", "BND", 1000, 1200, 1500, 2, 1, 0, 0, 0, 0],
            },
        });

        vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
            const url = String(input);

            if (url.includes("/tradableitems?")) {
                return jsonResponse({
                    items: [
                        {
                            itemTarget: {
                                itemType: "Bundle",
                                targetId: "7001",
                            },
                            itemName: "Parent Bundle",
                            recentAveragePrice: 1000,
                            instances: [
                                {
                                    collectibleItemInstanceId:
                                        "bundle-instance",
                                },
                            ],
                        },
                    ],
                    nextPageCursor: null,
                });
            }

            if (
                url.includes("/v1/bundles/thumbnails?bundleIds=7001") &&
                url.includes("&size=420x420")
            ) {
                return jsonResponse({ data: [] });
            }

            throw new Error(`Unexpected request: ${url}`);
        });

        const { loadUserCollectibles } = await import("./collectibles");
        const items = await loadUserCollectibles(123);

        expect(items).toEqual([
            expect.objectContaining({
                assetId: 7001,
                itemType: "Bundle",
                name: "Parent Bundle",
                rap: 1000,
                defaultValue: 1500,
            }),
        ]);
    });
});
