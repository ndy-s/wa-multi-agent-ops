import { openSqliteDB } from "../db/sqlite.js";
import logger from "../helpers/logger.js";

export const registryRepository = {
    async get(name) {
        try {
            const db = await openSqliteDB();
            const row = db.prepare(`SELECT content FROM registry WHERE name = ?`).get(name);
            return row ? JSON.parse(row.content) : null;
        } catch (err) {
            logger.error(`[registryRepository.get] Failed to get registry for name "${name}":`, err);
            return null;
        }
    },

    async save(name, type, contentObject) {
        try {
            const db = await openSqliteDB();
            const json = JSON.stringify(contentObject);

            db.prepare(`
                INSERT INTO registry (name, type, content, version)
                VALUES (?, ?, ?, 1)
                ON CONFLICT(name, type) DO UPDATE SET
                content = excluded.content,
                version = registry.version + 1,
                updated_at = datetime('now','localtime')
            `).run(name, type, json);

            return true;
        } catch (err) {
            logger.error(`[registryRepository.save] Failed to save registry for name "${name}":`, err);
            return false;
        }
    }
};


