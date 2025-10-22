import logger from "../../helpers/logger.js";
import { getContactName } from "../../helpers/contacts.js";
import { getDisplayName, parseJid, removeBotMention } from "../../helpers/whatsapp.js";
import { getQuotedContext, replaceMentionsWithNames } from "../../helpers/mentions.js";
import { formatLLMMessageJSON, splitTextForChat } from "../../helpers/llm.js";
import { simulateTypingAndSend } from "../../helpers/simulate.js";
import { getAgent } from "../../agents/index.js";

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

    const presenceTimeout = setTimeout(async () => {
        await sock.sendPresenceUpdate("composing", remoteJid);
    }, 3000);

    try {
        const agent = await getAgent("api");
        if (!agent) {
            await sock.sendMessage(remoteJid, {
                text: "Sorry, the AI is temporarily unavailable. Please try again later",
            }, { quoted: msg });
            return;
        }

        const replies = await agent.invoke(remoteJid, senderJid, fullMessageJSON);
        for (const reply of replies) {
            const chunks = splitTextForChat(reply, 50);

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
        clearTimeout(presenceTimeout);
        logger.error(`❌ Error processing message from ${remoteJid}:`, err);

        if (msg) {
            await sock.sendMessage(remoteJid, {
                text: "Sorry, something went wrong processing your message",
            }, { quoted: msg });
        }
    } finally {
        clearTimeout(presenceTimeout);
        await sock.sendPresenceUpdate("paused", remoteJid);
    }
}

