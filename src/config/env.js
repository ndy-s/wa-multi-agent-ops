import "dotenv/config";

const required = [
    "APP_AUTH_USER",
    "APP_AUTH_PASS",

    "BASE_API_URL",

    "ORACLE_USER",
    "ORACLE_PASSWORD",
    "ORACLE_CONNECT_STRING",

    "OPENROUTER_API_KEYS",
    "OPENROUTER_BASE_URL",
];

const sqliteType = process.env.SQLITE_TYPE || "local";
const useEmbedding = process.env.USE_EMBEDDING === "true";
const embeddingModel = process.env.EMBEDDING_MODEL || "minilm";

// Conditional requirements
if (sqliteType === "cloud") {
    required.push("SQLITE_URL");
}

if (useEmbedding && embeddingModel.toLowerCase().includes("gpt3")) {
    required.push("OPENAI_API_KEYS");
}

for (const key of required) {
    if (!process.env[key]) {
        console.error(`❌ Missing required environment variable: ${key}`);
        process.exit(1);
    }
}

const parseEnvList = (value) => (value || "")
    .split(",")
    .map(v => v.trim())
    .filter(Boolean);

const baseEmbeddingLimit = parseInt("3", 10);

export const config = {
    appAuthUser: process.env.APP_AUTH_USER,
    appAuthPass: process.env.APP_AUTH_PASS,

    baseApiUrl: process.env.BASE_API_URL,

    sqliteType,
    sqliteUrl: process.env.SQLITE_URL,

    oracleUser: process.env.ORACLE_USER,
    oraclePassword: process.env.ORACLE_PASSWORD,
    oracleConnectString: process.env.ORACLE_CONNECT_STRING,

    whitelist: parseEnvList(process.env.WHITELIST),

    llmLocale: process.env.LLM_LOCALE || "en-US",
    useEmbedding,
    embeddingLimitSql: parseInt(process.env.EMBEDDING_LIMIT_SQL ?? baseEmbeddingLimit, 10),
    embeddingLimitSchema: parseInt(process.env.EMBEDDING_LIMIT_SCHEMA ?? baseEmbeddingLimit, 10),
    embeddingLimitApi: parseInt(process.env.EMBEDDING_LIMIT_API ?? baseEmbeddingLimit, 10),
    embeddingModel,

    openaiApiKeys: parseEnvList(process.env.OPENAI_API_KEYS),

    googleaiApiKeys: parseEnvList(process.env.GOOGLEAI_API_KEYS),

    openrouterApiKeys: parseEnvList(process.env.OPENROUTER_API_KEYS),
    openrouterBaseUrl: process.env.OPENROUTER_BASE_URL,
};

console.log(
    `[config] Loaded ${config.openaiApiKeys.length} OpenAI key(s), ${config.googleaiApiKeys.length} GoogleAI key(s), and ${config.openrouterApiKeys.length} OpenRouter key(s)`
);
