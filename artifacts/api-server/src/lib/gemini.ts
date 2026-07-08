import { GoogleGenerativeAI } from "@google/generative-ai";
import { logger } from "./logger";

const apiKey = process.env.GEMINI_API_KEY;

/**
 * Whether the Gemini AI client is available.
 * When the API key is missing or set to a dummy value, AI features
 * gracefully degrade instead of crashing the server.
 */
export const isGeminiAvailable =
  Boolean(apiKey) && apiKey !== "dummy_key_for_local_dev";

let textModel: ReturnType<GoogleGenerativeAI["getGenerativeModel"]> | null =
  null;
let chatModel: ReturnType<GoogleGenerativeAI["getGenerativeModel"]> | null =
  null;

if (isGeminiAvailable) {
  const genAI = new GoogleGenerativeAI(apiKey!);

  textModel = genAI.getGenerativeModel({
    model: "gemini-2.0-flash",
    generationConfig: { responseMimeType: "application/json" },
  });

  chatModel = genAI.getGenerativeModel({
    model: "gemini-2.0-flash",
  });

  logger.info("Gemini AI client initialized");
} else {
  logger.warn(
    "GEMINI_API_KEY is missing or set to a placeholder — AI features are disabled. " +
      "Set a valid key in your .env file to enable AI generation.",
  );
}

// ---------------------------------------------------------------------------
// Retry helper
// ---------------------------------------------------------------------------

const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 1_000;
const REQUEST_TIMEOUT_MS = 30_000;

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Race a promise against a timeout.  Throws if the timeout fires first.
 */
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`Gemini request timed out after ${ms}ms`)),
      ms,
    );
    promise
      .then((v) => {
        clearTimeout(timer);
        resolve(v);
      })
      .catch((e) => {
        clearTimeout(timer);
        reject(e);
      });
  });
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Generate structured JSON from a Gemini prompt with retry + timeout.
 *
 * @throws when Gemini is unavailable, all retries are exhausted, or the
 *         response is not valid JSON.
 */
export async function generateJSON<T>(prompt: string): Promise<T> {
  if (!textModel) {
    throw new Error(
      "Gemini AI is not available. Set GEMINI_API_KEY to a valid key.",
    );
  }

  let lastError: unknown;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      if (attempt > 0) {
        const delay = RETRY_DELAY_MS * 2 ** (attempt - 1);
        logger.info(
          { attempt, delay },
          "Retrying Gemini JSON generation...",
        );
        await sleep(delay);
      }

      const result = await withTimeout(
        textModel.generateContent(prompt),
        REQUEST_TIMEOUT_MS,
      );

      let text = result.response.text().trim();

      // Strip markdown code fences if the model wraps output
      text = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");

      const parsed = JSON.parse(text) as T;
      return parsed;
    } catch (err) {
      lastError = err;
      logger.warn(
        { err, attempt },
        "Gemini JSON generation attempt failed",
      );
    }
  }

  logger.error({ err: lastError }, "Gemini JSON generation failed after all retries");
  throw lastError;
}

/**
 * Generate a chat response from Gemini with retry + timeout.
 */
export async function generateChatResponse(
  systemPrompt: string,
  history: Array<{ role: "user" | "model"; parts: string }>,
  userMessage: string,
): Promise<string> {
  if (!chatModel) {
    throw new Error(
      "Gemini AI is not available. Set GEMINI_API_KEY to a valid key.",
    );
  }

  let lastError: unknown;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      if (attempt > 0) {
        const delay = RETRY_DELAY_MS * 2 ** (attempt - 1);
        logger.info({ attempt, delay }, "Retrying Gemini chat...");
        await sleep(delay);
      }

      const chat = chatModel.startChat({
        systemInstruction: systemPrompt,
        history: history.map((h) => ({
          role: h.role,
          parts: [{ text: h.parts }],
        })),
      });

      const result = await withTimeout(
        chat.sendMessage(userMessage),
        REQUEST_TIMEOUT_MS,
      );

      return result.response.text();
    } catch (err) {
      lastError = err;
      logger.warn({ err, attempt }, "Gemini chat attempt failed");
    }
  }

  logger.error({ err: lastError }, "Gemini chat failed after all retries");
  throw lastError;
}
