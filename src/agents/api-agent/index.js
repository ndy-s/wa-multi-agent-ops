import { AgentBase } from "../base/AgentBase.js";
import { apiAgentSchema } from "./schema.js";
import { buildApiPrompt } from "./prompt.js";
import { handleApiResult } from "./handler.js";
import { ModelManager } from "../../models/llms/ModelManager.js";

const modelManager = new ModelManager(["deepseek", "gemini"]);

export async function getApiAgent() {
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

