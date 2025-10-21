
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
