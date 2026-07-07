import { pgTable, serial, text, numeric, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const recommendationsTable = pgTable("recommendations", {
  id: serial("id").primaryKey(),
  urgency: text("urgency").notNull(), // high | medium | low
  problemStatement: text("problem_statement").notNull(),
  rootCause: text("root_cause").notNull(),
  action: text("action").notNull(),
  expectedOutcome: text("expected_outcome").notNull(),
  expectedImpactPercent: numeric("expected_impact_percent", { precision: 5, scale: 2 }).notNull().default("0"),
  status: text("status").notNull().default("pending"), // pending | in_progress | done | dismissed
  generatedAt: timestamp("generated_at").defaultNow().notNull(),
});

export const insertRecommendationSchema = createInsertSchema(recommendationsTable).omit({ id: true, generatedAt: true });
export type InsertRecommendation = z.infer<typeof insertRecommendationSchema>;
export type RecommendationRecord = typeof recommendationsTable.$inferSelect;
