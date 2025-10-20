import { pipeline } from "@xenova/transformers";
import logger from "../../utils/logger.js";

let embedderPipeline = null;

async function getEmbedder() {
    if (!embedderPipeline) {
        embedderPipeline = await pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2");
        logger.info("✅ Local embedding model loaded");
    }
    return embedderPipeline;
}

function meanPooling(tokens) {
    if (!tokens) return [];

    if (tokens instanceof Float32Array || tokens instanceof Float64Array) {
        return Array.from(tokens);
    }

    if (Array.isArray(tokens)) {
        if (Array.isArray(tokens[0])) {
            const dim = tokens[0].length;
            const mean = Array(dim).fill(0);
            tokens.forEach(token => {
                token.forEach((v, i) => mean[i] += v);
            });
            return mean.map(v => v / tokens.length);
        } else {
            return tokens.map(Number);
        }
    }

    return [];
}

export async function embedQuery(text) {
    const e = await getEmbedder();
    const tokens = await e(text);
    const vector = meanPooling(tokens);
    logger.info(`[embedQuery] vector length=${vector.length}`);
    return vector;
}

export async function embedDocuments(texts) {
    const e = await getEmbedder();
    const embeddings = [];

    for (const text of texts) {
        const tokens = await e(text);
        const vector = meanPooling(tokens);
        embeddings.push(vector);
        logger.info(`[embedDocuments] text=${text.slice(0,50)} vectorLength=${vector.length}`);
    }

    return embeddings;
}
