import { pgTable, serial, text, numeric, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const alertsTable = pgTable("alerts", {
  id: serial("id").primaryKey(),
  severity: text("severity").notNull(), // critical | warning | info
  title: text("title").notNull(),
  explanation: text("explanation").notNull(),
  metricName: text("metric_name").notNull(),
  metricValue: numeric("metric_value", { precision: 12, scale: 2 }).notNull(),
  threshold: numeric("threshold", { precision: 12, scale: 2 }).notNull(),
  triggeredAt: timestamp("triggered_at").defaultNow().notNull(),
  isRead: boolean("is_read").default(false).notNull(),
});

export const insertAlertSchema = createInsertSchema(alertsTable).omit({ id: true, triggeredAt: true });
export type InsertAlert = z.infer<typeof insertAlertSchema>;
export type AlertRecord = typeof alertsTable.$inferSelect;
