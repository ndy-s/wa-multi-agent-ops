import { AIMessage, HumanMessage, SystemMessage } from "@langchain/core/messages";
import logger from "../../helpers/logger.js";
import { parseAndValidateResponse, extractValidationErrors } from "../../helpers/validation.js";
import { addMemory, getRecentMemory } from "../../memory/memory-store.js";
import { saveApiLog } from "../../repositories/api-log-repository.js";
import { jakartaTime, summarizeTokens } from "./utils.js";

export class AgentBase {
    constructor({ id, model, schema, buildPrompt, handleResult }) {
        this.id = id;
        this.model = model;
        this.schema = schema;
        this.buildPrompt = buildPrompt;
        this.handleResult = handleResult;
    }

    async invoke(remoteJid, userJid, fullMessageJSON, maxRetries = 2) {
        let retry = 0, lastErrors = {}, lastContent = "";
        const memory = getRecentMemory(userJid);
        const { systemPrompt, memoryPrompt, userMessage } = await this.buildPrompt(fullMessageJSON, memory);

        while (retry <= maxRetries) {
            const messages = [
                new SystemMessage(systemPrompt),
                ...memory.map(m => m.role === "user" ? new HumanMessage(m.content) : new AIMessage(m.content)),
                new HumanMessage(userMessage)
            ];

            if (retry > 0) {
                messages.push(new SystemMessage(`Previous validation failed:\n${JSON.stringify(lastErrors, null, 2)}\nOriginal:\n${lastContent}`));
            }

            try {
                logger.info(`[${this.id}] Calling model`);
                const res = await this.model.invoke(messages);
                const content = typeof res.content === "string" ? res.content.trim() : res.content;
                if (!content) return ["Empty model response."];

                lastContent = content;

                const validated = parseAndValidateResponse(content, this.schema);
                logger.info(`[${this.id}] Validation passed for type=${validated.type}`);

                addMemory(userJid, "user", `[${fullMessageJSON.sender}] ${fullMessageJSON.content}`);
                addMemory(userJid, "assistant", validated.content.message || "[No message]");

                const meta = summarizeTokens(res);
                await saveApiLog({
                    chatId: remoteJid,
                    userId: userJid,
                    systemPrompt,
                    memoryPrompt,
                    userMessage,
                    modelResponse: content,
                    validation: validated,
                    modelResMeta: meta,
                    retryCount: retry,
                    metadata: { timestamp: jakartaTime(), rawResponse: res, memorySize: memory.length }
                });

                return this.handleResult(validated);

            } catch (err) {
                retry++;
                lastErrors = err.name === "ZodError" ? extractValidationErrors(err, true) : { error: err.message };
                logger.warn(`[${this.id}] Retry #${retry} failed:`, lastErrors);
            }
        }

        logger.error(`[${this.id}] Max retries reached.`);
        return ["The agent failed to produce a valid response after multiple attempts."];
    }
}
