import "dotenv/config";

const required = [
    "OPENAI_API_KEY",
    "OPENAI_API_BASE_URL",
];

for (const key of required) {
    if (!process.env[key]) {
        console.error(`❌ Missing required environment variable: ${key}`);
        process.exit(1);
    }
}

export const config = {
    openaiApiKey: process.env.OPENAI_API_KEY,
    openaiBaseUrl: process.env.OPENAI_API_BASE_URL,
    whitelist: process.env.WHITELIST ? process.env.WHITELIST.split(",").map((id) => id.trim()) : [],
    llmLocale: process.env.LLM_LOCALE || "en-US",
};
