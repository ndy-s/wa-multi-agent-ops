import { pipeline } from "@xenova/transformers";
import logger from "../../helpers/logger.js";

let embedderPipeline = null;

async function getEmbedder() {
    if (!embedderPipeline) {
        embedderPipeline = await pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2");
        logger.info("✅ Local embedding model loaded");
    }
    return embedderPipeline;
}

export async function embedQuery(text) {
    const embedder = await getEmbedder();

    const tensor = await embedder(text, { pooling: "mean", normalize: true });

    const vector = Array.from(tensor.data); 
    logger.info(`[embedQuery] vector length=${vector.length}`);
    return vector;
}

export async function embedDocuments(texts) {
    const embedder = await getEmbedder();
    const embeddings = [];

    for (const text of texts) {
        const tensor = await embedder(text, { pooling: "mean", normalize: true });
        const vector = Array.from(tensor.data);
        embeddings.push(vector);

        logger.info(`[embedDocuments] text="${text.slice(0,50)}..." vectorLength=${vector.length}`);
    }

    return embeddings;
}


