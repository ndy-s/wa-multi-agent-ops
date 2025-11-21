import { config } from "../../config/env.js";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";

export const apiKeys = config.googleaiApiKeys || [];

export function createGeminiModel(apiKey) {
    return new ChatGoogleGenerativeAI({
        temperature: 0,
        model: "gemini-2.5-flash",
        apiKey,
    });
}

export async function hasQuota(apiKey) {
    return true;
}
