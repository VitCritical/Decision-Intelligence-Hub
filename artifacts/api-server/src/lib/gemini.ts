import { GoogleGenerativeAI } from "@google/generative-ai";
import { logger } from "./logger";

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  throw new Error("GEMINI_API_KEY environment variable is required");
}

const genAI = new GoogleGenerativeAI(apiKey);

const textModel = genAI.getGenerativeModel({
  model: "gemini-2.0-flash",
  generationConfig: { responseMimeType: "application/json" },
});

const chatModel = genAI.getGenerativeModel({
  model: "gemini-2.0-flash",
});

export async function generateJSON<T>(prompt: string): Promise<T> {
  try {
    const result = await textModel.generateContent(prompt);
    let text = result.response.text().trim();
    // Strip markdown code fences if the model wraps output
    text = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
    return JSON.parse(text) as T;
  } catch (err) {
    logger.error({ err }, "Gemini JSON generation failed");
    throw err;
  }
}

export async function generateChatResponse(
  systemPrompt: string,
  history: Array<{ role: "user" | "model"; parts: string }>,
  userMessage: string
): Promise<string> {
  try {
    const chat = chatModel.startChat({
      systemInstruction: systemPrompt,
      history: history.map((h) => ({
        role: h.role,
        parts: [{ text: h.parts }],
      })),
    });
    const result = await chat.sendMessage(userMessage);
    return result.response.text();
  } catch (err) {
    logger.error({ err }, "Gemini chat generation failed");
    throw err;
  }
}
