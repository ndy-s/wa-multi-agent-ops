import { AIMessage, HumanMessage, SystemMessage } from "@langchain/core/messages";
import { model } from "../models/deepseek.js";
import { buildApiSystemPrompt, buildDynamicApiSystemPrompt } from "../prompts/build-api-system-prompt.js";
import {
    parseAndValidateResponse,
    extractValidationErrors,
    buildMemoryPrompt,
    formatLLMMessage
} from "../utils/helpers.js";
import { addMemory, getRecentMemory } from "../memory/memory-store.js";
import { findRelevantApis } from "../utils/api-embeddings.js";
import { DateTime } from "luxon";
import logger from "../utils/logger.js";
import { saveApiLog} from "../repositories/api-log-repository.js";
import { config } from "../config/env.js";

const jakartaTime = () => DateTime.now().setZone("Asia/Jakarta").toISO();

export async function invokeAgent(remoteJid, userJid, fullMessageJSON, maxRetries = 2) {
    let retryCount = 0;
    let lastContent = "";
    let lastErrors = {};

    const shortTermMemory = getRecentMemory(userJid);
    const userMessage = formatLLMMessage(fullMessageJSON.sender, fullMessageJSON.content, fullMessageJSON.quotedContext);
    logger.info(`[invokeAgent] user=${userJid} message length=${userMessage.length} useEmbedding=${config.useEmbedding}`);

    // 1. Build system prompt
    let systemPrompt;
    if (config.useEmbedding) {
        const fullContext = [...shortTermMemory.map(m => `[${m.role}] ${m.content}`), userMessage].join(" ");
        const relevant = await findRelevantApis(fullContext, config.embeddingLimit);
        if (relevant.length) {
            systemPrompt = buildDynamicApiSystemPrompt(relevant);
            logger.info(`[invokeAgent] Using dynamic prompt for APIs: ${relevant.map(r => r.id).join(", ")}`);
        } else {
            systemPrompt = buildApiSystemPrompt();
            logger.info(`[invokeAgent] No relevant APIs found, using default prompt`);
        }
    } else {
        systemPrompt = buildApiSystemPrompt();
    }

    // 2. Memory prompt (combine user/assistant history)
    const memoryPrompt  = buildMemoryPrompt(shortTermMemory);

    while (retryCount <= maxRetries) {
        const messages = [
            new SystemMessage(systemPrompt),
            ...shortTermMemory.map(m => {
                return m.role === "user" ? new HumanMessage(m.content) : new AIMessage(m.content);
            }),
            new HumanMessage(userMessage)
        ];

        if (retryCount > 0) {
            messages.push(new SystemMessage(
                `Previous response failed validation:\n${JSON.stringify(lastErrors, null, 2)}\nOriginal response:\n${lastContent}`
            ));
            logger.warn(`[invokeAgent] Retry #${retryCount} due to previous validation errors`);
        }

        try {
            // 3. Call model
            logger.info(`[invokeAgent] Sending messages to model, total messages=${messages.length}`);
            const res = await model.invoke(messages);
            let content = typeof res?.content === "string" ? res.content.trim() : res?.content;
            if (!content || (typeof content === "string" && !content.length)) {
                return ["I couldn't understand your request."];
            }
            lastContent = content;
            logger.info(`[invokeAgent] Model response length=${content.length}`);

            // 4. Validate response
            const validated = parseAndValidateResponse(content);
            logger.info(`[invokeAgent] Response validated as type=${validated.type}`);

            // 5. Save memory
            addMemory(userJid, "user", `[${fullMessageJSON.sender}] ${fullMessageJSON.content}`);
            if (validated.type === "api_action") {
                const apiSummaries = (validated.content.apis || []).map(a => {
                    const msgPart = validated.content.message ? `, Message: ${validated.content.message}` : "";
                    return `API: ${a.id}, Params: ${JSON.stringify(a.params)}${msgPart}`;
                });

                const memoryEntry = apiSummaries.length > 0
                    ? apiSummaries.join(" | ")
                    : (validated.content.message || "[API action with no details]");

                addMemory(userJid, "assistant", memoryEntry);
            } else if (validated.type === "message") {
                addMemory(userJid, "assistant", validated.content.message || "[Empty message]");
            } else {
                addMemory(userJid, "assistant", "[Unexpected response type]");
            }

            // 6. Gather token info
            const tokenUsage = res?.response_metadata?.tokenUsage || res?.usage_metadata || {};
            const modelResMeta = {
                modelName: res?.response_metadata?.model_name || model?.name || "unknown",
                promptTokens: tokenUsage?.promptTokens || 0,
                completionTokens: tokenUsage?.completionTokens || 0,
                totalTokens: tokenUsage?.totalTokens || 0
            };

            // 7. Store in api_logs
            await saveApiLog({
                chatId: remoteJid,
                userId: userJid,
                systemPrompt,
                memoryPrompt,
                userMessage,
                modelResponse: content,
                validation: validated,
                modelResMeta,
                retryCount,
                metadata: {
                    timestamp: jakartaTime(),
                    rawResponse: res,
                    memorySize: shortTermMemory.length
                }
            });

            // 8. Return result
            const resultMessages = [];

            if (validated.type === "api_action") {
                if (validated.content.message) {
                    resultMessages.push(validated.content.message);
                }

                if (validated.content.apis?.length) {
                    resultMessages.push(...validated.content.apis.map(a => `API: ${a.id}, Params: ${JSON.stringify(a.params)}`));
                }
            } else if (validated.type === "message") {
                resultMessages.push(validated.content.message || "I need more details.");
            } else {
                resultMessages.push("Unexpected response type from model.");
            }

            logger.info(`[invokeAgent] Returning ${resultMessages.length} messages to user=${userJid}`);
            return resultMessages;

        } catch (err) {
            retryCount++;
            lastErrors = err.name === "ZodError"
                ? extractValidationErrors(err, true)
                : { error: err.message || "Unknown error" };
            logger.error(`[invokeAgent] Attempt #${retryCount} failed:`, lastErrors);
        }
    }

    logger.error(`[invokeAgent] Max retries reached. Could not produce valid response for user=${userJid}`);
    return ["The model could not produce a valid response after multiple attempts."];
}
