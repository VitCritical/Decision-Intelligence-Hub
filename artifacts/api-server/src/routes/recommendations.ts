import { Router, type IRouter } from "express";
import { db, recommendationsTable } from "@workspace/db";
import { desc, eq, and } from "drizzle-orm";
import { ListRecommendationsQueryParams, UpdateRecommendationParams, UpdateRecommendationBody } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/recommendations", async (req, res): Promise<void> => {
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
});

router.patch("/recommendations/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);

  const body = UpdateRecommendationBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const [updated] = await db
    .update(recommendationsTable)
    .set({ status: body.data.status })
    .where(eq(recommendationsTable.id, id))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Recommendation not found" });
    return;
  }

  res.json({
    ...updated,
    expectedImpactPercent: Number(updated.expectedImpactPercent),
    generatedAt: updated.generatedAt.toISOString(),
  });
});

export default router;
