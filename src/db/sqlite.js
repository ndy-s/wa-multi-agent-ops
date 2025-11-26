import fs from "fs";
import path from "path";
import DatabaseLocal from "better-sqlite3";
import logger from "../helpers/logger.js";

let dbLocalInstance = null;

async function seedDefaultSettings(db) {
    const defaults = [
        ["WHITELIST", "", "string", 0],

        ["ENABLE_CLASSIFIER", "true", "boolean", 0],
        ["ENABLE_API_AGENT", "true", "boolean", 0],
        ["ENABLE_SQL_AGENT", "true", "boolean", 0],

        ["SQL_KEYWORDS", "sql", "string", 0],
        ["API_KEYWORDS", "api", "string", 0],
        ["API_CUSTOM_HEADERS", "", "string", 0],

        ["BASE_API_URL", "http://localhost:55555/api-dummy", "string", 0],

        ["ORACLE_USER", "", "string", 1],
        ["ORACLE_PASSWORD", "", "string", 1],
        ["ORACLE_CONNECT_STRING", "", "string", 1],

        ["OPENAI_API_KEYS", "", "string", 1],
        ["GOOGLEAI_API_KEYS", "", "string", 1],
        ["OPENROUTER_API_KEYS", "", "string", 1],
        ["OPENROUTER_BASE_URL", "https://openrouter.ai/api/v1", "string", 0],

        ["LLM_LOCALE", "en-US", "string", 0],
        ["MODEL_PRIORITY", "gemini,deepseek", "string", 0],

        ["USE_EMBEDDING", "true", "boolean", 0],
        ["EMBEDDING_MODEL", "minilm", "string", 0],
        ["EMBEDDING_LIMIT_SQL", "3", "number", 0],
        ["EMBEDDING_LIMIT_SCHEMA", "6", "number", 0],
        ["EMBEDDING_LIMIT_API", "2", "number", 0],
    ];

    const stmt = db.prepare(`
        INSERT OR IGNORE INTO app_settings (key, value, type, is_secret)
        VALUES (?, ?, ?, ?)
    `);

    for (const row of defaults) {
        stmt.run(row);
    }

    logger.info("🌱 Seeded default values into app_settings");
}

export async function openSqliteDB() {
    if (dbLocalInstance) return dbLocalInstance;

    try {
        const DATA_DIR = path.resolve("./data");
        if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

        const dbFile = path.join(DATA_DIR, "local.db");
        const isNewDB = !fs.existsSync(dbFile);

        dbLocalInstance = new DatabaseLocal(dbFile);

        if (isNewDB) {
            logger.info(`🆕 Created new SQLite local database: ${dbFile}`);
        } else {
            logger.info(`🌐 Connected to existing SQLite local database: ${dbFile}`);
        }

        dbLocalInstance.exec(`
            CREATE TABLE IF NOT EXISTS api_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                chat_id TEXT,
                user_id TEXT,
                system_prompt TEXT,
                memory_prompt TEXT,
                user_message TEXT,
                model_response TEXT,
                validation_type TEXT,
                success INTEGER DEFAULT 1,
                error_message TEXT,
                model_name TEXT,
                token_prompt INTEGER,
                token_completion INTEGER,
                token_total INTEGER,
                retry_count INTEGER DEFAULT 0,
                metadata TEXT DEFAULT '{}',
                created_at DATETIME DEFAULT (datetime('now','localtime'))
            );
        `);

        dbLocalInstance.exec(`
            CREATE TABLE IF NOT EXISTS app_settings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                key TEXT UNIQUE NOT NULL,
                value TEXT,
                type TEXT DEFAULT 'string',
                is_secret INTEGER DEFAULT 0,
                updated_at DATETIME DEFAULT (datetime('now','localtime'))
            );
        `);

        const rowCount = dbLocalInstance.prepare(`SELECT COUNT(*) AS count FROM app_settings`).get();

        if (rowCount.count === 0) {
            await seedDefaultSettings(dbLocalInstance);
        }

        logger.info("✅ Local database tables ready (api_logs & app_settings)");
    } catch (err) {
        logger.error("❌ Failed to initialize local DB:", err);
        throw err;
    }

    return dbLocalInstance;
}


