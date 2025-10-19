import { OpenAIEmbeddings } from "@langchain/openai";
import { config } from "../../config/env.js";

const client = new OpenAIEmbeddings({
    model: "text-embedding-3-small",
    apiKey: config.openaiApiKey,
});

export async function embedQuery(text) {
    return client.embedQuery(text);
}

export async function embedDocuments(texts) {
    return client.embedDocuments(texts);
}

