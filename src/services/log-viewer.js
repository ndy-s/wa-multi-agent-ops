import express from "express";
import path from "path";
import { openSqliteDB } from "../db/sqlite.js";
import logger from "../helpers/logger.js";
import { config } from "../config/env.js";

export async function startLoanAgentLogViewer(port = 4000) {
    const db = await openSqliteDB();
    const app = express();

    const USERNAME = config.appAuthUser;
    const PASSWORD = config.appAuthPass;

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

        if (user === USERNAME && pass === PASSWORD) return next();

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
        logger.info(`📊 Ops Agent Logs Viewer running at http://localhost:${port}`);
    });
}

