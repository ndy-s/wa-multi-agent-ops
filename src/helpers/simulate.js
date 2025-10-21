
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


