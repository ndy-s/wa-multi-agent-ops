import {z} from "zod";
import {getContactName} from "./contacts.js";
import {apiAgentSchema} from "../schemas/api-agent-schema.js";

export function toWhatsappJid(number) {
    if (number.endsWith("@s.whatsapp.net") || number.endsWith("@g.us")) return number;
    return number.split("@")[0] + "@s.whatsapp.net";
}

export function parseJid(jid) {
    if (!jid) return "";

    const atIndex = jid.indexOf("@");
    if (atIndex === -1) {
        const colonIndex = jid.indexOf(":");
        return colonIndex === -1 ? jid : jid.slice(0, colonIndex);
    }

    const colonBeforeAt = jid.lastIndexOf(":", atIndex - 1);
    const local = colonBeforeAt === -1 ? jid.slice(0, atIndex) : jid.slice(0, colonBeforeAt);
    const domain = jid.slice(atIndex);
    return local + domain;
}

export function getDisplayName(pushName, jid) {
    if (pushName && pushName.trim()) return pushName.trim();

    const number = jid.split("@")[0];
    return `(unknown: ${number})`;
}

export function removeBotMention(text, botJid) {
    if (!text || !botJid) return text;

    const botNumber = botJid.split("@")[0];

    const regex = new RegExp(`@?${botNumber}(?:@\\S+)?`, "gi");
    return text.replace(regex, "").trim();
}


export function replaceMentionsWithNames(text, mentions = [], contacts = {}, botJid = null) {
    if (!text || !mentions.length) return text;

    let result = text;

    for (const jid of mentions) {
        const number = jid.split("@")[0]; 
        const name =
            botJid && jid === botJid
                ? "Assistant"
                : contacts[jid]?.name || "someone";

        const regex = new RegExp(`@${number}(?:@\\S+)?`, "gi");

        result = result.replace(regex, `@${name}`);
    }

    return result;
}

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

export function getQuotedContext(quotedMsg, quotedJid, contacts, botJid) {
    if (!quotedMsg) return "";

    let quotedText = quotedMsg.conversation || quotedMsg.extendedTextMessage?.text || "";
    const quotedMentions = quotedMsg.extendedTextMessage?.contextInfo?.mentionedJid || [];
    quotedText = replaceMentionsWithNames(quotedText, quotedMentions, contacts, botJid);

    const quotedName = quotedJid === botJid ? "Assistant" : getContactName(quotedJid, contacts);
    return `Replying to ${quotedName}: "${quotedText}"`;
}

export function extractValidationErrors(err) {
    if (!err || !err.errors) return { error: "Unknown validation error" };

    const missingFields = new Set();
    const invalidFields = new Set();

    function flattenErrors(errors, parentPath = []) {
        for (const e of errors) {
            const currentPath = [...parentPath, ...(e.path || [])].join('.') || "(root)";

            if (e.code === 'invalid_union' && e.unionErrors) {
                e.unionErrors.forEach(ue => flattenErrors(ue.issues, parentPath));
            } else if (e.issues) {
                flattenErrors(e.issues, parentPath);
            } else {
                // Classify errors (you can adjust based on Zod error codes)
                if (e.code === 'invalid_type' || e.code === 'custom') {
                    invalidFields.add(`${currentPath} (${e.message})`);
                } else if (e.code === 'invalid_literal' || e.code === 'invalid_enum_value' || e.code === 'required') {
                    missingFields.add(currentPath);
                } else {
                    invalidFields.add(`${currentPath} (${e.message})`);
                }
            }
        }
    }

    flattenErrors(err.errors);

    return {
        missingFields: Array.from(missingFields),
        invalidFields: Array.from(invalidFields)
    };
}

export function parseAndValidateResponse(content) {
    try {
        const parsed = JSON.parse(content);
        return apiAgentSchema.parse(parsed);
    } catch (err) {
        if (err instanceof SyntaxError) throw new Error(`JSON parsing error: ${err.message}`);
        if (err instanceof z.ZodError) throw err;
        throw err;
    }
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
                    let chunk = punctuationMatch[1].trim().replace(/[!.]+$/, "");
                    if (chunk) chunks.push(chunk);
                    const remainder = currentChunk.slice(punctuationMatch[1].length).trim();
                    currentChunk = remainder ? remainder + " " + s : s;
                } else {
                    let chunk = currentChunk.trim().replace(/[!.]+$/, "");
                    if (chunk) chunks.push(chunk); 
                    currentChunk = s;
                }
            } else {
                currentChunk += (currentChunk ? " " : "") + s;
            }

            // If sentence ends with strong punctuation, we can safely push a chunk
            if (/[.!?]$/.test(s) && currentChunk.length >= maxLength * 0.8) {
                let chunk = currentChunk.trim().replace(/[!.]+$/, "");
                if (chunk) chunks.push(chunk); 
                currentChunk = "";
            }
        }

        if (currentChunk) {
            let chunk = currentChunk.trim().replace(/[!.]+$/, "");
            if (chunk) chunks.push(chunk); 
            currentChunk = "";
        }
    }

    if (currentChunk) {
        let chunk = currentChunk.trim().replace(/[!.]+$/, "");
        if (chunk) chunks.push(chunk); 
    }

    return chunks;
}

export async function simulateTypingAndSend(sock, remoteJid, text, { quoted = null, skipTyping = false, wpm = 120 } = {}) {
    if (!skipTyping) {
        const words = text.trim().split(/\s+/).length;
        const typingTime = (words / wpm) * 60 * 1000; // ms
        const delay = Math.min(Math.max(typingTime, 800), 5000);

        await sock.sendPresenceUpdate("composing", remoteJid);
        await new Promise(resolve => setTimeout(resolve, delay));
    }

    await sock.sendMessage(remoteJid, { text }, quoted ? { quoted } : {});

    // Small random pause after sending to mimic thinking
    await new Promise(resolve => setTimeout(resolve, 800 + Math.random() * 700));
}

export function buildMemoryPrompt(shortTermMemory) {
    return shortTermMemory
        .map(m => {
            return `${m.role.toUpperCase()}: ${m.content}`;
        })
        .join("\n");
}
