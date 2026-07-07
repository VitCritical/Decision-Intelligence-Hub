import { Router, type IRouter } from "express";
import { db, metricsTable, forecastsTable } from "@workspace/db";
import { and, eq, gte } from "drizzle-orm";
import { generateJSON } from "../lib/gemini";

const router: IRouter = Router();

async function buildForecastSeries(metricName: string, unit: string) {
  const today = new Date().toISOString().split("T")[0];
  const rows = await db
    .select()
    .from(forecastsTable)
    .where(eq(forecastsTable.metricName, metricName))
    .orderBy(forecastsTable.forecastDate);

  const points = rows.map((r) => ({
    forecastDate: r.forecastDate,
    predictedValue: Number(r.predictedValue),
    confidencePercent: Number(r.confidencePercent),
    lowerBound: Number(r.lowerBound),
    upperBound: Number(r.upperBound),
    isHistorical: r.isHistorical,
  }));

  const futurePoints = points.filter((p) => !p.isHistorical);
  const overallConfidence =
    futurePoints.length
      ? futurePoints.reduce((s, p) => s + p.confidencePercent, 0) / futurePoints.length
      : 85;

  const commentaries: Record<string, string> = {
    sales: "Sales are projected to recover over the next 14 days as inventory is restocked. Weekend uplift pattern continues. Implementing customer re-engagement campaigns could add 8-12% to projected figures.",
    inventory: "Total inventory levels are expected to decline without immediate restocking action. 3 SKUs will reach zero within 4 days. Restocking Product A, C, and D will stabilize the forecast.",
    expenses: "Operating expenses are forecast to remain elevated for the next two weeks due to emergency restocking costs. Expected to normalize in week 3 if no further stockouts occur.",
    cashflow: "Cash flow is projected to improve steadily as sales recover post-restocking. Maintaining current expense discipline will support this trajectory.",
  };

  return {
    metricName,
    unit,
    overallConfidence: Math.round(overallConfidence),
    aiCommentary: commentaries[metricName] || "Forecast based on historical patterns.",
    points,
  };
}

router.get("/forecast", async (req, res): Promise<void> => {
  const [sales, inventory, expenses, cashflow] = await Promise.all([
    buildForecastSeries("sales", "INR"),
    buildForecastSeries("inventory", "units"),
    buildForecastSeries("expenses", "INR"),
    buildForecastSeries("cashflow", "INR"),
  ]);

  res.json({
    sales,
    inventory,
    expenses,
    cashflow,
    generatedAt: new Date().toISOString(),
  });
});

router.post("/forecast/generate", async (req, res): Promise<void> => {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const salesMetrics = await db
    .select()
    .from(metricsTable)
    .where(
      and(
        eq(metricsTable.category, "sales"),
        gte(metricsTable.date, thirtyDaysAgo.toISOString().split("T")[0])
      )
    )
    .orderBy(metricsTable.date);

  const salesData = salesMetrics.map((m) => `${m.date}: ${m.value}`).join(", ");

  const prompt = `You are a business forecasting expert. Based on this 30-day sales data for a retail store:
${salesData}

Generate a 7-day sales forecast. Return a JSON object with:
- commentary: 2 sentences about the forecast outlook
- confidence: overall confidence percentage (0-100)
- dailyForecast: array of 7 objects with: date (YYYY-MM-DD starting tomorrow), predicted, lower, upper

Return ONLY valid JSON.`;

  type ForecastAI = { commentary: string; confidence: number; dailyForecast: Array<{ date: string; predicted: number; lower: number; upper: number }> };

  const forecast = await generateJSON<ForecastAI>(prompt);

  // Update DB forecasts
  await db.delete(forecastsTable);

  const rows: Array<typeof forecastsTable.$inferInsert> = forecast.dailyForecast.map((d) => ({
    metricName: "sales",
    unit: "INR",
    forecastDate: d.date,
    predictedValue: d.predicted.toFixed(2),
    confidencePercent: forecast.confidence.toFixed(2),
    lowerBound: d.lower.toFixed(2),
    upperBound: d.upper.toFixed(2),
    isHistorical: false,
  }));

  await db.insert(forecastsTable).values(rows);

  const [sales, inventory, expenses, cashflow] = await Promise.all([
    buildForecastSeries("sales", "INR"),
    buildForecastSeries("inventory", "units"),
    buildForecastSeries("expenses", "INR"),
    buildForecastSeries("cashflow", "INR"),
  ]);

  res.json({
    sales,
    inventory,
    expenses,
    cashflow,
    generatedAt: new Date().toISOString(),
  });
});

export default router;
