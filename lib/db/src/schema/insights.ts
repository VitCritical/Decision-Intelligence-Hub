import { pgTable, serial, text, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const insightsTable = pgTable("insights", {
  id: serial("id").primaryKey(),
  severity: text("severity").notNull(), // critical | warning | positive
  category: text("category").notNull(),
  title: text("title").notNull(),
  explanation: text("explanation").notNull(),
  relatedMetric: text("related_metric"),
  generatedAt: timestamp("generated_at").defaultNow().notNull(),
  isRead: boolean("is_read").default(false).notNull(),
});

export const insertInsightSchema = createInsertSchema(insightsTable).omit({ id: true, generatedAt: true });
export type InsertInsight = z.infer<typeof insertInsightSchema>;
export type InsightRecord = typeof insightsTable.$inferSelect;
