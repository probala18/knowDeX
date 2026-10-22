import { ChatOpenAI } from "@langchain/openai";

export const DEFAULT_FREE_MODEL = "meta-llama/llama-3.3-70b-instruct:free";

export const RECOMMENDED_FREE_MODELS = [
  "meta-llama/llama-3.3-70b-instruct:free",
  "google/gemini-2.0-flash-lite-preview-02-05:free",
  "deepseek/deepseek-r1:free",
  "mistralai/mistral-small-24b-instruct-2501:free",
  "qwen/qwen-2.5-72b-instruct:free",
];

export function getLLM(options: { temperature?: number; maxTokens?: number } = {}) {
  const apiKey =
    process.env.OPENROUTER_API_KEY ||
    process.env.OPENAI_API_KEY ||
    "sk-or-v1-placeholder";

  const model =
    process.env.OPENROUTER_MODEL ||
    DEFAULT_FREE_MODEL;

  return new ChatOpenAI({
    model,
    apiKey,
    configuration: {
      baseURL: "https://openrouter.ai/api/v1",
      defaultHeaders: {
        "HTTP-Referer": "http://localhost:3000",
        "X-Title": "knowDeX AI Academic Assistant",
      },
    },
    temperature: options.temperature ?? 0.2,
    maxTokens: options.maxTokens ?? 2048,
  });
}
