import { formatLLMMessage } from "../../helpers/llm.js";
import { buildMemoryPrompt, classifierRegistryPrompt } from "../base/prompt-builder.js";

export async function buildClassifierPrompt(msgJSON, memory) {
    const userMessage = formatLLMMessage(
        msgJSON.sender, 
        msgJSON.content, 
        msgJSON.quotedContext
    );

    const systemPrompt = await classifierRegistryPrompt();
    const memoryPrompt = buildMemoryPrompt(memory);

    return {
        systemPrompt,
        memoryPrompt,
        userMessage
    };
}


