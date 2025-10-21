import { getContactName } from "./contacts.js";

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

export function getQuotedContext(quotedMsg, quotedJid, contacts, botJid) {
    if (!quotedMsg) return "";

    let quotedText = quotedMsg.conversation || quotedMsg.extendedTextMessage?.text || "";
    const quotedMentions = quotedMsg.extendedTextMessage?.contextInfo?.mentionedJid || [];
    quotedText = replaceMentionsWithNames(quotedText, quotedMentions, contacts, botJid);

    const quotedName = quotedJid === botJid ? "Assistant" : getContactName(quotedJid, contacts);
    return `Replying to ${quotedName}: "${quotedText}"`;
}

