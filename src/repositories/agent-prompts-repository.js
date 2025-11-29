import { openSqliteDB } from "../db/sqlite.js"
import logger from "../helpers/logger.js";

export const agentPromptsRepository = {
    async get(agent) {
        try {
            const db = await openSqliteDB();
            const row = db.prepare("SELECT * FROM agent_prompts WHERE agent = ?").get(agent);

            if (!row) return "";  
            return row.content;
        } catch (err) {
            logger.error(`[agentPromptsRepository.get] Failed to get prompt for agent "${agent}":`, err);
            return "";
        }
    },

    async save(agent, content) {
        try {
            const db = await openSqliteDB();

            const result = db.prepare(`
                UPDATE agent_prompts
                SET content = ?, updated_at = datetime('now','localtime')
                WHERE agent = ?
                `).run(content, agent);

            if (result.changes === 0) {
                db.prepare(`
                    INSERT INTO agent_prompts (agent, role, content)
                    VALUES (?, 'default', ?)
                `).run(agent, content);
            }

            return true;
        } catch (err) {
            logger.error(`[agentPromptsRepository.save] Failed to save prompt for agent "${agent}":`, err);
            return false;
        }
    },
};
