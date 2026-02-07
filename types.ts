// types.ts — All centralized type definitions

// ─── Market Data ─────────────────────────────────────────────

export interface BollingerBands {
  upper: number;
  middle: number;
  lower: number;
}

export interface TechnicalIndicators {
  rsi: number;
  rsiSignal: string;
  macd: number;
  macdSignal: number;
  macdBullish: boolean;
  bollinger: BollingerBands;
}

export interface TickerData {
  symbol: string;
  name: string;
  price: number;
  changePct: number;
  marketCap: number | null;
  volume: number | null;
  sector: string;
  support: number;
  resistance: number;
  indicators: TechnicalIndicators;
  fetchedAt: string;
}

export interface MarketMover {
  symbol: string;
  name: string;
  price: number;
  changePct: number;
}

export interface NewsItem {
  title: string;
  source: string;
  url: string;
  timestamp: number;
}

// ─── Storage ─────────────────────────────────────────────────

export type AlertCondition = "above" | "below";

export interface PriceAlert {
  id: number;
  ticker: string;
  condition: AlertCondition;
  price: number;
  createdAt: string;
}

// { userId: [ticker, ...] }
export type WatchlistStore = Record<string, string[]>;

// { userId: [alert, ...] }
export type AlertsStore = Record<string, PriceAlert[]>;

// ─── Watchlist price snapshot (for display) ─────────────────

export interface WatchlistPriceSnapshot {
  price: number;
  changePct: number;
}
