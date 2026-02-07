// storage.ts — Persistent local storage (JSON-based).
// Handles watchlists and price alerts per Telegram user.

import fs from "fs";
import path from "path";
import { PriceAlert, AlertCondition, WatchlistStore, AlertsStore } from "./types";

const DATA_DIR = path.resolve(__dirname, "..", "data");
const WATCHLIST_FILE = path.join(DATA_DIR, "watchlists.json");
const ALERTS_FILE = path.join(DATA_DIR, "alerts.json");

// Ensure data folder exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// ─── Helpers ─────────────────────────────────────────────────

function load<T extends object>(filePath: string): T {
  if (fs.existsSync(filePath)) {
    const raw = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(raw) as T;
  }
  return {} as T;
}

function save(filePath: string, data: object): void {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
}

// ─── Watchlist ───────────────────────────────────────────────

export function getWatchlist(userId: number): string[] {
  const data = load<WatchlistStore>(WATCHLIST_FILE);
  return data[String(userId)] ?? [];
}

export function addToWatchlist(userId: number, ticker: string): boolean {
  const data = load<WatchlistStore>(WATCHLIST_FILE);
  const uid = String(userId);
  const t = ticker.toUpperCase();

  if (!data[uid]) data[uid] = [];
  if (data[uid].includes(t)) return false; // already exists

  data[uid].push(t);
  save(WATCHLIST_FILE, data);
  return true;
}

export function removeFromWatchlist(userId: number, ticker: string): boolean {
  const data = load<WatchlistStore>(WATCHLIST_FILE);
  const uid = String(userId);
  const t = ticker.toUpperCase();

  if (!data[uid] || !data[uid].includes(t)) return false;

  data[uid] = data[uid].filter((item) => item !== t);
  save(WATCHLIST_FILE, data);
  return true;
}

// ─── Price Alerts ────────────────────────────────────────────

export function getAlerts(userId: number): PriceAlert[] {
  const data = load<AlertsStore>(ALERTS_FILE);
  return data[String(userId)] ?? [];
}

export function addAlert(
  userId: number,
  ticker: string,
  condition: AlertCondition,
  price: number
): PriceAlert {
  const data = load<AlertsStore>(ALERTS_FILE);
  const uid = String(userId);

  if (!data[uid]) data[uid] = [];

  const alert: PriceAlert = {
    id: Date.now(),
    ticker: ticker.toUpperCase(),
    condition,
    price,
    createdAt: new Date().toISOString(),
  };

  data[uid].push(alert);
  save(ALERTS_FILE, data);
  return alert;
}

export function removeAlert(userId: number, alertId: number): boolean {
  const data = load<AlertsStore>(ALERTS_FILE);
  const uid = String(userId);

  if (!data[uid]) return false;

  const originalLen = data[uid].length;
  data[uid] = data[uid].filter((a) => a.id !== alertId);
  save(ALERTS_FILE, data);

  return data[uid].length < originalLen;
}

export function getAllAlerts(): AlertsStore {
  return load<AlertsStore>(ALERTS_FILE);
}
