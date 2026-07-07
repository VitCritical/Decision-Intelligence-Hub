import { pgTable, serial, text, numeric, boolean, timestamp, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const forecastsTable = pgTable("forecasts", {
  id: serial("id").primaryKey(),
  metricName: text("metric_name").notNull(),
  unit: text("unit").notNull().default(""),
  forecastDate: date("forecast_date").notNull(),
  predictedValue: numeric("predicted_value", { precision: 12, scale: 2 }).notNull(),
  confidencePercent: numeric("confidence_percent", { precision: 5, scale: 2 }).notNull(),
  lowerBound: numeric("lower_bound", { precision: 12, scale: 2 }).notNull(),
  upperBound: numeric("upper_bound", { precision: 12, scale: 2 }).notNull(),
  isHistorical: boolean("is_historical").default(false).notNull(),
  generatedAt: timestamp("generated_at").defaultNow().notNull(),
});

export const insertForecastSchema = createInsertSchema(forecastsTable).omit({ id: true, generatedAt: true });
export type InsertForecast = z.infer<typeof insertForecastSchema>;
export type ForecastRecord = typeof forecastsTable.$inferSelect;
