import fs from "fs";
import path from "path";
import DatabaseLocal from "better-sqlite3";
import logger from "../helpers/logger.js";

let dbLocalInstance = null;

async function seedDefaultSettings(db) {
    try {
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
    } catch (err) {
        logger.error("❌ Failed to seed agent prompts:", err);
        throw err;
    }
}

async function seedAgentPrompts(db) {
    try {
        const jsonFile = path.resolve("./src/agents/base/agent-prompts.json");

        if (!fs.existsSync(jsonFile)) {
            logger.error(`❌ Agent prompts file not found at ${jsonFile}`);
            return;
        }

        const prompts = JSON.parse(fs.readFileSync(jsonFile, "utf-8"));

        const insertStmt = db.prepare(`
            INSERT INTO agent_prompts (agent, role, content)
            VALUES (?, ?, ?)
        `);

        let count = 0;
        for (const p of prompts) {
            insertStmt.run(p.agent, p.role, p.content);
            count++;
        }

        logger.info(`🌱 Seeded ${count} agent prompts into the database`);
    } catch (err) {
        logger.error("❌ Failed to seed agent prompts:", err);
        throw err;
    }
}

async function seedRegistry(db) {
    try {
        const apiRegistryJson = path.resolve("./src/agents/base/api-registry.json");
        const schemaRegistryJson = path.resolve("./src/agents/base/schema-registry.json");
        const sqlRegistryJson = path.resolve("./src/agents/base/sql-registry.json");

        const insertStmt = db.prepare(`
            INSERT OR IGNORE INTO registry (name, type, content)
            VALUES (?, ?, ?)
        `);

        let seeded = 0;

        const files = [
            { name: "API_REGISTRY", type: "api", file: apiRegistryJson },
            { name: "SCHEMA_REGISTRY", type: "schema", file: schemaRegistryJson },
            { name: "SQL_REGISTRY", type: "sql", file: sqlRegistryJson },
        ];

        for (const f of files) {
            if (!fs.existsSync(f.file)) {
                logger.error(`❌ Registry file not found: ${f.file}`);
                continue;
            }

            const jsonContent = JSON.parse(fs.readFileSync(f.file, "utf-8"));
            insertStmt.run(f.name, f.type, JSON.stringify(jsonContent));
            seeded++;
        }

        logger.info(`🌱 Seeded ${seeded} registry records into registry table`);
    } catch (err) {
        logger.error("❌ Failed to seed agent registry:", err);
        throw err;
    }
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


        const appSettingsCount = dbLocalInstance.prepare(`SELECT COUNT(*) AS count FROM app_settings`).get();

        if (appSettingsCount.count === 0) {
            await seedDefaultSettings(dbLocalInstance);
        }

        dbLocalInstance.exec(`
            CREATE TABLE IF NOT EXISTS agent_prompts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                agent TEXT NOT NULL,
                role TEXT NOT NULL,
                content TEXT NOT NULL,
                version INTEGER DEFAULT 1,
                updated_at DATETIME DEFAULT (datetime('now','localtime'))
            );
        `);

        const agentPromptsCount = dbLocalInstance.prepare(`SELECT COUNT(*) AS count FROM agent_prompts`).get();

        if (agentPromptsCount.count === 0) {
            await seedAgentPrompts(dbLocalInstance);
        }

        dbLocalInstance.exec(`
            CREATE TABLE IF NOT EXISTS registry (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                type TEXT NOT NULL,
                content TEXT NOT NULL,
                version INTEGER DEFAULT 1,
                updated_at DATETIME DEFAULT (datetime('now','localtime')),
                UNIQUE(name, type)
            );
        `);

        const registryCount = dbLocalInstance.prepare(`SELECT COUNT(*) AS count FROM registry`).get();

        if (registryCount.count === 0) {
            await seedRegistry(dbLocalInstance);
        }

        logger.info("✅ Local database tables ready (api_logs & app_settings)");
    } catch (err) {
        logger.error("❌ Failed to initialize local DB:", err);
        throw err;
    }

    return dbLocalInstance;
}


