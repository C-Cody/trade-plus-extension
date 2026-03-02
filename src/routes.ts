export type TradePlusTarget =
    | {
          kind: "trade-counter";
          tradeId: string;
      }
    | {
          kind: "user-trade";
          userId: string;
      };

const TRADE_COUNTER_RE = /^\/trades\/(?<tradeId>\d+)\/counter\/?$/;
const USER_TRADE_RE = /^\/users\/(?<userId>\d+)\/trade\/?$/;

export function targetFromUrl(url: string): TradePlusTarget | null {
    const parsed = new URL(url);

    const tradeCounterMatch = parsed.pathname.match(TRADE_COUNTER_RE);
    if (tradeCounterMatch?.groups?.tradeId) {
        return {
            kind: "trade-counter",
            tradeId: tradeCounterMatch.groups.tradeId,
        };
    }

    const userTradeMatch = parsed.pathname.match(USER_TRADE_RE);
    if (userTradeMatch?.groups?.userId) {
        return {
            kind: "user-trade",
            userId: userTradeMatch.groups.userId,
        };
    }

    return null;
}
