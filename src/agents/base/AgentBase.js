import { AIMessage, HumanMessage, SystemMessage } from "@langchain/core/messages";
import logger from "../../helpers/logger.js";
import { parseAndValidateResponse, extractValidationErrors } from "./response-validator.js";
import { addMemory, getRecentMemory } from "../../helpers/memory-store.js";
import { saveApiLog } from "../../repositories/api-log-repository.js";
import { jakartaTime, stripCodeBlock, summarizeTokens } from "../../helpers/utils.js";

export class AgentBase {
    constructor({ id, model, schema, buildPrompt, handleResult, saveMemory = true }) {
        this.id = id;
        this.model = model;
        this.schema = schema;
        this.buildPrompt = buildPrompt;
        this.handleResult = handleResult;
        this.saveMemory = saveMemory;
    }

    parseModelContent(res) {
        if (!res || res.content === undefined || res.content === null) return "";
        return typeof res.content === "string"
            ? stripCodeBlock(res.content.trim())
            : res.content;
    }

    async logApi(params) {
        await saveApiLog({
            chatId: params.remoteJid,
            userId: params.userJid,
            systemPrompt: params.systemPrompt,
            memoryPrompt: params.memoryPrompt,
            userMessage: params.userMessage,
            modelResponse: params.modelResponse ?? null,
            validation: params.validation ?? null,
            modelResMeta: params.modelResMeta ?? null,
            retryCount: params.retryCount ?? 0,
            success: params.success ?? false,
            errorMessage: params.errorMessage ?? null,
            metadata: {
                timestamp: jakartaTime(),
                memorySize: params.memorySize,
                ...params.metadata
            }
        });
    }

    buildMessages(systemPrompt, memory, userMessage, retry, lastErrors, lastContent) {
        const normalizeRole = (role) => {
            if (role.toLowerCase() === "user") return "User";
            if (role.toLowerCase() === "sqlagent") return "SQL Agent";
            if (role.toLowerCase() === "apiagent") return "API Agent";
            if (role.toLowerCase() === "assistant") return "Assistant";
            return role;
        };

        const messages = [
            new SystemMessage(systemPrompt),
            ...memory.map(m => {
                if (m.role === "user") return new HumanMessage(m.content);

                const agentLabel = normalizeRole(m.role);
                const contentWithAgent = `[${agentLabel}] ${m.content}`;

                return new AIMessage(contentWithAgent);
            }),
            new HumanMessage(userMessage)
        ];

        if (retry > 0) {
            messages.push(
                new HumanMessage(
                    `Previous validation failed:\n${JSON.stringify(lastErrors, null, 2)}\nOriginal:\n${lastContent}`
                )
            );
        }

        return messages;
    }

    async invoke(remoteJid, userJid, fullMessageJSON, maxRetries = 2) {
        let retry = 0;
        let lastErrors = {};
        let lastContent = "";
        let meta;

        const memory = getRecentMemory(userJid);
        const memorySize = memory.length;

        const { systemPrompt, memoryPrompt, userMessage } = await this.buildPrompt(fullMessageJSON, memory);

        while (retry <= maxRetries) {
            const messages = this.buildMessages(
                systemPrompt,
                memory,
                userMessage,
                retry,
                lastErrors,
                lastContent
            );

            try {
                logger.info(`[${this.id}] Calling model (retry #${retry})`);

                const res = await this.model.invoke(messages);
                const rawContent = this.parseModelContent(res);

                lastContent = rawContent;
                meta = summarizeTokens(res, this.model);

                if (!rawContent) {
                    lastErrors = { error: "Empty model response" };
                    retry++;

                    logger.error(`[${this.id}] Empty model response, retrying #${retry}`);

                    await this.logApi({
                        remoteJid,
                        userJid,
                        systemPrompt,
                        memoryPrompt,
                        userMessage,
                        modelResponse: rawContent,
                        modelResMeta: meta,
                        retryCount: retry,
                        success: false,
                        errorMessage: "Empty model response",
                        memorySize
                    });

                    continue;
                }

                const validated = parseAndValidateResponse(rawContent, this.schema);
                logger.info(`[${this.id}] Validation passed (type=${validated.type})`);

                if (this.saveMemory) {
                    addMemory(userJid, "user", `[${fullMessageJSON.sender}] ${fullMessageJSON.content}`);
                    addMemory(userJid, `${this.id}`, validated.content.message || "[Pending processing API/SQL confirmation]");
                }

                await this.logApi({
                    remoteJid,
                    userJid,
                    systemPrompt,
                    memoryPrompt,
                    userMessage,
                    modelResponse: rawContent,
                    validation: validated,
                    modelResMeta: meta,
                    retryCount: retry,
                    success: true,
                    memorySize,
                    metadata: { rawResponse: res }
                });

                return this.handleResult(validated);
            } catch (err) {
                const errorMsg = err?.message || JSON.stringify(err);

                // Handle rate limits
                if (err?.code === 429) {
                    logger.error(`[${this.id}] Rate limit error: ${errorMsg}`);

                    await this.logApi({
                        remoteJid,
                        userJid,
                        systemPrompt,
                        memoryPrompt,
                        userMessage,
                        errorMessage: errorMsg,
                        modelResMeta: meta,
                        retryCount: retry,
                        success: false,
                        memorySize,
                        metadata: { rateLimit: true }
                    });

                    return ["Sorry, the AI is temporarily unavailable. Please try again later."];
                }

                // Normal errors 
                retry++;

                lastErrors = err.name === "ZodError"
                    ? extractValidationErrors(err, true)
                    : { error: errorMsg };

                logger.warn(`[${this.id}] Retry #${retry} failed`, lastErrors);

                await this.logApi({
                    remoteJid,
                    userJid,
                    systemPrompt,
                    memoryPrompt,
                    userMessage,
                    modelResponse: lastContent,
                    modelResMeta: meta,
                    errorMessage: errorMsg,
                    retryCount: retry,
                    success: false,
                    memorySize
                });
            }
        }

        logger.error(`[${this.id}] Max retries reached.`);
        return ["The agent failed to produce a valid response after multiple attempts."];
    }
}
