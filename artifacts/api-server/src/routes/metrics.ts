import { Router, type IRouter } from "express";
import { db, metricsTable } from "@workspace/db";
import { and, eq, gte, desc } from "drizzle-orm";
import { ListMetricsQueryParams } from "@workspace/api-zod";
import { seedDatabase } from "../lib/seed";

const router: IRouter = Router();

router.get("/metrics", async (req, res): Promise<void> => {
  const query = ListMetricsQueryParams.safeParse(req.query);
  const conditions = [];

  if (query.success && query.data.category) {
    conditions.push(eq(metricsTable.category, query.data.category));
  }
  if (query.success && query.data.days) {
    const daysAgo = new Date();
    daysAgo.setDate(daysAgo.getDate() - query.data.days);
    conditions.push(gte(metricsTable.date, daysAgo.toISOString().split("T")[0]));
  }

  const rows = await db
    .select()
    .from(metricsTable)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(metricsTable.date))
    .limit(200);

  res.json(
    rows.map((r) => ({
      ...r,
      value: Number(r.value),
    }))
  );
});

router.post("/metrics/seed", async (req, res): Promise<void> => {
  await seedDatabase();
  res.json({ success: true, message: "Database seeded successfully" });
});

export default router;
