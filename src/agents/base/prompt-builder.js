import logger from "../../helpers/logger.js";
import { loadConfig } from "../../config/env.js";
import { agentPromptsRepository } from "../../repositories/agent-prompts-repository.js";

const config = await loadConfig();

export function buildMemoryPrompt(shortTermMemory) {
    return shortTermMemory
        .map(m => `${m.role.toUpperCase()}: ${m.content}`)
        .join("\n");
}

async function fetchAgentPrompt(agent) {
    let content = await agentPromptsRepository.get(agent);

    if (!content) {
        logger.warn(`[prompt-builder] No prompt found for agent "${agent}", using empty string`);
        content = "";
    }

    return content;
}

export async function classifierRegistryPrompt() {
    return await fetchAgentPrompt("classifier");
}

export async function apiRegistryPrompt(apis) {
   let template = await fetchAgentPrompt("api");

    const apiInstructions = apis.map(({ id, meta }) => {
        const fields = Object.entries(meta.fields || {})
            .map(([key, value]) => {
                let line = `- **${key}** (${value.type})${value.required ? " [required]" : " [optional]"}: ${value.instructions}`;
                if (value.enum) line += `\n  - Allowed values: ${value.enum.join(", ")}`;
                if (value.mapping) line += `\n  - Mapping: ${JSON.stringify(value.mapping)}`;
                return line;
            }).join("\n");

        const examples = (meta.examples || []).map((ex, i) => `
Example ${i + 1}:
Input: "${ex.input}"
Output: ${JSON.stringify({
    thoughts: [
        "Mapped product name to prdCode using registry",
        "All required fields provided",
        "Ready to call API",
    ],
    type: "api_action",
    inScope: true,
    content: { apis: [{ id: ex.output.id, params: ex.output.params }], message: null },
}, null, 2)}`).join("\n");

        return `### ${id || ""} - ${meta.description}\n${fields}\n${examples}`;
    }).join("\n");

    template = template.replace("{{API_LIST}}", apiInstructions);

    return template;
}

export async function sqlRegistryPrompt(sqls, schemas) {
    let template = await fetchAgentPrompt("sql");

    const sqlText = sqls.map(({ id, meta }) => {
        const params = (meta.params || []).join(", ") || "none";
        return `
### SQL Registry Entry
ID: ${id}
Description: ${meta.description}
Query: ${meta.query}
Parameters: ${params}`;
    }).join("\n");

    const schemaText = schemas.map(({ id, meta }) => {
        const columns = meta.columns.map(c => `- ${c.name} (${c.type}): ${c.description}`).join("\n");
        const relations = (meta.relations || []).map(r => `- ${r.column} -> ${r.references} (${r.description})`).join("\n") || "- none";
        return `
### Schema Entry
ID: ${id}
Table: ${meta.table}
Description: ${meta.description}
Columns:
${columns}
Relations:
${relations}`;
    }).join("\n");

    template = template
        .replace("{{SQL_REGISTRY}}", sqlText)
        .replace("{{SCHEMA}}", schemaText)
        .replace(/{{LOCALE}}/g, config.llmLocale || "en-US");

    return template;
}


