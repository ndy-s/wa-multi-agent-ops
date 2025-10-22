import { buildMemoryPrompt, apiRegistryPrompt, buildDynamicApiPrompt } from "../base/prompt-builder.js";
import { formatLLMMessage } from "../../helpers/llm.js";
import { config } from "../../config/env.js";
import logger from "../../helpers/logger.js";
import { EmbeddingStore } from "../base/EmbeddingStore.js";
import { registry } from "./registry.js";

const apiStore = new EmbeddingStore("api-embeddings");

export async function buildApiPrompt(msgJSON, memory) {
    const userMessage = formatLLMMessage(msgJSON.sender, msgJSON.content, msgJSON.quotedContext);
    let systemPrompt;

    if (config.useEmbedding) {
        const contextText = [...memory.map(m => `[${m.role}] ${m.content}`), userMessage].join(" ");

        await apiStore.load(
            Object.entries(registry).map(([id, meta]) => ({ id, meta })),
            ({ id, meta }) => {
                const fields = Object.entries(meta.fields || {}).map(([k, v]) => `${k}: ${v.instructions || ""}`).join(", ");
                const examples = (meta.examples || []).map(e => `${e.input} -> ${JSON.stringify(e.output)}`).join("; ");
                return `${id}: ${meta.description}. Fields: ${fields}. Examples: ${examples}`;
            }
        );

        const relevant = await apiStore.findRelevant(contextText, config.embeddingLimit);

        systemPrompt = relevant.length ? buildDynamicApiPrompt(relevant) : apiRegistryPrompt();
        logger.info(`[apiAgent] Using ${relevant.length ? "dynamic" : "default"} API prompt`);
    } else {
        systemPrompt = apiRegistryPrompt();
    }

    return {
        systemPrompt,
        memoryPrompt: buildMemoryPrompt(memory),
        userMessage
    };
}