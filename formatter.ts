// formatter.ts — Formats all bot messages for Telegram (Markdown V2).

import {
  TickerData,
  MarketMover,
  NewsItem,
  PriceAlert,
  WatchlistPriceSnapshot,
} from "./types";

// ─── Escape ──────────────────────────────────────────────────
// Telegram MarkdownV2 requires escaping special characters.

const SPECIAL_CHARS = /[_*\[\]()~`>#+\-=|{}.!\\]/g;

export function escape(text: string): string {
  return String(text).replace(SPECIAL_CHARS, "\\$&");
}

// ─── Help / Start ────────────────────────────────────────────

export function formatHelp(): string {
  return [
    "🦀 *MarketClaw — AI Investment Analysis Bot*",
    "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
    "",
    "📊 *Market Analysis*",
    "  `/analyze <ticker>` — Technical analysis \\+ AI",
    "  `/movers` — Top 10 gainers today",
    "  `/losers` — Top 10 losers today",
    "  `/news <ticker>` — Latest news",
    "",
    "📋 *Watchlist*",
    "  `/watch <ticker>` — Add to watchlist",
    "  `/unwatch <ticker>` — Remove from watchlist",
    "  `/watchlist` — View your watchlist",
    "",
    "🔔 *Price Alerts*",
    "  `/alert <ticker> above <price>` — Alert when price rises",
    "  `/alert <ticker> below <price>` — Alert when price drops",
    "  `/alerts` — View all active alerts",
    "  `/delalert <id>` — Delete an alert by ID",
    "",
    "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
    "💡 *Examples:*",
    "  `/analyze AAPL`",
    "  `/alert AAPL below 220`",
    "  `/alert BTC\\-USD above 100000`",
    "",
    "⚠️ _Not investment advice\\. Always do your own research\\._",
  ].join("\n");
}

// ─── Analyze ─────────────────────────────────────────────────

export function formatAnalysis(data: TickerData, aiText: string): string {
  const { indicators: ind } = data;
  const { bollinger: bb } = ind;

  const macdDir = ind.macdBullish ? "📈 Bullish Crossover" : "📉 Bearish Crossover";

  let bbStatus: string;
  if (data.price > bb.upper) bbStatus = "🔴 Above Upper Band";
  else if (data.price < bb.lower) bbStatus = "🟢 Below Lower Band";
  else bbStatus = "🟡 Within Bands";

  const changeIcon = data.changePct >= 0 ? "🟢" : "🔴";

  return [
    `📊 *${escape(data.symbol)}* — ${escape(data.name)}`,
    "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
    "",
    `💰 *Price:* \`$${escape(String(data.price))}\`  ${changeIcon} \`${escape(String(data.changePct))}%\``,
    `📦 *Sector:* ${escape(data.sector)}`,
    "",
    "─── *Technical Indicators* ───",
    `  RSI\\(14\\): \`${escape(String(ind.rsi))}\` → ${escape(ind.rsiSignal)}`,
    `  MACD: \`${escape(String(ind.macd))}\` / Signal: \`${escape(String(ind.macdSignal))}\` → ${macdDir}`,
    `  Bollinger: \`${escape(String(bb.lower))}\` ─ \`${escape(String(bb.middle))}\` ─ \`${escape(String(bb.upper))}\` → ${bbStatus}`,
    "",
    "─── *Support & Resistance* ───",
    `  🟢 Support\\(20d\\): \`$${escape(String(data.support))}\``,
    `  🔴 Resistance\\(20d\\): \`$${escape(String(data.resistance))}\``,
    "",
    "─── *🤖 AI Analysis* ───",
    escape(aiText),
  ].join("\n");
}

// ─── Market Movers ───────────────────────────────────────────

