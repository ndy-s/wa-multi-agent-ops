import fs from "fs";
import path from "path";
import logger from "../../helpers/logger.js";
import { embedder } from "../../models/embedders/index.js";
import { config } from "../../config/env.js";
import { cosine, flatten, hashText } from "./utils.js";

const DATA_DIR = path.resolve("./data");
export class EmbeddingStore {
    constructor(storeName) {
        this.storeName = storeName;
        this.filePath = path.join(DATA_DIR, `${storeName}-${config.embeddingModel}.json`);
        this.cache = null;

        if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
        if (!fs.existsSync(this.filePath)) {
            fs.writeFileSync(this.filePath, JSON.stringify([], null, 2), { flag: "wx" });
            logger.info(`📁 Created new embeddings file: ${this.filePath}`);
        }
    }

    async load(items = [], buildTextFn) {
        if (this.cache) return this.cache;

        logger.info(`[embedder] Loading embeddings from ${this.filePath}`);
        const existing = JSON.parse(fs.readFileSync(this.filePath, "utf-8"));
        const existingMap = Object.fromEntries(existing.map(e => [e.id, e]));

        const toEmbed = [];

        logger.info(`[embedder] Checking for new or updated items... total items=${items.length}`);
        for (const item of items) {
            const text = buildTextFn(item);
            const hash = hashText(text);
            const prev = existingMap[item.id];

            if (!prev || prev.hash !== hash) {
                toEmbed.push({ ...item, text, hash });
            }
        }

        // Remove old items no longer present
        for (const id of Object.keys(existingMap)) {
            if (!items.find(i => i.id === id)) delete existingMap[id];
        }

        if (toEmbed.length > 0) {
            logger.info(`[embedder] ${toEmbed.length} items need new embeddings: ${toEmbed.map(t => t.id).join(", ")}`);
            const vectors = await embedder.embedDocuments(toEmbed.map(t => t.text));

            toEmbed.forEach((t, i) => {
                existingMap[t.id] = {
                    ...t,
                    embedding: flatten(vectors[i]),
                    hash: t.hash
                };
            });

            fs.writeFileSync(this.filePath, JSON.stringify(Object.values(existingMap), null, 2));
            logger.info(`✅ Updated embeddings file: ${this.filePath}`);
        } else {
            logger.info("[embedder] No embeddings need updating.");
        }

        this.cache = Object.values(existingMap);
        return this.cache;
    }

    async findRelevant(query, topN = 3) {
        logger.info(`[embedder] Finding relevant items for query: "${query}"`);
        const items = this.cache || [];
        const queryVecRaw = await embedder.embedQuery(query);
        const queryVec = flatten(queryVecRaw);

        const scored = items.map(item => ({
            ...item,
            score: cosine(queryVec, item.embedding)
        }));

        const topItems = scored.sort((a, b) => b.score - a.score).slice(0, topN);
        logger.info(`[embedder] Top ${topN} relevant items: ${topItems.map(a => `${a.id}(${a.score.toFixed(3)})`).join(", ")}`);

        return topItems;
    }
}
