import * as gpt3s from "./gpt3s-embedder.js";
import * as minilm from "./minilm-embedder.js";
import { config } from "../../config/env.js";

const embedders = {
    gpt3s,
    minilm
};

export const embedder = embedders[config.embeddingModel] || minilm;

console.log(`[embedder] ${config.useEmbedding ? `Using embedding model: ${config.embeddingModel || "minilm"}` : "Embeddings disabled"}`);
