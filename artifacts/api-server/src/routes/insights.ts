import { Router, type IRouter } from "express";
import { db, metricsTable, insightsTable } from "@workspace/db";
import { desc, eq, and, gte } from "drizzle-orm";
import { generateJSON } from "../lib/gemini";
import { ListInsightsQueryParams, MarkInsightReadParams } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/insights", async (req, res): Promise<void> => {
  const query = ListInsightsQueryParams.safeParse(req.query);
  const conditions = [];
  if (query.success && query.data.severity) {
    conditions.push(eq(insightsTable.severity, query.data.severity));
  }
  if (query.success && query.data.category) {
    conditions.push(eq(insightsTable.category, query.data.category));
  }

  const rows = await db
    .select()
    .from(insightsTable)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(insightsTable.generatedAt));

  res.json(rows.map((r) => ({ ...r, generatedAt: r.generatedAt.toISOString() })));
});

router.post("/insights/generate", async (req, res): Promise<void> => {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const metrics = await db
    .select()
    .from(metricsTable)
    .where(gte(metricsTable.date, thirtyDaysAgo.toISOString().split("T")[0]));

  const summary = metrics
    .slice(0, 50)
    .map((m) => `${m.date} | ${m.category} | ${m.metricName}: ${m.value} ${m.unit}`)
    .join("\n");

  const prompt = `You are a business intelligence analyst for a small retail store called "Arjun General Store" in India.
Analyze these business metrics from the last 30 days and generate 5 specific, actionable insights.

METRICS DATA:
${summary}

Return a JSON array of exactly 5 insights. Each insight must have:
- severity: "critical", "warning", or "positive"
- category: one of "sales", "inventory", "finance", "customer", "operations"
- title: concise (max 10 words)
- explanation: 2-3 sentences explaining what happened and what it means for the business
- relatedMetric: the most relevant metric name from the data

Return ONLY valid JSON array, no markdown.`;

  type InsightAI = { severity: string; category: string; title: string; explanation: string; relatedMetric: string };
  const generated = await generateJSON<InsightAI[]>(prompt);

  const inserted = await db
    .insert(insightsTable)
    .values(
      generated.map((g) => ({
        severity: g.severity,
        category: g.category,
        title: g.title,
        explanation: g.explanation,
        relatedMetric: g.relatedMetric,
        isRead: false,
      }))
    )
    .returning();

  res.json(inserted.map((r) => ({ ...r, generatedAt: r.generatedAt.toISOString() })));
});

router.patch("/insights/:id/read", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);

  const [updated] = await db
    .update(insightsTable)
    .set({ isRead: true })
    .where(eq(insightsTable.id, id))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Insight not found" });
    return;
  }

  res.json({ ...updated, generatedAt: updated.generatedAt.toISOString() });
});

export default router;
