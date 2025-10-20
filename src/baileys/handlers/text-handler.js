import logger from "../../utils/logger.js";
import { getContactName } from "../../utils/contacts.js";
import {
    getDisplayName,
    parseJid,
    removeBotMention,
    replaceMentionsWithNames,
    simulateTypingAndSend,
    splitTextForChat,
    getQuotedContext,
    formatLLMMessageJSON
} from "../../utils/helpers.js";
import { invokeAgent } from "../../agents/api-agent.js";

export async function textHandler(sock, msg) {
    const { remoteJid, participant: participantJid } = msg.key;
    const isGroup = remoteJid.endsWith("@g.us");
    const senderJid = participantJid || remoteJid;
    const pushName = msg.pushName || "";

    const botLid = sock.user?.lid ? parseJid(sock.user.lid) : null;
    const botId = sock.user?.id ? parseJid(sock.user.id) : null;
    const botJid = botLid || botId;

    const mentions = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];

    if (isGroup) {
        const hasMention = mentions.includes(botJid);
        const hasQuoted = !!msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        if (!hasMention && !hasQuoted) {
            logger.info(`📭 Ignored group message in ${remoteJid} (no mention/quote)`);
            return;
        }
    }

    // Ensure the contact is up-to-date
    const senderName = getContactName(senderJid, sock.store.contacts) || getDisplayName(pushName);

    // Extract and clean message text
    let messageText = msg.message?.conversation || msg.message?.extendedTextMessage?.text || "";
    messageText = messageText.trim();
    messageText = removeBotMention(messageText, botJid);
    messageText = replaceMentionsWithNames(messageText, mentions, sock.store.contacts);

    // Handle quoted message context
    const contextInfo = msg.message.extendedTextMessage?.contextInfo;
    const quotedMsg = contextInfo?.quotedMessage;
    const quotedJid = contextInfo?.participant;
    const quotedBotJid = isGroup ? botLid : botId;
    const quotedContext = getQuotedContext(quotedMsg, quotedJid, sock.store.contacts, quotedBotJid);

    const fullMessageJSON = formatLLMMessageJSON(senderName, messageText, quotedContext);

    try {
        const replyPromise = invokeAgent(remoteJid, senderJid, fullMessageJSON, 2, true);

        (async () => {
            await new Promise(resolve => setTimeout(resolve, 3000));
            await sock.sendPresenceUpdate("composing", remoteJid);
        })();

        const replies = await replyPromise; 

        for (const reply of replies) {
            const chunks = splitTextForChat(reply, 100);

            for (const [index, chunk] of chunks.entries()) {
                await simulateTypingAndSend(sock, remoteJid, chunk, {
                    quoted: index === 0 ? msg : null,
                    skipTyping: index === 0, 
                    wpm: 120
                });
            }
        }

        logger.info(`✅ Replied to ${remoteJid}: ${replies.map(r => r.slice(0, 100)).join(" | ")}`);
    } catch (err) {
        logger.error(`❌ Error processing message from ${remoteJid}:`, err);

        try {
            await sock.sendMessage(remoteJid, {
                text: "⚠️ Sorry, something went wrong processing your message.",
            });
        } catch (sendErr) {
            logger.error(`❌ Failed to send error message to ${remoteJid}:`, sendErr);
        }
    } finally {
        try {
            await sock.sendPresenceUpdate("paused", remoteJid);
        } catch (presenceErr) {
            logger.warn(`⚠️ Failed to reset presence for ${remoteJid}:`, presenceErr);
        }
    }
}

