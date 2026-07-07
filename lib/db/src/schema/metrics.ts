import { pgTable, serial, text, numeric, timestamp, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const metricsTable = pgTable("metrics", {
  id: serial("id").primaryKey(),
  date: date("date").notNull(),
  category: text("category").notNull(), // sales | inventory | finance | customer | operations
  metricName: text("metric_name").notNull(),
  value: numeric("value", { precision: 12, scale: 2 }).notNull(),
  unit: text("unit").notNull().default(""),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertMetricSchema = createInsertSchema(metricsTable).omit({ id: true, createdAt: true });
export type InsertMetric = z.infer<typeof insertMetricSchema>;
export type Metric = typeof metricsTable.$inferSelect;
