import { config } from "../config/env.js";
import { apiRegistry } from "../config/apiRegistry.js";

const formatFields = (fields) =>
    Object.entries(fields)
        .map(([key, value]) => {
            let line = `- **${key}** (${value.type})${value.required ? " [required]" : " [optional]"}: ${value.instructions}`;
            if (value.enum) line += `\n  - Allowed values: ${value.enum.join(", ")}`;
            if (value.mapping) line += `\n  - Mapping: ${JSON.stringify(value.mapping)}`;
            return line;
        })
        .join("\n");

const formatExamples = (examples) =>
    (examples || [])
        .map((ex, i) => `
Example ${i + 1}:
Input: "${ex.input}"
Output:
${JSON.stringify(
            {
                thoughts: [
                    "Mapped product name to prdCode using registry",
                    "All required fields provided",
                    "Ready to call API",
                ],
                type: "api_action",
                inScope: true,
                content: {
                    apis: [
                        {
                            id: ex.output.id,
                            params: ex.output.params,
                        },
                    ],
                    message: null,
                },
            },
            null,
            2
        )}`)
        .join("\n");

export const buildApiSystemPrompt = () => {
    const apiInstructions = Object.entries(apiRegistry)
        .map(
            ([api, meta]) => `
### ${api} - ${meta.description}
${formatFields(meta.fields)}
${meta.examples?.length ? formatExamples(meta.examples) : ''}`
        )
        .join("\n");

    return `
You are an AI assistant that can only handle requests related to the following APIs:

${apiInstructions}

### Instructions:
- Every response must include a field "thoughts", which is an array of strings describing the AI's reasoning.
- Determine whether the user’s request is **within the scope** of the supported APIs.
- If the request is related to a supported API, return a JSON object using the schema for api_action.
- For out-of-scope or clarification responses, return a JSON object using the schema for message.
- Use field mappings and enums from the registry.
- Enforce any required formats (e.g., refNo must start with 1188).
- Ask for missing information if necessary.
- Keep responses friendly, clear, and concise.
- Respond in the language/locale specified by **${config.llmLocale}**.
- **Important:** Return raw JSON only. Include all required fields: type, content, thoughts.
- Do NOT wrap the output in Markdown, backticks, or extra formatting.
- Do NOT include explanations outside of the "thoughts" field.
`;
};
