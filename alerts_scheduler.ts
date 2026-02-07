// alerts_scheduler.ts — Background polling for price alerts.
// Checks every 5 minutes, sends Telegram notification when an alert is triggered.

import { Telegraf } from "telegraf";
import { getCurrentPrice } from "./market";
import { getAllAlerts, removeAlert } from "./storage";
import { formatAlertTriggered } from "./formatter";

const CHECK_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

export function startAlertScheduler(bot: Telegraf): void {
  console.log("[alerts] Scheduler started — checking every 5 minutes.");

  setInterval(async () => {
    await checkAlerts(bot);
  }, CHECK_INTERVAL_MS);
}

async function checkAlerts(bot: Telegraf): Promise<void> {
  const allAlerts = getAllAlerts(); // { userId: [alert, ...] }

  for (const [userIdStr, alerts] of Object.entries(allAlerts)) {
    if (alerts.length === 0) continue;

    const alertsToRemove: number[] = [];

    for (const alert of alerts) {
      const currentPrice = await getCurrentPrice(alert.ticker);
      if (currentPrice === null) continue;

      let triggered = false;
      if (alert.condition === "above" && currentPrice >= alert.price) {
        triggered = true;
      } else if (alert.condition === "below" && currentPrice <= alert.price) {
        triggered = true;
      }

      if (triggered) {
        try {
          const msg = formatAlertTriggered(alert, currentPrice);
          await bot.telegram.sendMessage(Number(userIdStr), msg, {
            parse_mode: "MarkdownV2",
          });
          alertsToRemove.push(alert.id);
          console.log(
            `[alerts] Triggered: ${alert.ticker} ${alert.condition} $${alert.price} for user ${userIdStr}`
          );
        } catch (e) {
          console.error(`[alerts] Failed to notify user ${userIdStr}:`, e);
        }
      }
    }

    // Remove triggered alerts
    for (const alertId of alertsToRemove) {
      removeAlert(Number(userIdStr), alertId);
    }
  }
}
