import logger from "../../utils/logger.js";
import { parseJid } from "../../utils/helpers.js";
import {invokeAgent as agentInvoke } from "../../agents/apiAgentTest.js";

export async function textHandler(sock, msg) {
    const remoteJid = msg.key.remoteJid;
    const isGroup = remoteJid.endsWith("@g.us");

    if (isGroup) {
        const mentions = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
        const botJid = parseJid(sock.user.lid || sock.user.id);

        const hasMention = mentions.includes(botJid);
        const hasQuoted = !!msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;

        if (!hasMention && !hasQuoted) {
            logger.info(`📭 Ignored group message in ${remoteJid} (no mention/quote)`);
            return;
        }
    }

    const messageText =
        msg.message?.conversation ||
        msg.message?.extendedTextMessage?.text ||
        "Unable to preview message";

    try {
        await sock.sendPresenceUpdate("composing", remoteJid);

        const reply = await agentInvoke(messageText);

        await sock.sendMessage(remoteJid, { text: reply });

        logger.info(`✅ Replied to ${remoteJid}: ${reply.slice(0, 100)}`);
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