export function formatMovers(movers: MarketMover[], category: string): string {
  const title = category === "gainers" ? "🔥 Top Gainers" : "📉 Top Losers";
  const lines: string[] = [
    `${title} — Today`,
    "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
    "",
  ];

  if (movers.length === 0) {
    lines.push("_Data is currently unavailable\\._");
    return lines.join("\n");
  }

  movers.forEach((m, i) => {
    const icon = m.changePct >= 0 ? "🟢" : "🔴";
    lines.push(
      `  ${escape(String(i + 1))}\\. *${escape(m.symbol)}* — ${escape(m.name)}`,
      `      \`$${escape(String(m.price))}\` ${icon} \`${escape(String(m.changePct))}%\``
    );
  });

  lines.push(
    "",
    "⚠️ _US market data\\. Use `/analyze <ticker>` for details\\._"
  );
  return lines.join("\n");
}

// ─── Watchlist ───────────────────────────────────────────────

export function formatWatchlist(
  tickers: string[],
  prices: Record<string, WatchlistPriceSnapshot>
): string {
  const lines: string[] = [
    "📋 *Your Watchlist*",
    "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
    "",
  ];

  if (tickers.length === 0) {
    lines.push(
      "_Watchlist is empty\\._",
      "_Use `/watch <ticker>` to add one\\._"
    );
    return lines.join("\n");
  }

  tickers.forEach((t) => {
    const info = prices[t];
    if (info) {
      const icon = info.changePct >= 0 ? "🟢" : "🔴";
      lines.push(
        `  • *${escape(t)}* — \`$${escape(String(info.price))}\` ${icon} \`${escape(String(info.changePct))}%\``
      );
    } else {
      lines.push(`  • *${escape(t)}* — _data unavailable_`);
    }
  });

  lines.push("", "💡 _Use `/analyze <ticker>` for detailed analysis\\._");
  return lines.join("\n");
}

// ─── Alerts ──────────────────────────────────────────────────

export function formatAlerts(alerts: PriceAlert[]): string {
  const lines: string[] = [
    "🔔 *Your Active Alerts*",
    "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
    "",
  ];

  if (alerts.length === 0) {
    lines.push(
      "_No active alerts\\._",
      "_Use `/alert <ticker> above/below <price>`\\._"
    );
    return lines.join("\n");
  }

  alerts.forEach((a) => {
    const condIcon = a.condition === "above" ? "📈" : "📉";
    lines.push(
      `  ${condIcon} *${escape(a.ticker)}* — ${escape(a.condition)} \`$${escape(String(a.price))}\``,
      `      ID: \`${a.id}\` | Created: ${escape(a.createdAt.slice(0, 10))}`
    );
  });

  lines.push("", "💡 _Delete alert: `/delalert <id>`_");
  return lines.join("\n");
}

export function formatAlertTriggered(alert: PriceAlert, currentPrice: number): string {
  const condIcon = alert.condition === "above" ? "📈" : "📉";
  return [
    "🔔 *Alert Triggered\\!*",
    "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
    "",
    `  ${condIcon} *${escape(alert.ticker)}* has gone ${escape(alert.condition)} \`$${escape(String(alert.price))}\``,
    `  💰 Current price: \`$${escape(String(Math.round(currentPrice * 100) / 100))}\``,
    "",
    "  _This alert will be automatically removed\\._",
    "",
    `📊 _Use \`/analyze ${escape(alert.ticker)}\` for full analysis\\._`,
  ].join("\n");
}

// ─── News ────────────────────────────────────────────────────

export function formatNews(symbol: string, news: NewsItem[]): string {
  const lines: string[] = [
    `📰 *News — ${escape(symbol)}*`,
    "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
    "",
  ];

  if (news.length === 0) {
    lines.push("_No news found\\._");
    return lines.join("\n");
  }

  news.forEach((item, i) => {
    lines.push(`  ${escape(String(i + 1))}\\. *${escape(item.title)}*`);
    if (item.url) {
      lines.push(`      [Read →](${item.url})`);
    }
    lines.push("");
  });

  return lines.join("\n");
}

// ─── Error & Loading ─────────────────────────────────────────

export function formatError(msg: string): string {
  return `❌ *Error*\n${escape(msg)}`;
}

export function formatLoading(): string {
  return "⏳ _Fetching data\\.\\.\\._";
}
