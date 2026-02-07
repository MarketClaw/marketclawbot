// market.ts — Fetches market data via yahoo-finance.
// Calculates RSI, MACD, Bollinger Bands from raw historical prices.

import yahooFinance from "yahoo-finance";
import {
  TickerData,
  TechnicalIndicators,
  MarketMover,
  NewsItem,
} from "./types";

// ─── Price & Technical Indicators ────────────────────────────

export async function getTickerData(symbol: string): Promise<TickerData | null> {
  try {
    // Fetch 3 months of historical data
    const historical = await yahooFinance.historical(symbol, {
      period1: getDateMonthsAgo(3),
      period2: new Date(),
      interval: "1d",
    });

    if (!historical || historical.length < 2) return null;

    // Fetch general info
    const summary = await yahooFinance.quoteSummary(symbol, {
      modules: ["price", "defaultKeyStatistics"],
    });

    const priceData = summary.price;
    const latest = historical[historical.length - 1];
    const prev = historical[historical.length - 2];

    const price = roundTo(latest.close ?? 0, 2);
    const prevClose = prev.close ?? price;
    const changePct = roundTo(((price - prevClose) / prevClose) * 100, 2);

    // Extract close prices for indicator calculation
    const closes = historical.map((d) => d.close ?? 0);
    const lows = historical.map((d) => d.low ?? 0);
    const highs = historical.map((d) => d.high ?? 0);

    const indicators = calculateIndicators(closes);

    // Support & Resistance: 20-day low/high
    const last20Lows = lows.slice(-20);
    const last20Highs = highs.slice(-20);
    const support = roundTo(Math.min(...last20Lows), 2);
    const resistance = roundTo(Math.max(...last20Highs), 2);

    return {
      symbol: symbol.toUpperCase(),
      name: priceData?.shortName ?? symbol,
      price,
      changePct,
      marketCap: priceData?.marketCap ?? null,
      volume: priceData?.regularMarketVolume ?? null,
      sector: priceData?.sectorKey ?? "N/A",
      support,
      resistance,
      indicators,
      fetchedAt: new Date().toISOString(),
    };
  } catch (e) {
    console.error(`[market] Error fetching ${symbol}:`, e);
    return null;
  }
}

// ─── Technical Indicator Calculations ────────────────────────

function calculateIndicators(closes: number[]): TechnicalIndicators {
  const rsi = calcRSI(closes, 14);
  const { macdLine, signalLine } = calcMACD(closes, 12, 26, 9);
  const bollinger = calcBollinger(closes, 20);

  return {
    rsi: roundTo(rsi, 2),
    rsiSignal: getRsiSignal(rsi),
    macd: roundTo(macdLine, 4),
    macdSignal: roundTo(signalLine, 4),
    macdBullish: macdLine > signalLine,
    bollinger: {
      upper: roundTo(bollinger.upper, 2),
      middle: roundTo(bollinger.middle, 2),
      lower: roundTo(bollinger.lower, 2),
    },
  };
}

// RSI (14-period) using Wilder's smoothing
function calcRSI(closes: number[], period: number): number {
  const deltas = closes.slice(1).map((c, i) => c - closes[i]);
  const gains = deltas.map((d) => (d > 0 ? d : 0));
  const losses = deltas.map((d) => (d < 0 ? -d : 0));

  // Use EWM (exponential weighted) similar to pandas ewm(com=period-1)
  const avgGains = ewm(gains, period - 1);
  const avgLosses = ewm(losses, period - 1);

  const lastGain = avgGains[avgGains.length - 1];
  const lastLoss = avgLosses[avgLosses.length - 1];

  if (lastLoss === 0) return 100;
  const rs = lastGain / lastLoss;
  return 100 - 100 / (1 + rs);
}

// MACD (12/26/9)
function calcMACD(
  closes: number[],
  fastPeriod: number,
  slowPeriod: number,
  signalPeriod: number
): { macdLine: number; signalLine: number } {
  const ema12 = emaArray(closes, fastPeriod);
  const ema26 = emaArray(closes, slowPeriod);

  // MACD line = EMA12 - EMA26
  const macdValues = ema12.map((v, i) => v - ema26[i]);

  // Signal line = EMA9 of the MACD line
  const signalValues = emaArray(macdValues, signalPeriod);

  return {
    macdLine: macdValues[macdValues.length - 1],
    signalLine: signalValues[signalValues.length - 1],
  };
}

