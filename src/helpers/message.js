import { PENDING_TIMEOUT, pendingAgentActions } from "../agents/base/utils.js";
import { splitTextForChat } from "./llm.js";
import logger from "./logger.js";
import { simulateTypingAndSend } from "./simulate.js";

function formatClassifierTip(selectedAgent) {
    const header = `💡 *Tip*`;
    const body =
        "To improve performance, you can include keywords like \"api\" or \"sql\" to route your request to a specific agent.\n\n" +
        `Your request is currently being processed by the "${selectedAgent}" agent. Please wait...`;

    return header + "\n\n" + body;
}

export async function sendClassifierTip(sock, originalMsg, remoteJid, selectedAgent) {
    const messageText = formatClassifierTip(selectedAgent);

    await sock.sendMessage(remoteJid, { text: messageText });
}

function formatPendingMessage(actionType, action, totalSeconds = 30) {
    const { id, params, query } = action;

    let header = "";
    let body = "";

    switch (actionType) {
        case "api":
            header = `*Pending API Confirmation*`;
            body = `API ID: \`${id || "(unknown)"}\`\n` +
                (params && Object.keys(params).length
                    ? `Parameters:\n\`\`\`json\n${JSON.stringify(params, null, 2)}\`\`\``
                    : "No parameters.");
            break;

        case "sql":
            header = `*Pending SQL Confirmation*`;
            const sqlQuery = query || "(no SQL provided)";
            const sqlParams = params && Object.keys(params).length
                ? `Parameters:\n\`\`\`json\n${JSON.stringify(params, null, 2)}\`\`\``
                : "No parameters.";
            body = `SQL ID: \`${id || "(unknown)"}\`\n` +
                   `Query:\n\`\`\`sql\n${sqlQuery}\n\`\`\`\n` +
                   sqlParams;
            break;

        default:
            header = `⚠️ Unknown action`;
            body = "Cannot process this request.";
    }

    return `${header}\n\n${body}\n\nReact 👍 to confirm within ${totalSeconds}s`;
}

export async function sendPendingAction(sock, originalMsg, actionType, remoteJid, userJid, action, index) {
    const adjustedTimeout = PENDING_TIMEOUT + index * 15000;
    const totalSeconds = Math.floor(adjustedTimeout / 1000);

    const pendingText = formatPendingMessage(actionType, action, totalSeconds);

    const sentMsg = await sock.sendMessage(
        remoteJid,
        { text: pendingText },
        { quoted: originalMsg }
    );

    pendingAgentActions[sentMsg.key.id] = {
        type: actionType,
        userJid,
        action,
        actionType,
        msgKey: sentMsg.key,
        timeout: setTimeout(async () => {
            const pending = pendingAgentActions[sentMsg.key.id];
            if (!pending) return; 

            const header = `⏰ *${actionType.toUpperCase()} Timeout*`;
            const body = `ID: \`${pending.action.id || "(unknown)"}\`\n` +
                `No confirmation received, so the action has been cancelled`;

            await sock.sendMessage(pending.userJid, {
                text: `${header}\n\n${body}`,
                edit: pending.msgKey,
            });

            delete pendingAgentActions[sentMsg.key.id];
        }, adjustedTimeout),
    };
}

export async function sendChunkedMessage(sock, remoteJid, msg, text) {
    const chunks = splitTextForChat(text, 50);
    for (const [index, chunk] of chunks.entries()) {
        await simulateTypingAndSend(sock, remoteJid, chunk, {
            quoted: index === 0 ? msg : null,
            skipTyping: index === 0,
            wpm: 120
        });
    }

    logger.info(`✅ Replied to ${remoteJid}: ${text.slice(0, 100)}`);
}
