import { chromium, expect, test, type Page, type Worker } from "@playwright/test";
import { resolve } from "node:path";

type ZoomProfiles = { normal: number; trade: number };

async function gotoRoblox(page: Page, path: string, waitMs: number): Promise<void> {
    await page.goto(`https://www.roblox.com${path}`);
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(waitMs);
}

async function readDpr(page: Page): Promise<number> {
    return page.evaluate(() => window.devicePixelRatio);
}

async function setZoomProfiles(
    worker: Worker,
    profiles: ZoomProfiles,
): Promise<void> {
    await worker.evaluate(async (payload) => {
        await new Promise<void>((resolve, reject) => {
            chrome.storage.local.set(
                {
                    robloxWebsiteZoomLevel: payload.normal,
                    tradePlusZoomLevel: payload.trade,
                },
                () => {
                    if (chrome.runtime.lastError) {
                        reject(new Error(chrome.runtime.lastError.message));
                        return;
                    }
                    resolve();
                },
            );
        });
    }, profiles);
}

async function readZoomProfiles(worker: Worker): Promise<ZoomProfiles> {
    return worker.evaluate(async () => {
        return new Promise<ZoomProfiles>((resolve, reject) => {
            chrome.storage.local.get(
                ["robloxWebsiteZoomLevel", "tradePlusZoomLevel"],
                (items) => {
                    if (chrome.runtime.lastError) {
                        reject(new Error(chrome.runtime.lastError.message));
                        return;
                    }

                    resolve({
                        normal:
                            typeof items.robloxWebsiteZoomLevel === "number"
                                ? items.robloxWebsiteZoomLevel
                                : 1,
                        trade:
                            typeof items.tradePlusZoomLevel === "number"
                                ? items.tradePlusZoomLevel
                                : 1,
                    });
                },
            );
        });
    });
}

async function getActiveRobloxTabZoom(worker: Worker): Promise<number> {
    return worker.evaluate(async () => {
        return new Promise<number>((resolve, reject) => {
            chrome.tabs.query(
                { active: true, currentWindow: true, url: "*://www.roblox.com/*" },
                (tabs) => {
                    if (chrome.runtime.lastError) {
                        reject(new Error(chrome.runtime.lastError.message));
                        return;
                    }

                    const tab = tabs[0];
                    if (!tab?.id) {
                        reject(new Error("No active Roblox tab found."));
                        return;
                    }

                    chrome.tabs.getZoom(tab.id, (zoomFactor) => {
                        if (chrome.runtime.lastError) {
                            reject(new Error(chrome.runtime.lastError.message));
                            return;
                        }
                        resolve(zoomFactor);
                    });
                },
            );
        });
    });
}

async function setActiveRobloxTabZoom(worker: Worker, zoom: number): Promise<void> {
    await worker.evaluate(async (targetZoom) => {
        await new Promise<void>((resolve, reject) => {
            chrome.tabs.query(
                { active: true, currentWindow: true, url: "*://www.roblox.com/*" },
                (tabs) => {
                    if (chrome.runtime.lastError) {
                        reject(new Error(chrome.runtime.lastError.message));
                        return;
                    }

                    const tab = tabs[0];
                    if (!tab?.id) {
                        reject(new Error("No active Roblox tab found."));
                        return;
                    }

                    chrome.tabs.setZoom(tab.id, targetZoom, () => {
                        if (chrome.runtime.lastError) {
                            reject(new Error(chrome.runtime.lastError.message));
                            return;
                        }
                        resolve();
                    });
                },
            );
        });
    }, zoom);
}

function makeSeededRandom(seed: number): () => number {
    let state = seed >>> 0;
    return () => {
        state = (state * 1664525 + 1013904223) >>> 0;
        return state / 0x100000000;
    };
}

function randomIntFrom(rng: () => number, min: number, max: number): number {
    return Math.floor(rng() * (max - min + 1)) + min;
}

async function assertZoomState(
    page: Page,
    worker: Worker,
    isTradeRoute: boolean,
    expectedZoom: number,
): Promise<void> {
    if (isTradeRoute) {
        const marker = await page.evaluate(() =>
            document.documentElement.getAttribute("data-trade-plus-active"),
        );
        expect(marker).toBe("true");
    }

    await expect
        .poll(() => getActiveRobloxTabZoom(worker), { timeout: 10_000 })
        .toBeCloseTo(expectedZoom, 1);

    await expect
        .poll(() => readDpr(page), { timeout: 10_000 })
        .toBeCloseTo(expectedZoom, 1);
}

async function assertNoUpscale(
    page: Page,
    worker: Worker,
    expectedZoom: number,
): Promise<void> {
    const tabZoom = await getActiveRobloxTabZoom(worker);
    const dpr = await readDpr(page);
    expect(tabZoom).toBeLessThanOrEqual(expectedZoom + 0.05);
    expect(dpr).toBeLessThanOrEqual(expectedZoom + 0.05);
}

