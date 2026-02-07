# 🦀 MarketClaw — AI Investment Analysis Bot (TypeScript)

Telegram bot for global stock & crypto market analysis, powered by AI technical analysis. Built with **TypeScript + Node.js**.

---

## 🦀 Features

| Feature | Command |
|---|---|
| Technical analysis + AI | `/analyze AAPL` |
| Top gainers today | `/movers` |
| Top losers today | `/losers` |
| Latest news | `/news AAPL` |
| Personal watchlist | `/watch`, `/unwatch`, `/watchlist` |
| Automatic price alerts | `/alert AAPL below 220` |

---

## 🦀 Requirements

- **Node.js 18+** (latest LTS recommended)
- **npm** or **pnpm**
- **Telegram Bot Token** (from [@BotFather](https://t.me/BotFather))
- **Anthropic API Key** (from [console.anthropic.com](https://console.anthropic.com))

---

## 🦀 Setup & Run

### 1. Download / Clone the project

```bash
cd marketclaw
```

### 2. Install dependencies

```bash
npm install
```

### 3. Get a Telegram Bot Token

1. Open Telegram, search for **@BotFather**
2. Type `/newbot`
3. Follow the instructions — provide a name and username for your bot
4. Copy the **token** provided (e.g. `123456789:ABCdefGhIjKlMnOpQrStUvWxYz`)

### 4. Get an Anthropic API Key

1. Go to [console.anthropic.com](https://console.anthropic.com)
2. Log in / create an account
3. Navigate to **API Keys** → create a new key
4. Copy the key

### 5. Create a `.env` file

```bash
cp .env.example .env
```

Edit `.env` and fill in:

```env
TELEGRAM_BOT_TOKEN=123456789:ABCdefGhIjKlMnOpQrStUvWxYz
ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxxxxxxxxxxxxxx
```

### 6. Build & Run

```bash
# Build TypeScript → JavaScript
npm run build

# Run the bot
npm start
```

Or for development (no auto-reload, but no build step needed):

```bash
npm run dev
```

You should see:
```
✅ Environment variables OK
[alerts] Scheduler started — checking every 5 minutes.
🦀 MarketClaw bot started. Waiting for messages...
```

### 7. Test on Telegram

Open a chat with your bot and type:
```
/start
```

---

## 🦀 Project Structure

```
marketclaw/
├── src/
│   ├── main.ts                 # Entry point, all command handlers (Telegraf)
│   ├── market.ts               # Fetch data from yahoo-finance, calculate indicators
│   ├── ai_analysis.ts          # Send data to Claude API for analysis
│   ├── formatter.ts            # Format all Telegram messages (Markdown V2)
│   ├── storage.ts              # Save/read watchlists & alerts (local JSON)
│   ├── alerts_scheduler.ts     # Background polling to check price alerts
│   └── types.ts                # All TypeScript interfaces & types
├── package.json
├── tsconfig.json
├── .env.example
├── .env                        # Your env variable values (do not commit!)
├── .gitignore
└── data/                       # Auto-created folder for storage
    ├── watchlists.json
    └── alerts.json
```

---

## 🦀 Usage Examples

```
/analyze AAPL          → Technical analysis of Apple + AI interpretation
/analyze BTC-USD       → Bitcoin analysis
/analyze NVDA          → NVIDIA analysis
/movers                → Top 10 gaining stocks today
/losers                → Top 10 losing stocks today
/news TSLA             → Latest Tesla news
/watch AAPL            → Add Apple to your watchlist
/watchlist             → View all tickers in your watchlist + current prices
/alert AAPL below 220  → Get notified when AAPL drops below $220
/alert BTC-USD above 100000  → Get notified when BTC rises above $100k
/alerts                → View all active alerts
/delalert 1738412345678  → Delete an alert by ID
```

---

## 🦀 npm Scripts

| Script | Description |
|---|---|
| `npm run build` | Compile TypeScript → `dist/` |
| `npm start` | Run from `dist/main.js` (production) |
| `npm run dev` | Run directly from TypeScript via `ts-node` |

---

## 🦀 Important Notes

- **This is not investment advice.** Always do your own research before making investment decisions.
- Stock data comes from **yahoo-finance** (Yahoo Finance). Data accuracy and availability depend on the source.
- Price alerts are checked every **5 minutes**. Captured prices may not be exact real-time.
- `.env` file should **never be committed** to git — it's already listed in `.gitignore`.

---

## 🦀 Troubleshooting

| Issue | Solution |
|---|---|
| `❌ TELEGRAM_BOT_TOKEN is not set` | Check that your `.env` is filled in correctly |
| `❌ ANTHROPIC_API_KEY is not set` | Check your `.env` and make sure the key is valid |
| Ticker not found | Try standard formats: `AAPL`, `BTC-USD`, `EURUSD=X` |
| AI analysis unavailable | Check your internet connection and Anthropic API key validity |
| Alert not triggering | Wait up to 5 minutes. Check `/alerts` to confirm the alert is active |
| `Cannot find module` on build | Run `npm install` first |
