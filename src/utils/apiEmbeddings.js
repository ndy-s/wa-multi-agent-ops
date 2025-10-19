import fs from "fs";
import path from "path";
import crypto from "crypto";
import logger from "./logger.js";
import { embedder } from "../models/embedders/index.js";
import { apiRegistry } from "../config/apiRegistry.js";

const DATA_DIR = path.resolve("./data");
const EMBEDDINGS_FILE = path.join(DATA_DIR, "apiEmbeddings.json");

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(EMBEDDINGS_FILE)) {
    fs.writeFileSync(EMBEDDINGS_FILE, JSON.stringify([], null, 2), { flag: "wx" });
    logger.info("📁 Created new embeddings file:", EMBEDDINGS_FILE);
}

let cachedEmbeddings = null;

function hashText(text) {
    return crypto.createHash("sha256").update(text).digest("hex");
}

function buildApiText(apiId, meta) {
    const fields = Object.entries(meta.fields || {})
        .map(([k, v]) => `${k}: ${v.instructions || ""}`)
        .join(", ");
    const examples = (meta.examples || [])
        .map(e => `${e.input} -> ${JSON.stringify(e.output)}`)
        .join("; ");
    return `${apiId}: ${meta.description}. Fields: ${fields}. Examples: ${examples}`;
}

function flatten(arr) {
    if (!arr) return [];
    if (Array.isArray(arr)) return arr.flat(Infinity).map(Number);
    if (typeof arr === "number") return [arr];
    return [];
}

function cosine(a, b) {
    if (!a || !b || a.length !== b.length) return 0;
    const dot = a.reduce((sum, val, i) => sum + val * b[i], 0);
    const magA = Math.sqrt(a.reduce((sum, val) => sum + val ** 2, 0));
    const magB = Math.sqrt(b.reduce((sum, val) => sum + val ** 2, 0));
    return dot / (magA * magB + 1e-10);
}

export async function loadApiEmbeddings() {
    if (cachedEmbeddings) {
        logger.debug(`[embedder] Returning cached embeddings (${cachedEmbeddings.length} APIs)`);
        return cachedEmbeddings;
    }

    logger.info(`[embedder] Loading embeddings from ${EMBEDDINGS_FILE}`);
    let existing = JSON.parse(fs.readFileSync(EMBEDDINGS_FILE, "utf-8"));
    const existingMap = Object.fromEntries(existing.map(e => [e.id, e]));

    const toEmbed = [];

    logger.info(`[embedder] Checking for new or updated APIs... total APIs in registry=${Object.keys(apiRegistry).length}`);
    for (const [id, meta] of Object.entries(apiRegistry)) {
        const text = buildApiText(id, meta);
        const hash = hashText(text);
        const prev = existingMap[id];

        if (!prev || prev.hash !== hash) {
            toEmbed.push({ id, text, meta, hash });
        }
    }

    // Remove old APIs no longer in registry
    for (const id of Object.keys(existingMap)) {
        if (!apiRegistry[id]) {
            logger.info(`[embedder] Removing old API from cache: ${id}`);
            delete existingMap[id];
        }
    }

    if (toEmbed.length > 0) {
        logger.info(`[embedder] ${toEmbed.length} APIs need new embeddings: ${toEmbed.map(t => t.id).join(", ")}`);
        const vectors = await embedder.embedDocuments(toEmbed.map(t => t.text));
        logger.debug(`[embedder] Generated embeddings for ${vectors.length} APIs`);

        toEmbed.forEach((t, i) => {
            existingMap[t.id] = {
                id: t.id,
                embedding: flatten(vectors[i]),
                meta: t.meta,
                hash: t.hash,
            };
        });

        fs.writeFileSync(
            EMBEDDINGS_FILE,
            JSON.stringify(Object.values(existingMap), null, 2)
        );
        logger.info(`✅ Updated embeddings file: ${EMBEDDINGS_FILE}`);
    } else {
        logger.info("[embedder] No API embeddings need updating.");
    }

    cachedEmbeddings = Object.values(existingMap);
    return cachedEmbeddings;
}

export async function findRelevantApis(query, topN = 3) {
    logger.info(`[embedder] Finding relevant APIs for query: "${query}"`);
    const apis = await loadApiEmbeddings();
    const queryVecRaw = await embedder.embedQuery(query);
    const queryVec = flatten(queryVecRaw);

    const scored = apis.map(a => {
        const score = cosine(queryVec, a.embedding);
        logger.debug(`[embedder] API=${a.id} score=${score.toFixed(4)}`);
        return { id: a.id, meta: a.meta, score };
    });

    const topApis = scored.sort((a, b) => b.score - a.score).slice(0, topN);
    logger.info(`[embedder] Top ${topN} relevant APIs: ${topApis.map(a => `${a.id}(${a.score.toFixed(3)})`).join(", ")}`);

    return topApis;
}

