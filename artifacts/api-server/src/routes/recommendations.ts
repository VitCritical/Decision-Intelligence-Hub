import { Router, type IRouter } from "express";
import { db, recommendationsTable, metricsTable } from "@workspace/db";
import { desc, eq, and, gte } from "drizzle-orm";
import { ListRecommendationsQueryParams, UpdateRecommendationParams, UpdateRecommendationBody } from "@workspace/api-zod";
import { asyncHandler, HttpError } from "../middlewares/error-handler";
import { generateJSON } from "../lib/gemini";

const router: IRouter = Router();

router.get("/recommendations", asyncHandler(async (req, res): Promise<void> => {
  const query = ListRecommendationsQueryParams.safeParse(req.query);
  const conditions = [];

  if (query.success && query.data.urgency) {
    conditions.push(eq(recommendationsTable.urgency, query.data.urgency));
  }
  if (query.success && query.data.status) {
    conditions.push(eq(recommendationsTable.status, query.data.status));
  }

  const rows = await db
    .select()
    .from(recommendationsTable)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(recommendationsTable.generatedAt));

  res.json(
    rows.map((r) => ({
      ...r,
      expectedImpactPercent: Number(r.expectedImpactPercent),
      generatedAt: r.generatedAt.toISOString(),
    }))
  );
}));

router.post("/recommendations/generate", asyncHandler(async (req, res): Promise<void> => {
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

  const prompt = `You are a senior business decisions consultant for a small retail store called "Arjun General Store" in India.
Analyze these business metrics from the last 30 days and generate 3 specific, highly-actionable, urgent business recommendations.

METRICS DATA:
${summary}

Return a JSON array of exactly 3 recommendations. Each recommendation must have:
- urgency: "high", "medium", or "low"
- problemStatement: 1 concise sentence describing the problem/opportunity
- rootCause: 1 sentence identifying the root cause
- action: 1-2 sentences with concrete steps to take
- expectedOutcome: 1 sentence describing what will happen if implemented
- expectedImpactPercent: estimated numeric percentage of daily revenue or expense impact (number between 0 and 100, e.g. 5.5)

Return ONLY valid JSON array, no markdown.`;

  type RecommendationAI = {
    urgency: "high" | "medium" | "low";
    problemStatement: string;
    rootCause: string;
    action: string;
    expectedOutcome: string;
    expectedImpactPercent: number;
  };

  const generated = await generateJSON<RecommendationAI[]>(prompt);

  const inserted = await db
    .insert(recommendationsTable)
    .values(
      generated.map((g) => ({
        urgency: g.urgency,
        problemStatement: g.problemStatement,
        rootCause: g.rootCause,
        action: g.action,
        expectedOutcome: g.expectedOutcome,
        expectedImpactPercent: g.expectedImpactPercent.toFixed(2),
        status: "pending",
      }))
    )
    .returning();

  res.json(
    inserted.map((r) => ({
      ...r,
      expectedImpactPercent: Number(r.expectedImpactPercent),
      generatedAt: r.generatedAt.toISOString(),
    }))
  );
}));

router.patch("/recommendations/:id", asyncHandler(async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);

  if (Number.isNaN(id) || id <= 0) {
    throw new HttpError(400, "Invalid recommendation ID — must be a positive integer");
  }

  const body = UpdateRecommendationBody.safeParse(req.body);
  if (!body.success) {
    throw new HttpError(400, body.error.message);
  }

  const [updated] = await db
    .update(recommendationsTable)
    .set({ status: body.data.status })
    .where(eq(recommendationsTable.id, id))
    .returning();

  if (!updated) {
    throw new HttpError(404, "Recommendation not found");
  }

  res.json({
    ...updated,
    expectedImpactPercent: Number(updated.expectedImpactPercent),
    generatedAt: updated.generatedAt.toISOString(),
  });
}));

export default router;
