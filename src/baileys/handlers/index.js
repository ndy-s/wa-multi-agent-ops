import { textHandler } from "./textHandler.js";
import { stickerHandler } from "./stickerHandler.js";
import { reactionHandler } from "./reactionHandler.js";
import { config } from "../../config/env.js";
import logger from "../../utils/logger.js"; 
import { loadContacts, upsertContact } from "../../utils/contacts.js";

const handlers = {
    conversation: textHandler,
    extendedTextMessage: textHandler,
    stickerMessage: stickerHandler,
    reactionMessage: reactionHandler,
};

export async function handleMessage(sock, msg) {
    const remoteJid = msg?.key?.remoteJid;
    if (!remoteJid) return;

    if (!config.whitelist.includes(remoteJid)) {
        logger.warn(`🚫 Ignored non-whitelisted sender: ${remoteJid}`);
        return;
    }

    const messageType = msg?.message ? Object.keys(msg.message)[0] : null;
    if (!messageType) return;

    sock.store.contacts = { ...loadContacts(), ...sock.store.contacts };
    upsertContact(msg, sock);

    const preview = (() => {
        try {
            if (msg.message.conversation) return msg.message.conversation.slice(0, 100);
            if (msg.message.extendedTextMessage) return msg.message.extendedTextMessage.text.slice(0, 100);
            return JSON.stringify(msg.message).slice(0, 100);
        } catch {
            return "Unable to preview message";
        }
    })();

    logger.info(`📩 Message from ${remoteJid} [${messageType}]: ${preview}`);

    const handler = handlers[messageType];
    if (handler) {
        try {
            await handler(sock, msg);
        } catch (err) {
            logger.error(`❌ Error in handler for ${messageType} from ${remoteJid}:`, err);
        }
    } else {
        logger.warn(`⚠️ Unhandled message type: ${messageType} from ${remoteJid}`);
    }
}

