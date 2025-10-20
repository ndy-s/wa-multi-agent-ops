
const chatMemory = new Map();

export function getRecentMemory(userJid, limit = 5) {
    const mem = chatMemory.get(userJid) || [];
    return mem.slice(-limit);
}

export function addMemory(userJid, role, content) {
    const mem = chatMemory.get(userJid) || [];
    mem.push({ role, content, timestamp: Date.now() });
    chatMemory.set(userJid, mem);
}

export function clearMemory(userJid) {
    chatMemory.delete(userJid);
}
