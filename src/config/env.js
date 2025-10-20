import "dotenv/config";

const required = [
    "OPENAI_API_KEY",
    "OPENROUTER_API_KEY",
    "OPENROUTER_BASE_URL",
];

const sqliteType = process.env.SQLITE_TYPE || "local";
if (sqliteType === "cloud" && !process.env.SQLITE_URL) {
    console.error(`❌ Missing required environment variable for cloud SQLite: SQLITE_URL`);
    process.exit(1);
}

for (const key of required) {
    if (!process.env[key]) {
        console.error(`❌ Missing required environment variable: ${key}`);
        process.exit(1);
    }
}

export const config = {
    whitelist: process.env.WHITELIST ? process.env.WHITELIST.split(",").map((id) => id.trim()) : [],

    llmLocale: process.env.LLM_LOCALE || "en-US",
    embedderType: process.env.EMBEDDER_TYPE || "local",

    sqliteType,
    sqliteUrl: process.env.SQLITE_URL,

    openaiApiKey: process.env.OPENAI_API_KEY,

    openrouterApiKey: process.env.OPENROUTER_API_KEY,
    openrouterBaseUrl: process.env.OPENROUTER_BASE_URL,
};