async function runManualSequenceScenario(
    page: Page,
    worker: Worker,
    normalSequence: number[],
    tradeZoom: number,
    waitMs: number,
): Promise<void> {
    const initialNormal = normalSequence[0];
    const finalNormal = normalSequence[normalSequence.length - 1];
    await setZoomProfiles(worker, { normal: initialNormal, trade: tradeZoom });

    await gotoRoblox(page, "/home", waitMs);
    await setActiveRobloxTabZoom(worker, initialNormal);
    await assertZoomState(page, worker, false, initialNormal);

    for (const zoom of normalSequence.slice(1)) {
        await setActiveRobloxTabZoom(worker, zoom);
        await assertZoomState(page, worker, false, zoom);
    }

    await gotoRoblox(page, "/users/261/trade", waitMs);
    await assertZoomState(page, worker, true, tradeZoom);
    await assertNoUpscale(page, worker, tradeZoom);

    await expect
        .poll(async () => (await readZoomProfiles(worker)).normal, {
            timeout: 10_000,
        })
        .toBeCloseTo(finalNormal, 2);

    await gotoRoblox(page, "/home", waitMs);
    await assertZoomState(page, worker, false, finalNormal);
    await assertNoUpscale(page, worker, finalNormal);
}

async function runPostTradeNormalUpdateScenario(
    page: Page,
    worker: Worker,
    waitMs: number,
): Promise<void> {
    await setZoomProfiles(worker, { normal: 0.8, trade: 1.0 });

    await gotoRoblox(page, "/home", waitMs);
    await setActiveRobloxTabZoom(worker, 0.8);
    await assertZoomState(page, worker, false, 0.8);

    await gotoRoblox(page, "/users/261/trade", waitMs);
    await assertZoomState(page, worker, true, 1.0);

    await gotoRoblox(page, "/messages", waitMs);
    await assertZoomState(page, worker, false, 0.8);

    await setActiveRobloxTabZoom(worker, 0.7);
    await assertZoomState(page, worker, false, 0.7);
    await expect
        .poll(async () => (await readZoomProfiles(worker)).normal, {
            timeout: 10_000,
        })
        .toBeCloseTo(0.7, 2);

    await gotoRoblox(page, "/home", waitMs);
    await assertZoomState(page, worker, false, 0.7);
    await assertNoUpscale(page, worker, 0.7);
}

test("manual normal zoom sequence restores after trade route across timing cases", async () => {
    test.setTimeout(300_000);

    const extensionPath = resolve(".output/chrome-mv3");
    const userDataDir = resolve(`.wxt/chrome-playwright-profile-${Date.now()}`);
    const context = await chromium.launchPersistentContext(userDataDir, {
        headless: false,
        args: [
            `--disable-extensions-except=${extensionPath}`,
            `--load-extension=${extensionPath}`,
        ],
    });

    await context.route("https://www.roblox.com/**", async (route) => {
        await route.fulfill({
            status: 200,
            contentType: "text/html",
            body: "<!doctype html><html><head><title>mock</title></head><body>mock roblox</body></html>",
        });
    });

    const page = context.pages()[0] ?? (await context.newPage());
    await gotoRoblox(page, "/home", 3000);

    const worker =
        context
            .serviceWorkers()
            .find((candidate) => candidate.url().includes("background.js")) ??
        (await context.waitForEvent("serviceworker", {
            timeout: 20_000,
            predicate: (candidate) => candidate.url().includes("background.js"),
        }));

    const fixedCases = [
        { waitMs: 3000, normalSequence: [0.8, 0.9, 0.8, 0.6], tradeZoom: 0.95 },
        { waitMs: 1000, normalSequence: [0.75, 0.85, 0.75, 0.65], tradeZoom: 0.9 },
        { waitMs: 250, normalSequence: [0.8, 0.9, 0.8, 0.6], tradeZoom: 1.0 },
    ];

    for (const c of fixedCases) {
        await runManualSequenceScenario(
            page,
            worker,
            c.normalSequence,
            c.tradeZoom,
            c.waitMs,
        );
        await runPostTradeNormalUpdateScenario(page, worker, c.waitMs);
    }

    const rng = makeSeededRandom(20260305);
    for (let i = 0; i < 10; i += 1) {
        const base = randomIntFrom(rng, 65, 85) / 100;
        const mid = Math.min(1, base + 0.1);
        const end = Math.max(0.5, base - 0.15);
        const tradeZoom = randomIntFrom(rng, 85, 100) / 100;
        const waitMs = randomIntFrom(rng, 250, 3000);
        await runManualSequenceScenario(
            page,
            worker,
            [base, mid, base, end],
            tradeZoom,
            waitMs,
        );
        await runPostTradeNormalUpdateScenario(page, worker, waitMs);
    }

    await context.close();
});
