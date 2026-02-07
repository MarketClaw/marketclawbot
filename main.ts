// main.ts — Entry point. Telegram bot via Telegraf.
//
// Commands:
//   /start | /help     — Help menu
//   /analyze <ticker>  — Technical analysis + AI
//   /movers            — Top 10 gainers
//   /losers            — Top 10 losers
//   /news <ticker>     — Latest news
//   /watch <ticker>    — Add to watchlist
//   /unwatch <ticker>  — Remove from watchlist
//   /watchlist         — View watchlist
//   /alert <ticker> above|below <price>  — Set price alert
//   /alerts            — View active alerts
//   /delalert <id>     — Delete alert

import dotenv from "dotenv";
dotenv.config();

import { Telegraf } from "telegraf";
import { getTickerData, getMarketMovers, getNews, getCurrentPrice } from "./market";
import { analyzeTicker } from "./ai_analysis";
import * as storage from "./storage";
import * as fmt from "./formatter";
import { startAlertScheduler } from "./alerts_scheduler";
import { AlertCondition } from "./types";

// ─── Validation ──────────────────────────────────────────────

function validateEnv(): void {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!token || token === "your_telegram_bot_token_here") {
    console.error("❌ TELEGRAM_BOT_TOKEN is not set. Check your .env file.");
    process.exit(1);
  }
  if (!apiKey || apiKey === "your_anthropic_api_key_here") {
    console.error("❌ ANTHROPIC_API_KEY is not set. Check your .env file.");
    process.exit(1);
  }
  console.log("✅ Environment variables OK");
}

// ─── Helper ──────────────────────────────────────────────────

function getArgs(text: string): string[] {
  const parts = text.trim().split(/\s+/);
  return parts.slice(1); // remove the command itself
}

// ─── Main ────────────────────────────────────────────────────

