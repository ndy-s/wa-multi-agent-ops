import { loadConfig } from "../../config/env.js";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";

export async function getApiKeys() {
    const config = await loadConfig();
    return config.googleaiApiKeys || [];
}

export function createModel(apiKey) {
    return new ChatGoogleGenerativeAI({
        temperature: 0,
        model: "gemini-2.5-flash",
        apiKey,
    });
}

export async function hasQuota(apiKey) {
    return true;
}
