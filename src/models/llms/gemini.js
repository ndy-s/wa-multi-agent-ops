import { ChatOpenAI } from "@langchain/openai";
import { config } from "../../config/env.js";

export const apiKeys = config.googleaiApiKeys || [];

export function createGeminiModel(apiKey) {
    return new ChatOpenAI({
        temperature: 0,
        model: "gemini-1b",
        apiKey,
        configuration: { baseURL: config.openrouterBaseUrl },
    });
}

export async function hasQuota(apiKey) {
    return false;
}
