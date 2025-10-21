import fs from "fs";
import path from "path";
import DatabaseLocal from "better-sqlite3";
import { Database as DatabaseCloud } from "@sqlitecloud/drivers";
import logger from "../helpers/logger.js";
import { config } from "../config/env.js";

let dbLocalInstance = null;
let dbCloudInstance = null;

export async function openDB() {
    // CLOUD DATABASE
    if (config.sqliteType === "cloud") {
        if (!config.sqliteUrl) {
            throw new Error(
                "❌ SQLITE_URL is required when SQLITE_TYPE=cloud. Please set it in your environment variables."
            );
        }

        if (dbCloudInstance) return dbCloudInstance;

        dbCloudInstance = new DatabaseCloud(config.sqliteUrl);

        try {
            await dbCloudInstance.sql`
                CREATE TABLE IF NOT EXISTS api_logs (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    chat_id TEXT,
                    user_id TEXT,
                    system_prompt TEXT,
                    memory_prompt TEXT,
                    user_message TEXT,
                    model_response TEXT,
                    validation_type TEXT,
                    validation_errors TEXT,
                    model_name TEXT,
                    token_prompt INTEGER,
                    token_completion INTEGER,
                    token_total INTEGER,
                    retry_count INTEGER DEFAULT 0,
                    metadata TEXT DEFAULT '{}',
                    created_at DATETIME DEFAULT (datetime('now','localtime'))
                );
            `;
            logger.info("✅ Cloud database table 'api_logs' ready");
        } catch (err) {
            logger.error("❌ Failed to create cloud table:", err);
            throw err;
        }

        return dbCloudInstance;
    }

    // LOCAL DATABASE
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
                validation_errors TEXT,
                model_name TEXT,
                token_prompt INTEGER,
                token_completion INTEGER,
                token_total INTEGER,
                retry_count INTEGER DEFAULT 0,
                metadata TEXT DEFAULT '{}',
                created_at DATETIME DEFAULT (datetime('now','localtime'))
            );
        `);
    } catch (err) {
        logger.error("❌ Failed to initialize local DB:", err);
        throw err;
    }

    return dbLocalInstance;
}

