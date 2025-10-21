
export function formatLLMMessage(senderName, messageText, quotedContext) {
    return [
        `[User: ${senderName}]`,
        quotedContext,
        `Message: "${messageText}"`
    ].filter(Boolean).join("\n");
}

export function formatLLMMessageJSON(senderName, messageText, quotedContext) {
    return {
        sender: senderName,
        content: messageText.trim(),
        quotedContext: quotedContext.trim(),
        timestamp: new Date().toISOString()
    };
}

export function splitTextForChat(text, maxLength = 400) {
    if (!text) return [];

    // Convert escaped \n to real newlines first
    text = text.replace(/\\n/g, "\n");

    const chunks = [];
    let currentChunk = "";

    // Split paragraphs by real newlines
    const paragraphs = text.split(/\n+/).map(p => p.trim()).filter(Boolean);

    for (const para of paragraphs) {

        // Split sentences by punctuation — but ignore numbers like "1." or "10.000"
        const sentences = para.split(
            /(?<!\d)\. (?=[A-Z0-9])|(?<=[!?])\s+(?=[A-Z0-9])/
        );

        for (const sentence of sentences) {
            const s = sentence.trim();
            if (!s) continue;

            // If adding this sentence would exceed maxLength, finalize current chunk
            if ((currentChunk + " " + s).trim().length > maxLength) {
                const punctuationMatch = currentChunk.match(/^(.*[.!?])\s+[A-Z0-9]?.*$/);
                if (punctuationMatch) {
                    let chunk = punctuationMatch[1].trim().replace(/[!.]+(?=\s*$)/, "");
                    if (chunk) chunks.push(chunk);
                    const remainder = currentChunk.slice(punctuationMatch[1].length).trim();
                    currentChunk = remainder ? remainder + " " + s : s;
                } else {
                    let chunk = currentChunk.trim().replace(/[!.]+(?=\s*$)/, "");
                    if (chunk) chunks.push(chunk);
                    currentChunk = s;
                }
            } else {
                currentChunk += (currentChunk ? " " : "") + s;
            }

            // If sentence ends with strong punctuation, we can safely push a chunk
            if (/[.!?]$/.test(s) && currentChunk.length >= maxLength * 0.8) {
                let chunk = currentChunk.trim().replace(/[!.]+(?=\s*$)/, "");
                if (chunk) chunks.push(chunk);
                currentChunk = "";
            }
        }

        if (currentChunk) {
            let chunk = currentChunk.trim().replace(/[!.]+(?=\s*$)/, "");
            if (chunk) chunks.push(chunk);
            currentChunk = "";
        }
    }

    if (currentChunk) {
        let chunk = currentChunk.trim().replace(/[!.]+(?=\s*$)/, "");
        if (chunk) chunks.push(chunk);
    }

    return chunks;
}
