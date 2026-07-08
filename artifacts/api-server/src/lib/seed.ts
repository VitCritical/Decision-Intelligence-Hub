import { db } from "@workspace/db";
import {
  metricsTable,
  insightsTable,
  recommendationsTable,
  alertsTable,
  forecastsTable,
  chatMessagesTable,
} from "@workspace/db";
import { logger } from "./logger";

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

function dateStr(d: Date): string {
  return d.toISOString().split("T")[0];
}

function addDays(date: Date, n: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

export async function seedDatabase(): Promise<void> {
  logger.info("Clearing existing database tables...");
  await db.delete(forecastsTable);
  await db.delete(alertsTable);
  await db.delete(recommendationsTable);
  await db.delete(insightsTable);
  await db.delete(chatMessagesTable);
  await db.delete(metricsTable);

  logger.info("Seeding database with mock business data...");

  // ─── Metrics: 90 days of sales ──────────────────────────────────────────────
  const salesData: Array<typeof metricsTable.$inferInsert> = [];
  const today = new Date();

  for (let i = 89; i >= 0; i--) {
    const d = daysAgo(i);
    const dow = d.getDay(); // 0=Sun, 6=Sat
    const isWeekend = dow === 0 || dow === 6;
    const isOutOfStock = i >= 12 && i <= 14; // 3-day dip 12-14 days ago

    let base = isWeekend ? 72000 : 62000;
    if (isOutOfStock) base *= 0.55; // severe dip during stockout
    // Slow decline over last 30 days
    if (i < 30) base *= 1 - (30 - i) * 0.002;
    const noise = (Math.random() - 0.5) * 8000;
    const value = Math.max(0, base + noise);

    salesData.push({
      date: dateStr(d),
      category: "sales",
      metricName: "Daily Revenue",
      value: value.toFixed(2),
      unit: "INR",
    });
  }

  // Inventory metrics
  const products = [
    { name: "Product A (Rice 5kg)", stock: 0, reorder: 50 },
    { name: "Product B (Dal 1kg)", stock: 120, reorder: 40 },
    { name: "Product C (Cooking Oil)", stock: 15, reorder: 30 },
    { name: "Product D (Sugar 1kg)", stock: 8, reorder: 25 },
    { name: "Product E (Tea 250g)", stock: 200, reorder: 60 },
    { name: "Product F (Salt)", stock: 180, reorder: 50 },
    { name: "Product G (Flour 5kg)", stock: 45, reorder: 40 },
    { name: "Product H (Biscuits)", stock: 320, reorder: 80 },
    { name: "Product I (Soap)", stock: 12, reorder: 20 },
    { name: "Product J (Shampoo)", stock: 55, reorder: 30 },
    { name: "Product K (Chips)", stock: 280, reorder: 100 },
    { name: "Product L (Masala)", stock: 90, reorder: 40 },
  ];

  const inventoryData: Array<typeof metricsTable.$inferInsert> = products.map((p) => ({
    date: dateStr(today),
    category: "inventory",
    metricName: p.name,
    value: p.stock.toFixed(2),
    unit: "units",
  }));

  // Finance metrics — last 3 months of expenses
  const financeData: Array<typeof metricsTable.$inferInsert> = [
    { date: dateStr(daysAgo(90)), category: "finance", metricName: "Monthly Expenses", value: "182000", unit: "INR" },
    { date: dateStr(daysAgo(60)), category: "finance", metricName: "Monthly Expenses", value: "191000", unit: "INR" },
    { date: dateStr(daysAgo(30)), category: "finance", metricName: "Monthly Expenses", value: "233000", unit: "INR" }, // spike!
    { date: dateStr(today), category: "finance", metricName: "Monthly Revenue", value: "1820000", unit: "INR" },
    { date: dateStr(today), category: "finance", metricName: "Profit Margin", value: "18.4", unit: "%" },
  ];

  // Customer metrics
  const customerData: Array<typeof metricsTable.$inferInsert> = [
    { date: dateStr(daysAgo(90)), category: "customer", metricName: "Retention Rate", value: "88", unit: "%" },
    { date: dateStr(daysAgo(60)), category: "customer", metricName: "Retention Rate", value: "84", unit: "%" },
    { date: dateStr(daysAgo(30)), category: "customer", metricName: "Retention Rate", value: "80", unit: "%" },
    { date: dateStr(today), category: "customer", metricName: "Retention Rate", value: "76", unit: "%" },
    { date: dateStr(today), category: "customer", metricName: "Inactive Customers (30d)", value: "47", unit: "customers" },
    { date: dateStr(today), category: "customer", metricName: "Avg Order Value", value: "842", unit: "INR" },
  ];

  // Operations metrics
  const opsData: Array<typeof metricsTable.$inferInsert> = [
    { date: dateStr(daysAgo(90)), category: "operations", metricName: "Avg Fulfillment Time", value: "18", unit: "minutes" },
    { date: dateStr(daysAgo(60)), category: "operations", metricName: "Avg Fulfillment Time", value: "21", unit: "minutes" },
    { date: dateStr(daysAgo(30)), category: "operations", metricName: "Avg Fulfillment Time", value: "26", unit: "minutes" },
    { date: dateStr(today), category: "operations", metricName: "Avg Fulfillment Time", value: "31", unit: "minutes" },
    { date: dateStr(today), category: "operations", metricName: "Orders Per Day", value: "74", unit: "orders" },
  ];

  await db.insert(metricsTable).values([
    ...salesData,
    ...inventoryData,
    ...financeData,
    ...customerData,
    ...opsData,
  ]);

  // ─── Pre-seeded Insights ─────────────────────────────────────────────────────
  await db.insert(insightsTable).values([
    {
      severity: "critical",
      category: "inventory",
      title: "Product A out of stock for 3+ days",
      explanation: "Product A (Rice 5kg) has zero inventory and caused an 18% revenue dip over 3 days last week. Immediate restocking is required as this is your top-selling SKU accounting for 23% of daily revenue.",
      relatedMetric: "Daily Revenue",
      isRead: false,
    },
    {
      severity: "critical",
      category: "finance",
      title: "Monthly expenses spiked 22% above average",
      explanation: "Last month's expenses rose to ₹2,33,000 — 22% above the 3-month average of ₹1,90,500. The primary driver appears to be supplier price increases and unplanned restocking costs triggered by the stockout event.",
      relatedMetric: "Monthly Expenses",
      isRead: false,
    },
    {
      severity: "warning",
      category: "customer",
      title: "Customer retention dropped 12 points in 90 days",
      explanation: "Retention rate has declined steadily from 88% to 76% over 90 days. 47 customers have not purchased in the last 30 days. The stockout of top products is the most likely driver — customers who couldn't find what they needed went to competitors.",
      relatedMetric: "Retention Rate",
      isRead: false,
    },
    {
      severity: "warning",
      category: "operations",
      title: "Order fulfillment time up 72% over 3 months",
      explanation: "Average fulfillment time has increased from 18 minutes to 31 minutes over 90 days. This degrades customer experience and is likely contributing to lower retention. Possible causes: understaffing during peak hours or inefficient inventory layout.",
      relatedMetric: "Avg Fulfillment Time",
      isRead: false,
    },
    {
      severity: "warning",
      category: "inventory",
      title: "3 products critically low — stockout within 4 days",
      explanation: "Products C (Cooking Oil: 15 units), D (Sugar 1kg: 8 units), and I (Soap: 12 units) are below reorder thresholds. At current consumption rates, all three will be out of stock within 4 days.",
      relatedMetric: "Product C (Cooking Oil)",
      isRead: false,
    },
    {
      severity: "warning",
      category: "sales",
      title: "Weekend revenue consistently 16% higher than weekdays",
      explanation: "Weekend sales average ₹72,000/day vs ₹62,000/day on weekdays. You may be understaffed on weekends or running out of key items by Saturday afternoon. Consider increasing inventory orders and staffing ahead of weekends.",
      relatedMetric: "Daily Revenue",
      isRead: true,
    },
    {
      severity: "positive",
      category: "sales",
      title: "Products H, K driving 31% of total revenue",
      explanation: "Products H (Biscuits) and K (Chips) together account for 31% of total revenue with strong margins and healthy stock levels (320 and 280 units respectively). These are your anchors — prioritize their availability.",
      relatedMetric: "Daily Revenue",
      isRead: false,
    },
    {
      severity: "positive",
      category: "finance",
      title: "Profit margin at 18.4% — above industry benchmark",
      explanation: "Your current profit margin of 18.4% is above the retail industry benchmark of 15-16%. This is healthy, but the rising expense trend must be controlled to sustain it — if expenses continue their trajectory, margin will fall below benchmark in 45 days.",
      relatedMetric: "Profit Margin",
      isRead: false,
    },
  ]);

  // ─── Pre-seeded Recommendations ──────────────────────────────────────────────
  await db.insert(recommendationsTable).values([
    {
      urgency: "high",
      problemStatement: "Product A (Rice 5kg) is out of stock, directly causing revenue loss",
      rootCause: "Reorder was not triggered when inventory fell below threshold 5 days ago",
      action: "Place emergency reorder with ABC Traders for 240 units of Product A. Enable automated low-stock alerts at 30-unit threshold for all top-10 SKUs.",
      expectedOutcome: "Revenue recovery of approximately ₹18,000/day once restocked. Prevents recurrence with automated alerts.",
      expectedImpactPercent: "12.00",
      status: "pending",
    },
    {
      urgency: "high",
      problemStatement: "47 customers inactive for 30+ days — retention at 3-year low",
      rootCause: "Stockouts of key products pushed customers to competitors during critical shopping windows",
      action: "Export the list of 47 inactive customers and send personalized SMS offers (10% discount on next purchase). Set up weekly re-engagement campaign for customers with 30-day inactivity.",
      expectedOutcome: "Estimated 35% re-engagement rate — recovering approximately 16 customers and ₹13,500/month in recurring revenue.",
      expectedImpactPercent: "8.00",
      status: "in_progress",
    },
    {
      urgency: "high",
      problemStatement: "3 products (C, D, I) will stock out within 4 days",
      rootCause: "Insufficient safety stock and no automated reorder triggers configured",
      action: "Immediately order: Cooking Oil (150 units), Sugar 1kg (100 units), Soap (80 units). Set safety stock = 2x reorder point for all items.",
      expectedOutcome: "Prevents ₹9,000-12,000/day revenue loss and further customer attrition.",
      expectedImpactPercent: "7.00",
      status: "pending",
    },
    {
      urgency: "medium",
      problemStatement: "Order fulfillment time at 31 minutes — customers waiting too long",
      rootCause: "Inventory not organized for fast picking; peak-hour understaffing",
      action: "Reorganize shelf layout to place top-20 SKUs near the billing counter. Add one part-time staff member on Friday-Sunday 5pm-9pm peak window.",
      expectedOutcome: "Reduce fulfillment to under 20 minutes. Improve NPS and reduce cart abandonment for in-store customers.",
      expectedImpactPercent: "5.00",
      status: "pending",
    },
    {
      urgency: "low",
      problemStatement: "Weekend revenue opportunity not being maximized",
      rootCause: "Insufficient stock levels and staffing entering the weekend",
      action: "Create a Friday pre-weekend stock checklist. Ensure all top-20 SKUs have at least 3 days of weekend inventory before Saturday opens.",
      expectedOutcome: "Capture an additional ₹8,000-12,000 in weekend revenue per week.",
      expectedImpactPercent: "3.00",
      status: "pending",
    },
  ]);

  // ─── Pre-seeded Alerts ───────────────────────────────────────────────────────
  await db.insert(alertsTable).values([
    {
      severity: "critical",
      title: "Product A out of stock — revenue impact active",
      explanation: "Zero units of Product A (Rice 5kg) in inventory. Revenue is 18% below daily average. Immediate reorder required.",
      metricName: "Product A (Rice 5kg)",
      metricValue: "0",
      threshold: "50",
      isRead: false,
    },
    {
      severity: "critical",
      title: "Profit margin at risk — expenses trending up",
      explanation: "Monthly expenses grew 22% vs prior month. At current rate, profit margin will fall below 15% within 6 weeks.",
      metricName: "Monthly Expenses",
      metricValue: "233000",
      threshold: "195000",
      isRead: false,
    },
    {
      severity: "warning",
      title: "Product D (Sugar 1kg) — 4 days to stockout",
      explanation: "Current stock: 8 units. Reorder threshold: 25 units. At average daily consumption of 2.1 units, stockout expected in 4 days.",
      metricName: "Product D (Sugar 1kg)",
      metricValue: "8",
      threshold: "25",
      isRead: false,
    },
    {
      severity: "warning",
      title: "Customer retention below 80% for first time",
      explanation: "Retention rate hit 76% — below the 80% threshold for the first time in 18 months. Immediate re-engagement action required.",
      metricName: "Retention Rate",
      metricValue: "76",
      threshold: "80",
      isRead: false,
    },
    {
      severity: "warning",
      title: "Fulfillment time exceeds 30-minute SLA",
      explanation: "Average order fulfillment time is now 31 minutes — above the 25-minute target. Customer satisfaction scores likely declining.",
      metricName: "Avg Fulfillment Time",
      metricValue: "31",
      threshold: "25",
      isRead: true,
    },
    {
      severity: "info",
      title: "Weekend sales pattern identified",
      explanation: "AI detected a consistent 16% revenue uplift on weekends. This presents a repeatable optimization opportunity.",
      metricName: "Daily Revenue",
      metricValue: "72000",
      threshold: "62000",
      isRead: true,
    },
  ]);

  // ─── Pre-seeded Forecasts ────────────────────────────────────────────────────
  const forecastRows: Array<typeof forecastsTable.$inferInsert> = [];

  // Sales forecast — 14 days into future
  for (let i = 1; i <= 14; i++) {
    const d = addDays(today, i);
    const isWeekend = d.getDay() === 0 || d.getDay() === 6;
    const base = isWeekend ? 74000 : 64000;
    const trend = 1 + i * 0.003; // slight recovery
    const predicted = base * trend;
    forecastRows.push({
      metricName: "sales",
      unit: "INR",
      forecastDate: dateStr(d),
      predictedValue: predicted.toFixed(2),
      confidencePercent: (91 - i * 0.5).toFixed(2),
      lowerBound: (predicted * 0.88).toFixed(2),
      upperBound: (predicted * 1.12).toFixed(2),
      isHistorical: false,
    });
  }

  // Historical sales for forecast chart (last 14 days)
  for (let i = 13; i >= 0; i--) {
    const d = daysAgo(i);
    const dow = d.getDay();
    const isWeekend = dow === 0 || dow === 6;
    const isStockout = i >= 12 && i <= 14;
    let base = isWeekend ? 71000 : 61000;
    if (isStockout) base *= 0.55;
    const noise = (Math.random() - 0.5) * 6000;
    forecastRows.push({
      metricName: "sales",
      unit: "INR",
      forecastDate: dateStr(d),
      predictedValue: Math.max(0, base + noise).toFixed(2),
      confidencePercent: "100",
      lowerBound: "0",
      upperBound: "0",
      isHistorical: true,
    });
  }

  // Inventory forecast
  for (let i = 1; i <= 14; i++) {
    const d = addDays(today, i);
    const unitsPredicted = Math.max(0, 850 - i * 15);
    forecastRows.push({
      metricName: "inventory",
      unit: "units",
      forecastDate: dateStr(d),
      predictedValue: unitsPredicted.toFixed(2),
      confidencePercent: (88 - i * 0.4).toFixed(2),
      lowerBound: (unitsPredicted * 0.85).toFixed(2),
      upperBound: (unitsPredicted * 1.15).toFixed(2),
      isHistorical: false,
    });
  }

  // Expense forecast
  for (let i = 1; i <= 14; i++) {
    const d = addDays(today, i);
    const predicted = 7800 + i * 50;
    forecastRows.push({
      metricName: "expenses",
      unit: "INR",
      forecastDate: dateStr(d),
      predictedValue: predicted.toFixed(2),
      confidencePercent: (85 - i * 0.3).toFixed(2),
      lowerBound: (predicted * 0.9).toFixed(2),
      upperBound: (predicted * 1.1).toFixed(2),
      isHistorical: false,
    });
  }

  // Cashflow forecast
  for (let i = 1; i <= 14; i++) {
    const d = addDays(today, i);
    const predicted = 56000 + i * 800;
    forecastRows.push({
      metricName: "cashflow",
      unit: "INR",
      forecastDate: dateStr(d),
      predictedValue: predicted.toFixed(2),
      confidencePercent: (82 - i * 0.4).toFixed(2),
      lowerBound: (predicted * 0.87).toFixed(2),
      upperBound: (predicted * 1.13).toFixed(2),
      isHistorical: false,
    });
  }

  await db.insert(forecastsTable).values(forecastRows);

  logger.info("Database seeded successfully");
}
