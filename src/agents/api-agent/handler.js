export function handleApiResult(validated) {
    const messages = [];
    if (validated.type === "api_action") {
        if (validated.content.message) messages.push(validated.content.message);

        for (const api of validated.content.apis || []) {
            messages.push(`API: ${api.id}, Params: ${JSON.stringify(api.params)}`);
        }
    } else if (validated.type === "message") {
        messages.push(validated.content.message || "Need more details.");
    } else {
        messages.push("Unexpected response type.");
    }
    return messages;
}
