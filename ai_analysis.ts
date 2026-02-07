// ai_analysis.ts — Sends ticker data to Claude for AI-powered interpretation.

import Anthropic from "@anthropic-ai/sdk";
import { TickerData } from "./types";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const SYSTEM_PROMPT = `You are MarketClaw, a concise financial market analyst assistant.
Your job is to interpret technical indicator data and provide a SHORT, clear analysis.

Rules:
- Be concise. Max 3-4 sentences.
- Focus on what the indicators suggest (trend direction, momentum, volatility).
- Mention RSI, MACD, and Bollinger Band signals briefly.
- End with a one-line "Overall Sentiment" that is one of: 🟢 Bullish | 🔴 Bearish | 🟡 Neutral | 🟠 Cautious
- ALWAYS include this disclaimer at the end: "⚠️ This is not investment advice. Always do your own research before making any decisions."
- Reply in the same language as the user's input. If unsure, use English.`;

export async function analyzeTicker(data: TickerData): Promise<string> {
  const { indicators: ind, price } = data;
  const { bollinger: bb } = ind;

  let bollingerPosition: string;
  if (price > bb.upper) bollingerPosition = "Above upper band (overbought zone)";
  else if (price < bb.lower) bollingerPosition = "Below lower band (oversold zone)";
  else bollingerPosition = "Within bands (normal range)";

  const prompt = `Analyze the following ticker data and provide a short market interpretation:

Ticker: ${data.symbol} (${data.name})
Current Price: $${data.price}
Change Today: ${data.changePct}%
Sector: ${data.sector}

Technical Indicators:
- RSI (14): ${ind.rsi} → ${ind.rsiSignal}
- MACD Line: ${ind.macd}
- MACD Signal: ${ind.macdSignal}
- MACD Crossover: ${ind.macdBullish ? "Bullish" : "Bearish"}
- Bollinger Bands: Upper ${bb.upper} | Middle ${bb.middle} | Lower ${bb.lower}
- 20-Day Support: $${data.support}
- 20-Day Resistance: $${data.resistance}

Current price vs Bollinger: ${bollingerPosition}`;

  try {
    const message = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 300,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: prompt }],
    });

    const content = message.content[0];
    if (content.type === "text") return content.text;
    return "⚠️ Unexpected response format from AI.";
  } catch (e) {
    return `⚠️ AI analysis is currently unavailable: ${e}`;
  }
}
