import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { model } from "../models/deepseek.js";
import { buildApiSystemPrompt } from "../prompts/buildApiSystemPrompt.js";
import { parseAndValidateResponse, extractValidationErrors } from "../utils/helpers.js";

export async function invokeAgent(userMessage, maxRetries = 2) {
    let retryCount = 0;
    let lastContent = "";
    let lastErrors = {};

    while (retryCount <= maxRetries) {
        const messages = [
            new SystemMessage(buildApiSystemPrompt()),
            new HumanMessage(`User request: ${userMessage}`)
        ];

        if (retryCount > 0) {
            messages.push(
                new SystemMessage(
                    `Previous response failed validation:\n${JSON.stringify(lastErrors, null, 2)}\n` +
                    `Original response:\n${lastContent}\n` +
                    `Please correct it following the schema strictly.`
                )
            );
        }

        console.log(messages);

        try {
            const res = await model.invoke(messages);
            const content = res?.content?.trim();
            lastContent = content;

            if (!content) return "I couldn't understand your request.";

            const validated = parseAndValidateResponse(content);

            if (validated.type === "api_action") {
                return validated.content.apis
                    .map(a => `API: ${a.id}, Params: ${JSON.stringify(a.params)}`)
                    .join("\n");
            }

            if (validated.type === "message") {
                return validated.content.message || "I need more details.";
            }

            return "Unexpected response type from model.";

        } catch (err) {
            retryCount++;
            if (err.name === "ZodError") {
                lastErrors = extractValidationErrors(err, true);
                console.warn(`Validation failed (attempt ${retryCount}):`, lastErrors);
            } else {
                lastErrors = { error: err.message || "Unknown error" };
                console.warn(`Error (attempt ${retryCount}):`, lastErrors);
            }
        }
    }

    return "The model could not produce a valid response after multiple attempts.";
}
