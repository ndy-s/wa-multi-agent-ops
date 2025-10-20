import { OpenAIEmbeddings } from "@langchain/openai";
import { Chroma } from "@langchain/community/vectorstores/chroma";

const embeddings = new OpenAIEmbeddings();
const vectorStore = await Chroma.fromExistingCollection(embeddings, { 
    collectionName: "chat_memories" 
});

export async function addToVectorMemory(chatId, text) {
    await vectorStore.addDocuments([{
        pageContent: text,
        metadata: {
            chatId,
            timestamp: Date.now()
        }
    }]);
}

export async function recallVectorMemory(chatId, query, k = 3) {
    const results = await vectorStore.similaritySearch(query, k, { chatId });
    return results.map(r => r.pageContent).join("\n");
}
