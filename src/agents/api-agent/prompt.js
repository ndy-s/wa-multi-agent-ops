import { buildMemoryPrompt, apiRegistryPrompt } from "../base/prompt-builder.js";
import { formatLLMMessage } from "../../helpers/llm.js";
import { loadConfig } from "../../config/env.js";
import logger from "../../helpers/logger.js";
import { EmbeddingStore } from "../base/EmbeddingStore.js";
import { registryRepository } from "../../repositories/registry-repository.js";

const apiStore = new EmbeddingStore("api-embeddings");

export async function buildApiPrompt(msgJSON, memory) {
    const config = await loadConfig();
    const userMessage = formatLLMMessage(
        msgJSON.sender, 
        msgJSON.content, 
        msgJSON.quotedContext
    );

    const dbApiRegistry = await registryRepository.get("API_REGISTRY");
    if (!dbApiRegistry) {
        logger.warn("[apiAgent] API registry is empty in DB, using empty fallback");
    }

    const defaultApis = Object.entries(dbApiRegistry || {}).map(([id, meta]) => ({ id, meta }));
    let apis = defaultApis;
    let systemPrompt;

    if (config.useEmbedding) {
        const contextText = [
            ...memory.map(m => `[${m.role}] ${m.content}`), 
            userMessage
        ].join(" ");

        await apiStore.load(
            defaultApis,
            ({ id, meta }) => {
                const fields = Object.entries(meta.fields || {})
                    .map(([k, v]) => `${k}: ${v.instructions || ""}`)
                    .join(", ");

                const examples = (meta.examples || [])
                    .map(e => `${e.input} -> ${JSON.stringify(e.output)}`)
                    .join("; ");

                return `${id}: ${meta.description}. Fields: ${fields}. Examples: ${examples}`;
            }
        );

        const relevant = await apiStore.findRelevant(contextText, config.embeddingLimitApi);

        if (relevant.length > 0) {
            apis = relevant;
            logger.info("[apiAgent] Using dynamic API prompt");
        } else {
            logger.info("[apiAgent] Using fallback default API prompt");
        }
    } 

    systemPrompt = await apiRegistryPrompt(apis);
    const memoryPrompt = buildMemoryPrompt(memory);

    return {
        systemPrompt,
        memoryPrompt,
        userMessage
    };
}
