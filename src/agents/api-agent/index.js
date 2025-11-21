import { AgentBase } from "../base/AgentBase.js";
import { apiAgentSchema } from "./schema.js";
import { buildApiPrompt } from "./prompt.js";
import { handleApiResult } from "./handler.js";

export async function getApiAgent(modelManager) {
    const model = await modelManager.getModel();
    if (!model) return null;

    return new AgentBase({
        id: "apiAgent",
        model,
        schema: apiAgentSchema,
        buildPrompt: buildApiPrompt,
        handleResult: handleApiResult,
    });
}

