import { Router, type IRouter } from "express";
import { db, metricsTable, insightsTable, alertsTable, forecastsTable } from "@workspace/db";
import { desc, eq, and, gte, sql } from "drizzle-orm";
import { asyncHandler } from "../middlewares/error-handler";

const router: IRouter = Router();

function computeSubScore(
  values: number[],
  target: number,
  lowerIsBetter = false
): number {
  if (!values.length) return 75;
  const avg = values.reduce((s, v) => s + v, 0) / values.length;
  const ratio = lowerIsBetter ? target / Math.max(avg, 1) : avg / Math.max(target, 1);
  return Math.min(100, Math.max(0, Math.round(ratio * 100)));
}

function trendDir(recent: number[], older: number[]): "up" | "down" | "stable" {
  if (!recent.length || !older.length) return "stable";
  const rAvg = recent.reduce((s, v) => s + v, 0) / recent.length;
  const oAvg = older.reduce((s, v) => s + v, 0) / older.length;
  const delta = (rAvg - oAvg) / Math.max(oAvg, 1);
  if (delta > 0.03) return "up";
  if (delta < -0.03) return "down";
  return "stable";
}

router.get("/dashboard", asyncHandler(async (req, res): Promise<void> => {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const sixtyDaysAgo = new Date();
  sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

  const allMetrics = await db
    .select()
    .from(metricsTable)
    .where(gte(metricsTable.date, sixtyDaysAgo.toISOString().split("T")[0]));

  // Sales sub-score
  const salesRecent = allMetrics
    .filter((m) => m.category === "sales" && m.date >= thirtyDaysAgo.toISOString().split("T")[0])
    .map((m) => Number(m.value));
  const salesOlder = allMetrics
    .filter((m) => m.category === "sales" && m.date < thirtyDaysAgo.toISOString().split("T")[0])
    .map((m) => Number(m.value));
  const salesScore = computeSubScore(salesRecent, 65000);

  // Inventory sub-score
  const invMetrics = allMetrics.filter((m) => m.category === "inventory");
  const totalStock = invMetrics.reduce((s, m) => s + Number(m.value), 0);
  const inventoryScore = Math.min(100, Math.max(0, Math.round((totalStock / 1500) * 100)));

  // Finance sub-score
  const financeMetrics = allMetrics.filter((m) => m.category === "finance" && m.metricName === "Monthly Expenses");
  const latestExpense = financeMetrics.length ? Number(financeMetrics[financeMetrics.length - 1].value) : 190000;
  const financeScore = computeSubScore([latestExpense], 190000, true);

  // Customer sub-score
  const custRetention = allMetrics
    .filter((m) => m.category === "customer" && m.metricName === "Retention Rate")
    .sort((a, b) => (a.date > b.date ? 1 : -1));
  const latestRetention = custRetention.length ? Number(custRetention[custRetention.length - 1].value) : 78;
  const customerScore = Math.round(latestRetention);

  // Operations sub-score
  const opsMetrics = allMetrics.filter((m) => m.category === "operations" && m.metricName === "Avg Fulfillment Time");
  const latestFulfillment = opsMetrics.length ? Number(opsMetrics[opsMetrics.length - 1].value) : 30;
  const operationsScore = computeSubScore([latestFulfillment], 20, true);

  const overall = Math.round((salesScore + inventoryScore + financeScore + customerScore + operationsScore) / 5);

  const topInsights = await db
    .select()
    .from(insightsTable)
    .orderBy(desc(insightsTable.generatedAt))
    .limit(3);

  const topAlerts = await db
    .select()
    .from(alertsTable)
    .where(eq(alertsTable.isRead, false))
    .orderBy(desc(alertsTable.triggeredAt))
    .limit(3);

  // Forecast preview
  const today = new Date().toISOString().split("T")[0];
  const forecastPreview = [];
  for (const metric of ["sales", "inventory", "expenses", "cashflow"]) {
    const row = await db
      .select()
      .from(forecastsTable)
      .where(
        and(
          eq(forecastsTable.metricName, metric),
          eq(forecastsTable.isHistorical, false),
          gte(forecastsTable.forecastDate, today)
        )
      )
      .orderBy(forecastsTable.forecastDate)
      .limit(1);

    if (row.length) {
      const labels: Record<string, string> = { sales: "7-Day Sales", inventory: "Inventory", expenses: "Expenses", cashflow: "Cashflow" };
      const units: Record<string, string> = { sales: "INR", inventory: "units", expenses: "INR", cashflow: "INR" };
      forecastPreview.push({
        metric: labels[metric],
        value: Number(row[0].predictedValue).toLocaleString("en-IN"),
        unit: units[metric],
        confidence: Number(row[0].confidencePercent),
        trend: metric === "sales" || metric === "cashflow" ? "up" : metric === "inventory" ? "down" : "stable",
      });
    }
  }

  // Sales last 7 days sparkline
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const salesLast7 = await db
    .select()
    .from(metricsTable)
    .where(
      and(
        eq(metricsTable.category, "sales"),
        gte(metricsTable.date, sevenDaysAgo.toISOString().split("T")[0])
      )
    )
    .orderBy(metricsTable.date)
    .limit(7);

  res.json({
    healthScore: {
      overall,
      sales: { score: salesScore, trend: trendDir(salesRecent, salesOlder), label: "Sales" },
      inventory: { score: inventoryScore, trend: inventoryScore < 60 ? "down" : "stable", label: "Inventory" },
      finance: { score: financeScore, trend: financeScore < 70 ? "down" : "stable", label: "Finance" },
      customer: { score: customerScore, trend: "down", label: "Customer" },
      operations: { score: operationsScore, trend: "down", label: "Operations" },
      summary: `Arjun General Store is operating at ${overall}/100. Critical attention needed on inventory restocking and customer re-engagement.`,
    },
    topInsights: topInsights.map((i) => ({
      ...i,
      generatedAt: i.generatedAt.toISOString(),
    })),
    topAlerts: topAlerts.map((a) => ({
      ...a,
      metricValue: Number(a.metricValue),
      threshold: Number(a.threshold),
      triggeredAt: a.triggeredAt.toISOString(),
    })),
    forecastPreview,
    salesLast7Days: salesLast7.map((m) => ({ date: m.date, value: Number(m.value) })),
  });
}));

export default router;
