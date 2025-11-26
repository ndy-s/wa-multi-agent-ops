import { ChatOpenAI } from "@langchain/openai";
import { loadConfig } from "../../config/env.js";

export async function getApiKeys() {
    const config = await loadConfig();
    return config.openrouterApiKeys || [];
}

export function createModel(apiKey) {
    return new ChatOpenAI({
        temperature: 0,
        model: "tngtech/deepseek-r1t2-chimera:free",
        apiKey,
        configuration: {
            baseURL: config.openrouterBaseUrl
        },
    });
}

export async function hasQuota(apiKey) {
    return true;
}


