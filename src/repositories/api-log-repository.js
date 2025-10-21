import { openDB } from "../db/sqlite.js";
import logger from "../helpers/logger.js";
import { config } from "../config/env.js";

export async function saveApiLog(logData) {
    const {
        chatId, userId, systemPrompt, memoryPrompt,
        userMessage, modelResponse, validation,
        modelResMeta, retryCount = 0, metadata
    } = logData;

    if (config.sqliteType === "cloud") {
        const db = await openDB();

        try {
            await db.sql`
                INSERT INTO api_logs (
                    chat_id, user_id,
                    system_prompt, memory_prompt, user_message,
                    model_response, validation_type, validation_errors,
                    model_name, token_prompt, token_completion, token_total,
                    retry_count, metadata
                ) VALUES (
                    ${chatId}, ${userId},
                    ${systemPrompt}, ${memoryPrompt}, ${userMessage},
                    ${modelResponse}, ${validation?.type ?? null}, ${validation?.errors ? JSON.stringify(validation.errors) : null},
                    ${modelResMeta?.modelName ?? null}, ${modelResMeta?.promptTokens ?? 0}, ${modelResMeta?.completionTokens ?? 0}, ${modelResMeta?.totalTokens ?? 0},
                    ${retryCount ?? 0}, ${JSON.stringify(metadata || {})}
                );
            `;

            logger.info(`[saveApiLog] Logged API interaction for user=${userId} (cloud)`);
        } catch (err) {
            logger.error(`[saveApiLog] Failed to save log (cloud) for user=${userId}:`, err);
        } finally {
            db.close();
        }

    } else {
        // Local DB
        try {
            const db = await openDB();
            const stmt = db.prepare(`
                INSERT INTO api_logs (
                    chat_id, user_id,
                    system_prompt, memory_prompt, user_message,
                    model_response, validation_type, validation_errors,
                    model_name, token_prompt, token_completion, token_total,
                    retry_count, metadata
                ) VALUES (
                    @chatId, @userId,
                    @systemPrompt, @memoryPrompt, @userMessage,
                    @modelResponse, @validationType, @validationErrors,
                    @modelName, @tokenPrompt, @tokenCompletion, @tokenTotal,
                    @retryCount, @metadata
                )
            `);

            stmt.run({
                chatId, userId, systemPrompt, memoryPrompt, userMessage,
                modelResponse,
                validationType: validation?.type || null,
                validationErrors: validation?.errors ? JSON.stringify(validation.errors) : null,
                modelName: modelResMeta?.modelName || null,
                tokenPrompt: modelResMeta?.promptTokens || 0,
                tokenCompletion: modelResMeta?.completionTokens || 0,
                tokenTotal: modelResMeta?.totalTokens || 0,
                retryCount,
                metadata: JSON.stringify(metadata || {})
            });

            logger.info(`[saveApiLog] Logged API interaction for user=${userId} (local)`);
        } catch (err) {
            logger.error(`[saveApiLog] Failed to save log (local) for user=${userId}:`, err);
        }
    }
}

