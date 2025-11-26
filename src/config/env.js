import "dotenv/config";
import { settingsRepository } from "../repositories/settings-repository.js";
import { sleep } from "../helpers/utils.js";
import logger from "../helpers/logger.js";

const parseList = (value) => (value || "").split(",").map(v => v.trim()).filter(Boolean);

const parseCustomHeaders = (raw) => {
    const headers = {};
    if (!raw) return headers;

    raw.split(",").forEach(pair => {
        const trimmed = pair.trim();
        if (!trimmed) return;

        const [key, ...rest] = trimmed.split(":");
        if (!key || rest.length === 0) return;

        headers[key.trim()] = rest.join(":").trim();
    });

    return headers;
}


const requiredEnv = ["APP_AUTH_USER", "APP_AUTH_PASS"];
for (const key of requiredEnv) {
    if (!process.env[key]) {
        console.error(`❌ Missing required environment variable: ${key}`);
        process.exit(1);
    }
}

const REQUIRED_KEYS = [
    "appAuthUser",
    "appAuthPass",
    "enableClassifier",
    "enableApiAgent",
    "enableSqlAgent",
    "sqlKeywords",
    "apiKeywords",
    "baseApiUrl",
    "oracleUser",
    "oraclePassword",
    "oracleConnectString",
    "llmLocale",
    "modelPriority",
    "useEmbedding",
    "embeddingModel",
    "embeddingLimitSql",
    "embeddingLimitSchema",
    "embeddingLimitApi",
    "openaiApiKeys",
    "googleaiApiKeys",
    "openrouterApiKeys",
    "openrouterBaseUrl",
];

export async function loadConfig() {
    const [
        enableClassifier,
        enableApiAgent,
        enableSqlAgent,
        sqlKeywords,
        apiKeywords,
        baseApiUrl,
        apiCustomHeaders,
        oracleUser,
        oraclePassword,
        oracleConnectString,
        whitelistRaw,
        llmLocale,
        modelPriority,
        useEmbeddingRaw,
        embeddingModel,
        embeddingLimitSqlRaw,
        embeddingLimitSchemaRaw,
        embeddingLimitApiRaw,
        openaiKeysRaw,
        googleaiKeysRaw,
        openrouterKeysRaw,
        openrouterBaseUrl,
    ] = await Promise.all([
        settingsRepository.get("ENABLE_CLASSIFIER"),
        settingsRepository.get("ENABLE_API_AGENT"),
        settingsRepository.get("ENABLE_SQL_AGENT"),
        settingsRepository.get("SQL_KEYWORDS"),
        settingsRepository.get("API_KEYWORDS"),
        settingsRepository.get("BASE_API_URL"),
        settingsRepository.get("API_CUSTOM_HEADERS"),
        settingsRepository.get("ORACLE_USER"),
        settingsRepository.get("ORACLE_PASSWORD"),
        settingsRepository.get("ORACLE_CONNECT_STRING"),
        settingsRepository.get("WHITELIST"),
        settingsRepository.get("LLM_LOCALE"),
        settingsRepository.get("MODEL_PRIORITY"),
        settingsRepository.get("USE_EMBEDDING"),
        settingsRepository.get("EMBEDDING_MODEL"),
        settingsRepository.get("EMBEDDING_LIMIT_SQL"),
        settingsRepository.get("EMBEDDING_LIMIT_SCHEMA"),
        settingsRepository.get("EMBEDDING_LIMIT_API"),
        settingsRepository.get("OPENAI_API_KEYS"),
        settingsRepository.get("GOOGLEAI_API_KEYS"),
        settingsRepository.get("OPENROUTER_API_KEYS"),
        settingsRepository.get("OPENROUTER_BASE_URL"),
    ]);

    return {
        appAuthUser: process.env.APP_AUTH_USER,
        appAuthPass: process.env.APP_AUTH_PASS,
        enableClassifier,
        enableApiAgent,
        enableSqlAgent,
        sqlKeywords: parseList(sqlKeywords),
        apiKeywords: parseList(apiKeywords),
        baseApiUrl,
        apiCustomHeaders: parseCustomHeaders(apiCustomHeaders),
        oracleUser,
        oraclePassword,
        oracleConnectString,
        whitelist: parseList(whitelistRaw),
        llmLocale: llmLocale || "en-US",
        modelPriority: parseList(modelPriority),
        useEmbedding: useEmbeddingRaw === true || useEmbeddingRaw === "true",
        embeddingModel: embeddingModel || "minilm",
        embeddingLimitSql: parseInt(embeddingLimitSqlRaw ?? 3, 10),
        embeddingLimitSchema: parseInt(embeddingLimitSchemaRaw ?? 3, 10),
        embeddingLimitApi: parseInt(embeddingLimitApiRaw ?? 3, 10),
        openaiApiKeys: parseList(openaiKeysRaw),
        googleaiApiKeys: parseList(googleaiKeysRaw),
        openrouterApiKeys: parseList(openrouterKeysRaw),
        openrouterBaseUrl,
    };
}

export async function assertRequiredConfig() {
    const config = await loadConfig();
    const missing = REQUIRED_KEYS.filter(
        (k) =>
            config[k] === undefined ||
            config[k] === null ||
            config[k] === "" ||
            (Array.isArray(config[k]) && config[k].length === 0)
    );

    if (missing.length > 0) {
        logger.warn(`⚠ Missing required config: ${missing.join(", ")}. Please set them in the dashboard.`);
        return false;
    }

    return true;
}

export async function validateConfig(intervalMs = 5000) {
    while (true) {
        const config = await loadConfig();
        const missingKeys = REQUIRED_KEYS.filter(
            (key) =>
                config[key] === undefined ||
                config[key] === null ||
                config[key] === "" ||
                (Array.isArray(config[key]) && config[key].length === 0)
        );

        if (missingKeys.length === 0) {
            logger.info(
                `[config] All required config is set. Loaded ${config.openaiApiKeys.length} OpenAI key(s), ${config.googleaiApiKeys.length} GoogleAI key(s), ${config.openrouterApiKeys.length} OpenRouter key(s)`
            );
            break;
        }

        logger.warn(
            `⚠ Missing required config values: ${missingKeys.join(", ")}. Please set them in the dashboard. Retrying in ${intervalMs / 1000}s...`
        );

        await sleep(intervalMs);
    }
}

