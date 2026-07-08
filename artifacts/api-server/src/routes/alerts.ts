import { Router, type IRouter } from "express";
import { db, alertsTable } from "@workspace/db";
import { desc, eq, and } from "drizzle-orm";
import { ListAlertsQueryParams } from "@workspace/api-zod";
import { asyncHandler, HttpError } from "../middlewares/error-handler";

const router: IRouter = Router();

router.get("/alerts", asyncHandler(async (req, res): Promise<void> => {
  const query = ListAlertsQueryParams.safeParse(req.query);
  const conditions = [];

  if (query.success && query.data.severity) {
    conditions.push(eq(alertsTable.severity, query.data.severity));
  }
  if (query.success && query.data.isRead !== undefined) {
    conditions.push(eq(alertsTable.isRead, query.data.isRead));
  }

  const rows = await db
    .select()
    .from(alertsTable)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(alertsTable.triggeredAt));

  res.json(
    rows.map((r) => ({
      ...r,
      metricValue: Number(r.metricValue),
      threshold: Number(r.threshold),
      triggeredAt: r.triggeredAt.toISOString(),
    }))
  );
}));

router.patch("/alerts/read-all", asyncHandler(async (req, res): Promise<void> => {
  await db.update(alertsTable).set({ isRead: true });
  res.json({ success: true, message: "All alerts marked as read" });
}));

router.delete("/alerts/clear", asyncHandler(async (req, res): Promise<void> => {
  await db.delete(alertsTable);
  res.json({ success: true, message: "All alerts cleared" });
}));

router.patch("/alerts/:id/read", asyncHandler(async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);

  if (Number.isNaN(id) || id <= 0) {
    throw new HttpError(400, "Invalid alert ID — must be a positive integer");
  }

  const [updated] = await db
    .update(alertsTable)
    .set({ isRead: true })
    .where(eq(alertsTable.id, id))
    .returning();

  if (!updated) {
    throw new HttpError(404, "Alert not found");
  }

  res.json({
    ...updated,
    metricValue: Number(updated.metricValue),
    threshold: Number(updated.threshold),
    triggeredAt: updated.triggeredAt.toISOString(),
  });
}));

export default router;
