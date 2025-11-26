import fs from "fs";
import path from "path";
import express from "express";
import { fileURLToPath } from "url";
import logger from "../helpers/logger.js";
import { loadConfig } from "../config/env.js";
import { openSqliteDB } from "../db/sqlite.js";
import { apiRegistry } from "../agents/api-agent/registry.js";
import { schemaRegistry,sqlRegistry } from "../agents/sql-agent/registry.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const apiRegistryFile = path.join(__dirname, "../agents/api-agent/registry.js");
const sqlRegistryFile = path.join(__dirname, "../agents/sql-agent/registry.js");

export async function startOpsDashboard(port = 55555) {
    const config = await loadConfig();
    const db = await openSqliteDB();
    const app = express();

    app.use(express.json());

    app.use((req, res, next) => {
        if (req.path.startsWith("/api-dummy/")) return next();

        const auth = req.headers.authorization;
        if (!auth) {
            res.setHeader('WWW-Authenticate', 'Basic realm="Ops Agent Logs"');
            return res.status(401).send("Authentication required.");
        }

        const [scheme, encoded] = auth.split(' ');
        if (scheme !== 'Basic') return res.status(400).send("Bad request");

        const decoded = Buffer.from(encoded, 'base64').toString();
        const [user, pass] = decoded.split(':');

        if (user === config.appAuthUser && pass === config.appAuthPass) return next();

        res.setHeader('WWW-Authenticate', 'Basic realm="Ops Agent Logs"');
        return res.status(401).send("Authentication failed.");
    });

    app.use(express.static(path.join(process.cwd(), "public")));

    app.get("/", (req, res) => {
        res.sendFile(path.join(process.cwd(), "public", "index.html"));
    });

    app.get("/api/logs", (req, res) => {
        try {
            const { search, offset = 0, limit = 15, sortKey = "created_at", sortDir = "DESC" } = req.query;
            let query = `
                SELECT * FROM api_logs
                ${search ? `WHERE chat_id LIKE @search
                            OR user_id LIKE @search
                            OR model_name LIKE @search
                            OR user_message LIKE @search
                            OR model_response LIKE @search` : ""}
                ORDER BY ${sortKey} ${sortDir}
                LIMIT @limit OFFSET @offset
            `;
            const stmt = db.prepare(query);
            const rows = stmt.all({
                search: search ? `%${search}%` : undefined,
                limit: parseInt(limit),
                offset: parseInt(offset)
            });
            res.json(rows);
        } catch (err) {
            logger.error("Failed to fetch logs:", err);
            res.status(500).json({ error: "Failed to fetch logs" });
        }
    });

    app.get("/api/registry/api", (req, res) => {
        try {
            res.json(apiRegistry);
        } catch (err) {
            logger.error("Failed to fetch api registry:", err);
            res.status(500).json({ error: "Failed to fetch api registry" });
        }
    });

    app.get("/api/registry/sql", (req, res) => {
        try {
            res.json(sqlRegistry);
        } catch (err) {
            logger.error("Failed to fetch sql registry:", err);
            res.status(500).json({ error: "Failed to fetch sql registry" });
        }
    });

    app.get("/api/registry/schema", (req, res) => {
        try {
            res.json(schemaRegistry);
        } catch (err) {
            logger.error("Failed to fetch schema registry:", err);
            res.status(500).json({ error: "Failed to fetch schema registry" });
        }
    });

    app.post("/api/registry/api", async (req, res) => {
        try {
            const newRegistry = req.body;

            const content = `export const apiRegistry = ${JSON.stringify(newRegistry, null, 4)};\n`;
            await fs.promises.writeFile(apiRegistryFile, content, "utf-8");

            Object.keys(apiRegistry).forEach(k => delete apiRegistry[k]); 
            Object.assign(apiRegistry, newRegistry);

            res.json({ success: true, message: "API registry fully replaced and saved to file" });
        } catch (err) {
            logger.error("Failed to update API registry:", err);
            res.status(500).json({ error: "Failed to update API registry" });
        }
    });

    app.post("/api/registry/schema", async (req, res) => {
        try {
            const newSchema = req.body;

            const content = `
export const schemaRegistry = ${JSON.stringify(newSchema, null, 4)};
export const sqlRegistry = ${JSON.stringify(sqlRegistry, null, 4)};
`;

            await fs.promises.writeFile(sqlRegistryFile, content, "utf-8");

            // Update runtime object
            Object.keys(schemaRegistry).forEach(k => delete schemaRegistry[k]);
            Object.assign(schemaRegistry, newSchema);

            res.json({ success: true, message: "Schema registry updated successfully" });
        } catch (err) {
            logger.error("Failed to update schema registry:", err);
            res.status(500).json({ error: "Failed to update schema registry" });
        }
    });

    app.post("/api/registry/sql", async (req, res) => {
        try {
            const newSqlRegistry = req.body;

            const content = `
export const schemaRegistry = ${JSON.stringify(schemaRegistry, null, 4)};
export const sqlRegistry = ${JSON.stringify(newSqlRegistry, null, 4)};
`;

            await fs.promises.writeFile(sqlRegistryFile, content, "utf-8");

            Object.keys(sqlRegistry).forEach(k => delete sqlRegistry[k]);
            Object.assign(sqlRegistry, newSqlRegistry);

            res.json({ success: true, message: "SQL registry updated successfully" });
        } catch (err) {
            logger.error("Failed to update SQL registry:", err);
            res.status(500).json({ error: "Failed to update SQL registry" });
        }
    });

    app.get("/api/settings", (req, res) => {
        try {
            const rows = db.prepare("SELECT * FROM app_settings").all();

            const normalized = rows.map(r => {
                let value = r.value;
                const key = r.key;

                if ((key.endsWith("_API_KEYS") || (key.endsWith("_KEYWORDS")) || key === "WHITELIST") || key === "MODEL_PRIORITY" || key === "API_CUSTOM_HEADERS") {
                    if (typeof value === "string") value = value.split(",").join("\n");
                }

                return {
                    ...r,
                    value
                };
            });

            res.json(normalized);
        } catch (err) {
            logger.error("Failed to fetch settings:", err);
            res.status(500).json({ error: "Failed to fetch settings" });
        }
    });

    app.post("/api/settings", (req, res) => {
        try {
            const settings = req.body;
            const stmt = db.prepare(`
            INSERT INTO app_settings (key, value)
            VALUES (?, ?)
            ON CONFLICT(key) DO UPDATE SET value=excluded.value
        `);

            for (const key in settings) {
                let val = settings[key];

                if (val === null || val === undefined) {
                    val = "";
                } else if (typeof val === "boolean") {
                    val = val ? "true" : "false";
                } else if ((key.endsWith("_API_KEYS") || (key.endsWith("_KEYWORDS")) || key === "WHITELIST") || key === "MODEL_PRIORITY" || key === "API_CUSTOM_HEADERS" && typeof val === "string") {
                    val = val.split("\n").map(s => s.trim()).filter(Boolean).join(",");
                } else {
                    val = val.toString();
                }

                stmt.run(key, val);
            }

            res.json({ success: true, message: "Settings saved" });
        } catch (err) {
            logger.error("Failed to save settings:", err);
            res.status(500).json({ error: "Failed to save settings" });
        }
    });

    app.all(/^\/api-dummy\/(.*)$/, (req, res) => {
        const pathAfterApi = req.url.replace(/^\/api\//, "");
        res.json({
            success: true,
            method: req.method,
            path: pathAfterApi,
            body: req.body
        });
    });

    app.listen(port, () => {
        logger.info(`📊 Ops Dashboard running at http://localhost:${port}`);
    });
}

