import { buildMemoryPrompt, apiRegistryPrompt, buildDynamicApiPrompt } from "../../helpers/prompts.js";
import { formatLLMMessage } from "../../helpers/llm.js";
import { findRelevantApis } from "../../helpers/api-embeddings.js";
import { config } from "../../config/env.js";
import logger from "../../helpers/logger.js";

export async function buildApiPrompt(msgJSON, memory) {
    const userMessage = formatLLMMessage(msgJSON.sender, msgJSON.content, msgJSON.quotedContext);
    let systemPrompt;

    if (config.useEmbedding) {
        const context = [...memory.map(m => `[${m.role}] ${m.content}`), userMessage].join(" ");
        const relevant = await findRelevantApis(context, config.embeddingLimit);
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
