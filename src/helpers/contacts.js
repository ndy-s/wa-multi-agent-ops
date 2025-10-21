import fs from "fs";
import path from "path";
import logger from "./logger.js";
import { getDisplayName } from "./whatsapp.js";

const CONTACTS_DIR = path.resolve("./data");
const CONTACTS_FILE = path.join(CONTACTS_DIR, "contacts.json");

if (!fs.existsSync(CONTACTS_DIR)) {
    fs.mkdirSync(CONTACTS_DIR, { recursive: true });
}

if (!fs.existsSync(CONTACTS_FILE)) {
    fs.writeFileSync(CONTACTS_FILE, JSON.stringify({}, null, 2), { flag: "wx" });
    logger.info("📁 Created new contacts file:", CONTACTS_FILE);
}

let contactsCache = null;

export function loadContacts(forceReload = false) {
    try {
        if (contactsCache && !forceReload) return contactsCache;

        const data = fs.readFileSync(CONTACTS_FILE, "utf-8");
        contactsCache = JSON.parse(data || "{}");
    } catch (err) {
        logger.error("❌ Failed to load contacts:", err);
        contactsCache = {};
    }
    return contactsCache;
}

export function saveContacts() {
    if (!contactsCache) return;

    try {
        const tempFile = CONTACTS_FILE + ".tmp";
        fs.writeFileSync(tempFile, JSON.stringify(contactsCache, null, 2));
        fs.renameSync(tempFile, CONTACTS_FILE);
    } catch (err) {
        logger.error("❌ Failed to save contacts:", err);
    }
}

export function upsertContact(msg, sock) {
    const contacts = loadContacts(true);

    const name = getDisplayName(msg?.pushName);
    const remoteJid = msg?.key?.remoteJid;
    const participant = msg?.key?.participant || msg?.key?.senderLid;
    const isGroup = remoteJid?.endsWith("@g.us");
    const id = isGroup ? msg?.key?.participantPn : msg?.key?.remoteJid;
    const lastSeen = Math.floor(Date.now() / 1000);
    const existing = contacts[id];

    if (existing) {
        existing.name = name;
        existing.lastSeen = lastSeen;

        existing.aliases = existing.aliases || [];
        if (participant && !existing.aliases.includes(participant)) {
            existing.aliases.push(participant);
        }

        existing.privateChats = existing.privateChats || [];
        existing.groups = existing.groups || [];
        if (isGroup && remoteJid && !existing.groups.includes(remoteJid)) {
            existing.groups.push(remoteJid);
        } else if (!isGroup && remoteJid && !existing.privateChats.includes(remoteJid)) {
            existing.privateChats.push(remoteJid);
        }

        logger.info(`🔄 Updated contact: ${name} (${id})`);
    } else {
        contacts[id] = {
            id,
            name,
            aliases: participant ? [participant] : [],
            privateChats: isGroup ? [] : remoteJid ? [remoteJid] : [],
            groups: isGroup && remoteJid ? [remoteJid] : [],
            lastSeen,
        };
        logger.info(`🆕 Added new contact: ${name} (${id})`);
    }

    contactsCache = contacts;
    saveContacts();

    sock.store.contacts = { ...contacts, ...sock.store.contacts };
}

export function getContactName(jidOrLid, contacts = null) {
    contacts = contacts || loadContacts();
    if (contacts[jidOrLid]) return contacts[jidOrLid].name;

    for (const contact of Object.values(contacts)) {
        if (contact.aliases?.includes(jidOrLid)) return contact.name;
    }

    return "someone";
}

