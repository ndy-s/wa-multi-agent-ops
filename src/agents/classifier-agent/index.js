import { AgentBase } from "../base/AgentBase.js";
import { handleClassifierResult } from "./handler.js";
import { buildClassifierPrompt } from "./prompt.js";
import { classifierAgentSchema } from "./schema.js";

export async function getClassifierAgent(modelManager) {
    const model = await modelManager.getModel();
    if (!model) return null;

    return new AgentBase({
        id: "classifierAgent",
        model,
        schema: classifierAgentSchema,
        buildPrompt: buildClassifierPrompt,
        handleResult: handleClassifierResult,
        saveMemory: false
    });
}
