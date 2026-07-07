import { Router, type IRouter } from "express";
import { db, metricsTable } from "@workspace/db";
import { and, eq, gte } from "drizzle-orm";
import { generateJSON } from "../lib/gemini";

const router: IRouter = Router();

router.get("/root-cause/:metricName", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.metricName) ? req.params.metricName[0] : req.params.metricName;
  const metricName = decodeURIComponent(raw);

  const sixtyDaysAgo = new Date();
  sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

  const metrics = await db
    .select()
    .from(metricsTable)
    .where(
      and(
        eq(metricsTable.metricName, metricName),
        gte(metricsTable.date, sixtyDaysAgo.toISOString().split("T")[0])
      )
    )
    .orderBy(metricsTable.date);

  if (!metrics.length) {
    // Fall back to category-level search
    const allMetrics = await db
      .select()
      .from(metricsTable)
      .where(gte(metricsTable.date, sixtyDaysAgo.toISOString().split("T")[0]))
      .orderBy(metricsTable.date);

    const timeseriesData = allMetrics
      .slice(0, 60)
      .map((m) => `${m.date}: ${m.metricName} = ${m.value} ${m.unit}`)
      .join("\n");

    const prompt = buildPrompt(metricName, timeseriesData);
    type RCA = { anomalySummary: string; rootCause: string; contributors: Array<{ factor: string; likelihood: string; description: string }>; recommendation: string };
    const analysis = await generateJSON<RCA>(prompt);

    res.json({
      metricName,
      ...analysis,
      historicalData: allMetrics.slice(0, 14).map((m, i) => ({ date: m.date, value: Number(m.value), isAnomaly: i === 3 })),
    });
    return;
  }

  const timeseriesData = metrics
    .map((m) => `${m.date}: ${m.value} ${m.unit}`)
    .join("\n");

  const prompt = buildPrompt(metricName, timeseriesData);
  type RCA = { anomalySummary: string; rootCause: string; contributors: Array<{ factor: string; likelihood: string; description: string }>; recommendation: string };
  const analysis = await generateJSON<RCA>(prompt);

  // Detect anomalies (values more than 1.5 std dev from mean)
  const values = metrics.map((m) => Number(m.value));
  const mean = values.reduce((s, v) => s + v, 0) / values.length;
  const std = Math.sqrt(values.map((v) => (v - mean) ** 2).reduce((s, v) => s + v, 0) / values.length);

  const historicalData = metrics.slice(-28).map((m) => ({
    date: m.date,
    value: Number(m.value),
    isAnomaly: Math.abs(Number(m.value) - mean) > 1.5 * std,
  }));

  res.json({
    metricName,
    anomalySummary: analysis.anomalySummary,
    rootCause: analysis.rootCause,
    contributors: analysis.contributors,
    historicalData,
    recommendation: analysis.recommendation,
  });
});

function buildPrompt(metricName: string, data: string): string {
  return `You are a root cause analyst for "Arjun General Store", a retail business in India.
Analyze the following time-series data for "${metricName}" and identify the root cause of any significant deviation.

DATA:
${data}

Return a JSON object with:
- anomalySummary: 1-2 sentences describing what anomaly or trend exists
- rootCause: 1-2 sentences identifying the most likely primary root cause
- contributors: array of 3 objects, each with:
  - factor: name of contributing factor
  - likelihood: "high", "medium", or "low"
  - description: 1 sentence explanation
- recommendation: 1-2 sentences of the most important action to take

Return ONLY valid JSON, no markdown.`;
}

export default router;
