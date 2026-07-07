import { Router, type IRouter } from "express";
import { db, chatMessagesTable, metricsTable, insightsTable, recommendationsTable } from "@workspace/db";
import { desc, eq, gte } from "drizzle-orm";
import { generateChatResponse } from "../lib/gemini";
import { SendChatMessageBody } from "@workspace/api-zod";

const router: IRouter = Router();

const SYSTEM_PROMPT = `You are NexaDecide AI, an intelligent business analyst for "Arjun General Store" — a retail store in India. 
You have access to real business data: sales, inventory, finance, customer, and operations metrics.

Key business facts you know:
- Business: Arjun General Store (Retail, India)
- Current business health score: ~78/100
- Critical issue: Product A (Rice 5kg) is out of stock — causing 18% daily revenue loss
- Customer retention has declined from 88% to 76% over 90 days
- 47 customers inactive in last 30 days
- 3 more products (C, D, I) near stockout within 4 days
- Monthly expenses spiked 22% last month to ₹2,33,000
- Profit margin: 18.4% (above industry benchmark)
- Orders per day: ~74
- Average order value: ₹842
- Weekend revenue is consistently 16% higher than weekdays
- Top revenue products: H (Biscuits) and K (Chips) at 31% of revenue combined

Answer business questions concisely and helpfully. Be specific with numbers. 
If asked about data you don't have, give your best analysis based on the context above.
Keep responses under 120 words unless asked for detail.
Do not use bullet points unless asked. Write in natural, professional language.`;

router.post("/chat/messages", async (req, res): Promise<void> => {
  const body = SendChatMessageBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
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

  const aiText = await generateChatResponse(SYSTEM_PROMPT, chatHistory, body.data.message);

  const [assistantMsg] = await db
    .insert(chatMessagesTable)
    .values({ role: "assistant", content: aiText })
    .returning();

  res.json({
    userMessage: { ...userMsg, createdAt: userMsg.createdAt.toISOString() },
    assistantMessage: { ...assistantMsg, createdAt: assistantMsg.createdAt.toISOString() },
  });
});

router.get("/chat/history", async (req, res): Promise<void> => {
  const rows = await db
    .select()
    .from(chatMessagesTable)
    .orderBy(chatMessagesTable.createdAt)
    .limit(100);

  res.json(rows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() })));
});

router.delete("/chat/history", async (req, res): Promise<void> => {
  await db.delete(chatMessagesTable);
  res.json({ success: true, message: "Chat history cleared" });
});

export default router;