// Bollinger Bands (20-period, 2 std dev)
function calcBollinger(
  closes: number[],
  period: number
): { upper: number; middle: number; lower: number } {
  const last = closes.slice(-period);
  const sma = last.reduce((a, b) => a + b, 0) / last.length;

  const variance =
    last.reduce((sum, val) => sum + Math.pow(val - sma, 2), 0) / last.length;
  const std = Math.sqrt(variance);

  return {
    upper: sma + 2 * std,
    middle: sma,
    lower: sma - 2 * std,
  };
}

function getRsiSignal(rsi: number): string {
  if (rsi >= 70) return "Overbought";
  if (rsi <= 30) return "Oversold";
  if (rsi >= 55) return "Neutral-Bullish";
  if (rsi <= 45) return "Neutral-Bearish";
  return "Neutral";
}

// ─── EMA / EWM Helpers ───────────────────────────────────────

// EMA array: returns an EMA array for each data point
function emaArray(values: number[], span: number): number[] {
  const alpha = 2 / (span + 1);
  const result: number[] = [];
  let ema = values[0];

  for (let i = 0; i < values.length; i++) {
    if (i === 0) {
      ema = values[0];
    } else {
      ema = alpha * values[i] + (1 - alpha) * ema;
    }
    result.push(ema);
  }
  return result;
}

// EWM with com parameter (similar to pandas ewm(com=N, adjust=False))
// alpha = 1 / (1 + com)
function ewm(values: number[], com: number): number[] {
  const alpha = 1 / (1 + com);
  const result: number[] = [];
  let ewmVal = values[0];

  for (let i = 0; i < values.length; i++) {
    if (i === 0) {
      ewmVal = values[0];
    } else {
      ewmVal = alpha * values[i] + (1 - alpha) * ewmVal;
    }
    result.push(ewmVal);
  }
  return result;
}

// ─── Top Gainers / Losers ────────────────────────────────────

const TOP_SYMBOLS = [
  "AAPL", "MSFT", "GOOGL", "AMZN", "NVDA", "TSLA", "META",
  "JPM", "V", "UNH", "XOM", "JNJ", "WMT", "HD", "PG",
  "AVGO", "COST", "AMD", "NFLX", "ORCL", "ASML", "SPCE",
];

export async function getMarketMovers(
  category: "gainers" | "losers",
  limit: number = 10
): Promise<MarketMover[]> {
  const results: MarketMover[] = [];

  // Fetch in parallel for speed
  await Promise.allSettled(
    TOP_SYMBOLS.map(async (sym) => {
      try {
        const quote = await yahooFinance.quote(sym);
        results.push({
          symbol: sym,
          name: quote.shortName ?? sym,
          price: roundTo(quote.regularMarketPrice ?? 0, 2),
          changePct: roundTo(quote.regularMarketChangePercent ?? 0, 2),
        });
      } catch {
        // skip if failed
      }
    })
  );

  // Sort by category
  results.sort((a, b) =>
    category === "gainers" ? b.changePct - a.changePct : a.changePct - b.changePct
  );

  return results.slice(0, limit);
}

// ─── News ────────────────────────────────────────────────────

export async function getNews(symbol: string, count: number = 5): Promise<NewsItem[]> {
  try {
    const news = await yahooFinance.news(symbol, { count });

    return news.slice(0, count).map((item) => ({
      title: item.title ?? "",
      source: (item.relatedTickers && item.relatedTickers.length > 0)
        ? item.relatedTickers[0]
        : symbol,
      url: item.link ?? "",
      timestamp: item.timestamp ? new Date(item.timestamp).getTime() / 1000 : 0,
    }));
  } catch (e) {
    console.error(`[market] Error fetching news for ${symbol}:`, e);
    return [];
  }
}

// ─── Current Price (for alert checking) ─────────────────────

export async function getCurrentPrice(symbol: string): Promise<number | null> {
  try {
    const quote = await yahooFinance.quote(symbol);
    const price = quote.regularMarketPrice ?? quote.previousClose;
    return price ?? null;
  } catch {
    return null;
  }
}

// ─── Utility ─────────────────────────────────────────────────

function roundTo(num: number, decimals: number): number {
  const factor = Math.pow(10, decimals);
  return Math.round(num * factor) / factor;
}

function getDateMonthsAgo(months: number): Date {
  const date = new Date();
  date.setMonth(date.getMonth() - months);
  return date;
}
