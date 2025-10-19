import { ChatOpenAI } from "@langchain/openai";
import { config } from "../config/env.js";

export const model = new ChatOpenAI({
    temperature: 0,
    model: "tngtech/deepseek-r1t2-chimera:free",
    apiKey: config.openrouterApiKey,
    configuration: { baseURL: config.openrouterBaseUrl },
});
