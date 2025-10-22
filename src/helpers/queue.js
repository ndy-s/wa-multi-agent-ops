const chatQueues = new Map();
const isProcessing = new Map();

export function enqueueMessage(chatId, handler) {
    if (!chatQueues.has(chatId)) {
        chatQueues.set(chatId, []);
        isProcessing.set(chatId, false);
    }

    chatQueues.get(chatId).push(handler);

    if (!isProcessing.get(chatId)) {
        processQueue(chatId);
    }
}

async function processQueue(chatId) {
    const queue = chatQueues.get(chatId);
    if (!queue || queue.length === 0) {
        isProcessing.set(chatId, false);
        return;
    }

    isProcessing.set(chatId, true);
    const handler = queue.shift();

    try {
        await handler();
    } catch (err) {
        console.error(`[queue] Error processing message in ${chatId}:`, err);
    }

    setImmediate(() => processQueue(chatId));
}