async function main(): Promise<void> {
  validateEnv();

  const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN!);

  // ── /start ─────────────────────────────────────────────────
  bot.command("start", async (ctx) => {
    await ctx.reply(fmt.formatHelp(), { parse_mode: "MarkdownV2" });
  });

  // ── /help ──────────────────────────────────────────────────
  bot.command("help", async (ctx) => {
    await ctx.reply(fmt.formatHelp(), { parse_mode: "MarkdownV2" });
  });

  // ── /analyze <ticker> ──────────────────────────────────────
  bot.command("analyze", async (ctx) => {
    const args = getArgs(ctx.message.text);

    if (args.length === 0) {
      await ctx.reply(
        fmt.formatError("Usage: /analyze <ticker>\nExample: /analyze AAPL"),
        { parse_mode: "MarkdownV2" }
      );
      return;
    }

    const ticker = args[0].toUpperCase();
    const loadingMsg = await ctx.reply(fmt.formatLoading(), { parse_mode: "MarkdownV2" });

    const data = await getTickerData(ticker);
    if (!data) {
      await ctx.telegram.editMessageText(
        loadingMsg.chat.id,
        loadingMsg.message_id,
        undefined,
        {
          text: fmt.formatError(`Ticker "${ticker}" not found. Check the ticker symbol.`),
          parse_mode: "MarkdownV2",
        }
      );
      return;
    }

    const aiText = await analyzeTicker(data);
    const msg = fmt.formatAnalysis(data, aiText);

    await ctx.telegram.editMessageText(
      loadingMsg.chat.id,
      loadingMsg.message_id,
      undefined,
      { text: msg, parse_mode: "MarkdownV2" }
    );
  });

  // ── /movers ────────────────────────────────────────────────
  bot.command("movers", async (ctx) => {
    const loadingMsg = await ctx.reply(fmt.formatLoading(), { parse_mode: "MarkdownV2" });
    const movers = await getMarketMovers("gainers", 10);

    await ctx.telegram.editMessageText(
      loadingMsg.chat.id,
      loadingMsg.message_id,
      undefined,
      { text: fmt.formatMovers(movers, "gainers"), parse_mode: "MarkdownV2" }
    );
  });

  // ── /losers ────────────────────────────────────────────────
  bot.command("losers", async (ctx) => {
    const loadingMsg = await ctx.reply(fmt.formatLoading(), { parse_mode: "MarkdownV2" });
    const movers = await getMarketMovers("losers", 10);

    await ctx.telegram.editMessageText(
      loadingMsg.chat.id,
      loadingMsg.message_id,
      undefined,
      { text: fmt.formatMovers(movers, "losers"), parse_mode: "MarkdownV2" }
    );
  });

  // ── /news <ticker> ─────────────────────────────────────────
  bot.command("news", async (ctx) => {
    const args = getArgs(ctx.message.text);

    if (args.length === 0) {
      await ctx.reply(
        fmt.formatError("Usage: /news <ticker>\nExample: /news AAPL"),
        { parse_mode: "MarkdownV2" }
      );
      return;
    }

    const ticker = args[0].toUpperCase();
    const loadingMsg = await ctx.reply(fmt.formatLoading(), { parse_mode: "MarkdownV2" });
    const news = await getNews(ticker, 5);

    await ctx.telegram.editMessageText(
      loadingMsg.chat.id,
      loadingMsg.message_id,
      undefined,
      { text: fmt.formatNews(ticker, news), parse_mode: "MarkdownV2" }
    );
  });

  // ── /watch <ticker> ────────────────────────────────────────
  bot.command("watch", async (ctx) => {
    const args = getArgs(ctx.message.text);
    const userId = ctx.from.id;

    if (args.length === 0) {
      await ctx.reply(
        fmt.formatError("Usage: /watch <ticker>\nExample: /watch AAPL"),
        { parse_mode: "MarkdownV2" }
      );
      return;
    }

    const ticker = args[0].toUpperCase();
    const added = storage.addToWatchlist(userId, ticker);

    if (added) {
      await ctx.reply(
        `✅ *${fmt.escape(ticker)}* added to your watchlist\\.\n\nUse /watchlist to view all\\.`,
        { parse_mode: "MarkdownV2" }
      );
    } else {
      await ctx.reply(
        `ℹ️ *${fmt.escape(ticker)}* is already in your watchlist\\.`,
        { parse_mode: "MarkdownV2" }
      );
    }
  });

  // ── /unwatch <ticker> ──────────────────────────────────────
  bot.command("unwatch", async (ctx) => {
    const args = getArgs(ctx.message.text);
    const userId = ctx.from.id;

    if (args.length === 0) {
      await ctx.reply(
        fmt.formatError("Usage: /unwatch <ticker>\nExample: /unwatch AAPL"),
        { parse_mode: "MarkdownV2" }
      );
      return;
    }

    const ticker = args[0].toUpperCase();
    const removed = storage.removeFromWatchlist(userId, ticker);

    if (removed) {
      await ctx.reply(
        `✅ *${fmt.escape(ticker)}* removed from your watchlist\\.`,
        { parse_mode: "MarkdownV2" }
      );
    } else {
      await ctx.reply(
        `ℹ️ *${fmt.escape(ticker)}* was not found in your watchlist\\.`,
        { parse_mode: "MarkdownV2" }
      );
    }
  });

  // ── /watchlist ─────────────────────────────────────────────
  bot.command("watchlist", async (ctx) => {
    const userId = ctx.from.id;
    const tickers = storage.getWatchlist(userId);

    if (tickers.length === 0) {
      await ctx.reply(fmt.formatWatchlist([], {}), { parse_mode: "MarkdownV2" });
      return;
    }

    const loadingMsg = await ctx.reply(fmt.formatLoading(), { parse_mode: "MarkdownV2" });

    // Fetch prices for all tickers in parallel
    const prices: Record<string, { price: number; changePct: number }> = {};
    await Promise.allSettled(
      tickers.map(async (t) => {
        const data = await getTickerData(t);
        if (data) {
          prices[t] = { price: data.price, changePct: data.changePct };
        }
      })
    );

    await ctx.telegram.editMessageText(
      loadingMsg.chat.id,
      loadingMsg.message_id,
      undefined,
      { text: fmt.formatWatchlist(tickers, prices), parse_mode: "MarkdownV2" }
    );
  });

  // ── /alert <ticker> above|below <price> ────────────────────
  bot.command("alert", async (ctx) => {
    const args = getArgs(ctx.message.text);
    const userId = ctx.from.id;

    if (args.length < 3) {
      await ctx.reply(
        fmt.formatError(
          "Usage: /alert <ticker> above|below <price>\n\n" +
          "Examples:\n  /alert AAPL below 220\n  /alert BTC-USD above 100000"
        ),
        { parse_mode: "MarkdownV2" }
      );
      return;
    }

    const ticker = args[0].toUpperCase();
    const condition = args[1].toLowerCase();
    const priceStr = args[2];

    // Validate condition
    if (condition !== "above" && condition !== "below") {
      await ctx.reply(
        fmt.formatError("Condition must be `above` or `below`."),
        { parse_mode: "MarkdownV2" }
      );
      return;
    }

    // Validate price
    const price = parseFloat(priceStr);
    if (isNaN(price)) {
      await ctx.reply(
        fmt.formatError(`Invalid price: "${priceStr}". Use a number.\nExample: 220 or 99999.99`),
        { parse_mode: "MarkdownV2" }
      );
      return;
    }

    // Check if ticker is valid
    const currentPrice = await getCurrentPrice(ticker);
    if (currentPrice === null) {
      await ctx.reply(
        fmt.formatError(`Ticker "${ticker}" not found. Check the ticker symbol.`),
        { parse_mode: "MarkdownV2" }
      );
      return;
    }

    // Save the alert
    const alert = storage.addAlert(userId, ticker, condition as AlertCondition, price);
    const condIcon = condition === "above" ? "📈" : "📉";

    await ctx.reply(
      [
        "🔔 *Alert Successfully Created\\!*",
        "",
        `  ${condIcon} *${fmt.escape(ticker)}* — notify when ${condition} \`$${fmt.escape(String(price))}\``,
        `  💰 Current price: \`$${fmt.escape(String(Math.round(currentPrice * 100) / 100))}\``,
        `  🆔 Alert ID: \`${alert.id}\``,
        "",
        `_Delete alert: /delalert ${alert.id}_`,
      ].join("\n"),
      { parse_mode: "MarkdownV2" }
    );
  });

  // ── /alerts ────────────────────────────────────────────────
  bot.command("alerts", async (ctx) => {
    const userId = ctx.from.id;
    const alerts = storage.getAlerts(userId);
    await ctx.reply(fmt.formatAlerts(alerts), { parse_mode: "MarkdownV2" });
  });

  // ── /delalert <id> ─────────────────────────────────────────
  bot.command("delalert", async (ctx) => {
    const args = getArgs(ctx.message.text);
    const userId = ctx.from.id;

    if (args.length === 0) {
      await ctx.reply(
        fmt.formatError("Usage: /delalert <alert_id>\nUse /alerts to see your alert IDs."),
        { parse_mode: "MarkdownV2" }
      );
      return;
    }

    const alertId = parseInt(args[0], 10);
    if (isNaN(alertId)) {
      await ctx.reply(
        fmt.formatError("Alert ID must be a number."),
        { parse_mode: "MarkdownV2" }
      );
      return;
    }

    const removed = storage.removeAlert(userId, alertId);

    if (removed) {
      await ctx.reply(
        `✅ Alert \`${alertId}\` successfully deleted\\.`,
        { parse_mode: "MarkdownV2" }
      );
    } else {
      await ctx.reply(
        fmt.formatError(`Alert ID "${alertId}" not found.`),
        { parse_mode: "MarkdownV2" }
      );
    }
  });

  // ── Start alert scheduler ──────────────────────────────────
  startAlertScheduler(bot);

  // ── Launch ─────────────────────────────────────────────────
  console.log("🦀 MarketClaw bot started. Waiting for messages...");
  bot.launch();

  // Graceful shutdown
  process.on("SIGTERM", () => {
    console.log("[MarketClaw] Shutting down...");
    bot.stop("SIGTERM");
  });
  process.on("SIGINT", () => {
    console.log("[MarketClaw] Shutting down...");
    bot.stop("SIGINT");
  });
}

main();
