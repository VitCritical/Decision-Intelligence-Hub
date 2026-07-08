import { Router, type IRouter } from "express";
import { db, chatMessagesTable, metricsTable, insightsTable, recommendationsTable } from "@workspace/db";
import { desc, eq, gte } from "drizzle-orm";
import { generateChatResponse } from "../lib/gemini";
import { SendChatMessageBody } from "@workspace/api-zod";
import { asyncHandler, HttpError } from "../middlewares/error-handler";

const router: IRouter = Router();

async function buildDynamicSystemPrompt(): Promise<string> {
  const recentMetrics = await db
    .select()
    .from(metricsTable)
    .orderBy(desc(metricsTable.date));

  // Deduplicate by category + metricName to get the latest value for each
  const latestMetrics: Record<string, typeof metricsTable.$inferSelect> = {};
  for (const m of recentMetrics) {
    const key = `${m.category}:${m.metricName}`;
    if (!latestMetrics[key]) {
      latestMetrics[key] = m;
    }
  }

  // Format the metrics into a list
  const metricsSummary = Object.values(latestMetrics)
    .map((m) => `- [${m.category.toUpperCase()}] ${m.metricName}: ${Number(m.value).toLocaleString("en-IN")} ${m.unit} (as of ${m.date})`)
    .join("\n");

  return `You are NexaDecide AI, an intelligent business analyst for "Arjun General Store" — a retail store in India. 
You have access to real business data: sales, inventory, finance, customer, and operations metrics.

Here is the LATEST real-time data from the store database:
${metricsSummary}

Answer business questions concisely and helpfully. Be specific with numbers and refer directly to the actual data shown above.
If asked about data you don't have, give your best analysis based on the context above.
Keep responses under 120 words unless asked for detail.
Do not use bullet points unless asked. Write in natural, professional language.`;
}

router.post("/chat/messages", asyncHandler(async (req, res): Promise<void> => {
  const body = SendChatMessageBody.safeParse(req.body);
  if (!body.success) {
    throw new HttpError(400, body.error.message);
  }

  // Save user message
  const [userMsg] = await db
    .insert(chatMessagesTable)
    .values({ role: "user", content: body.data.message })
    .returning();

  // Get last 10 messages for context
  const history = await db
    .select()
    .from(chatMessagesTable)
    .orderBy(desc(chatMessagesTable.createdAt))
    .limit(10);

  const chatHistory = history
    .reverse()
    .slice(0, -1) // exclude the message we just inserted
    .map((m) => ({
      role: m.role === "user" ? ("user" as const) : ("model" as const),
      parts: m.content,
    }));

  const dynamicPrompt = await buildDynamicSystemPrompt();
  const aiText = await generateChatResponse(dynamicPrompt, chatHistory, body.data.message);

  const [assistantMsg] = await db
    .insert(chatMessagesTable)
    .values({ role: "assistant", content: aiText })
    .returning();

  res.json({
    userMessage: { ...userMsg, createdAt: userMsg.createdAt.toISOString() },
    assistantMessage: { ...assistantMsg, createdAt: assistantMsg.createdAt.toISOString() },
  });
}));

router.get("/chat/history", asyncHandler(async (req, res): Promise<void> => {
  const rows = await db
    .select()
    .from(chatMessagesTable)
    .orderBy(chatMessagesTable.createdAt)
    .limit(100);

  res.json(rows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() })));
}));

router.delete("/chat/history", asyncHandler(async (req, res): Promise<void> => {
  await db.delete(chatMessagesTable);
  res.json({ success: true, message: "Chat history cleared" });
}));

export default router;
