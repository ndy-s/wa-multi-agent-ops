import { AgentBase } from "../base/AgentBase.js";
import { handleSqlResult } from "./handler.js";
import { buildSqlPrompt } from "./prompt.js";
import { sqlAgentSchema } from "./schema.js";

export async function getSqlAgent(modelManager) {
    const model = await modelManager.getModel();
    if (!model) return null;

    return new AgentBase({
        id: "sqlAgent",
        model,
        schema: sqlAgentSchema,
        buildPrompt: buildSqlPrompt,
        handleResult: handleSqlResult,
    });
}
