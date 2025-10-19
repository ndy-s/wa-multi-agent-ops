import { AIMessage, HumanMessage, SystemMessage } from "@langchain/core/messages";
import { model } from "../models/deepseek.js";
import { buildApiSystemPrompt, buildDynamicApiSystemPrompt } from "../prompts/buildApiSystemPrompt.js";
import { parseAndValidateResponse, extractValidationErrors } from "../utils/helpers.js";
import { addMemory, getRecentMemory } from "../memory/memoryStore.js";
import { getOrCreateChat, insertChatMessage, insertModelResponse } from "../utils/chatRepository.js";
import { findRelevantApis } from "../utils/apiEmbeddings.js";
import { DateTime } from "luxon";
import logger from "../utils/logger.js";

const jakartaTime = () => DateTime.now().setZone("Asia/Jakarta").toISO();

async function saveMessage(chatId, role, content, shortTermMemory, retryCount) {
    logger.debug(`[saveMessage] role=${role} length=${content.length} retry=${retryCount}`);
    return insertChatMessage({
        chatDbId: chatId,
        role,
        content,
        messageLength: content.length,
        truncatedMemory: shortTermMemory.slice(-5),
        retryCount
    });
}

async function saveModelResponse(assistantMsgId, modelRes, validated, shortTermMemory, retryCount, userMessage) {
    const tokenUsage = modelRes?.response_metadata?.tokenUsage || modelRes?.usage_metadata || {};
    const { promptTokens = null, completionTokens = null, totalTokens = null } = tokenUsage;
    const modelName = modelRes?.response_metadata?.model_name || model?.name || "unknown";

    logger.debug(`[saveModelResponse] assistantMsgId=${assistantMsgId} validated=${validated.type} tokens=${totalTokens}`);

    await insertModelResponse({
        messageId: assistantMsgId,
        modelName,
        messageIdFromModel: modelRes?.id || null,
        promptTokens,
        completionTokens,
        totalTokens,
        validationType: validated.type,
        validationErrors: validated.errors || "",
        metadata: {
            retryCount,
            memorySize: shortTermMemory.length,
            truncatedMemory: shortTermMemory.slice(-5).map(m => m.content),
            timestamp: jakartaTime(),
            inputLength: userMessage.length,
            outputLength: modelRes?.content?.length || 0,
            rawResponse: modelRes?.content || "",
            rawObject: modelRes
        }
    });
}

export async function invokeAgent(remoteJid, userJid, userMessage, maxRetries = 2, useEmbedding = false) {
    let retryCount = 0;
    let lastContent = "";
    let lastErrors = {};

    const shortTermMemory = getRecentMemory(userJid);
    logger.info(`[invokeAgent] user=${userJid} message length=${userMessage.length} useEmbedding=${useEmbedding}`);

    let systemPrompt = "";
    if (useEmbedding) {
        const relevant = await findRelevantApis(userMessage, 3);
        if (relevant.length) {
            systemPrompt = buildDynamicApiSystemPrompt(relevant);
            logger.info(`[invokeAgent] Using dynamic prompt for APIs: ${relevant.map(r => r.id).join(", ")}`);
        } else {
            systemPrompt = buildApiSystemPrompt();
            logger.info(`[invokeAgent] No relevant APIs found, using default prompt`);
        }
    } else {
        systemPrompt = buildApiSystemPrompt();
        logger.info(`[invokeAgent] Embedding disabled, using default prompt`);
    }

    const chat = await getOrCreateChat(remoteJid, userJid);
    logger.debug(`[invokeAgent] chatId=${chat.id}`);

    while (retryCount <= maxRetries) {
        const messages = [
            new SystemMessage(systemPrompt),
            ...shortTermMemory.map(m => m.role === "user" ? new HumanMessage(m.content) : new AIMessage(m.content)),
            new HumanMessage(userMessage)
        ];

        if (retryCount > 0) {
            messages.push(new SystemMessage(
                `Previous response failed validation:\n${JSON.stringify(lastErrors, null, 2)}\nOriginal response:\n${lastContent}`
            ));
            logger.warn(`[invokeAgent] Retry #${retryCount} due to previous validation errors`);
        }

        try {
            logger.debug(`[invokeAgent] Sending messages to model, total messages=${messages.length}`);
            const res = await model.invoke(messages);
            const content = res?.content?.trim() || "";
            lastContent = content;
            logger.info(`[invokeAgent] Model response length=${content.length}`);

            if (!content) return ["I couldn't understand your request."];

            const validated = parseAndValidateResponse(content);
            logger.debug(`[invokeAgent] Response validated as type=${validated.type}`);

            // Save short-term memory
            addMemory(userJid, "user", userMessage);
            addMemory(userJid, "assistant", content);

            // Save user and assistant messages
            const userMsgId = await saveMessage(chat.id, "user", userMessage, shortTermMemory, retryCount);
            const assistantMsgId = await saveMessage(chat.id, "assistant", content, shortTermMemory, retryCount);

            // Save model response metadata
            await saveModelResponse(assistantMsgId, res, validated, shortTermMemory, retryCount, userMessage);

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


