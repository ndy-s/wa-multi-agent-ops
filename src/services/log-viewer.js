import express from "express";
import { openDB } from "../db/sqlite.js";
import logger from "../helpers/logger.js";

export async function startLoanAgentLogViewer(port = 4000) {
    const db = await openDB();
    const app = express();

    const USERNAME = "admin";
    const PASSWORD = "loan123";

    app.use((req, res, next) => {
        const auth = req.headers.authorization;
        if (!auth) {
            res.setHeader('WWW-Authenticate', 'Basic realm="Loan Smart Agent Logs"');
            return res.status(401).send("Authentication required.");
        }

        const [scheme, encoded] = auth.split(' ');
        if (scheme !== 'Basic') return res.status(400).send("Bad request");

        const decoded = Buffer.from(encoded, 'base64').toString();
        const [user, pass] = decoded.split(':');

        if (user === USERNAME && pass === PASSWORD) return next();

        res.setHeader('WWW-Authenticate', 'Basic realm="Loan Smart Agent Logs"');
        return res.status(401).send("Authentication failed.");
    });

    app.use(express.static("public"));

    // API endpoint
    app.get("/api/logs", (req, res) => {
        try {
            const { search, offset = 0, limit = 50, sortKey = "created_at", sortDir = "DESC" } = req.query;
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

    app.get("/", (req, res) => {
        res.send(`
<!DOCTYPE html>
<html>
<head>
    <title>Loan Smart Agent Logs Viewer</title>
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 20px; background: #f0f2f5; color: #333; }
        h1 { text-align: center; margin-bottom: 20px; }
        input { padding: 6px 10px; width: 300px; margin-bottom: 10px; }
        button { padding: 6px 12px; margin-left: 5px; cursor: pointer; background: #007bff; color: #fff; border: none; border-radius: 4px; }
        button:hover { background: #0056b3; }
        .table-container { max-height: 70vh; overflow: auto; margin-bottom: 10px; border-radius: 5px; box-shadow: 0 2px 12px rgba(0,0,0,0.1); }
        table { border-collapse: collapse; width: 100%; min-width: 1200px; }
        th, td { border: 1px solid #ddd; padding: 8px; max-width: 180px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        th { background: #007bff; color: #fff; cursor: pointer; user-select: none; position: sticky; top: 0; }
        tr:nth-child(even) { background: #f9f9f9; }
        tr:hover { background: #e6f2ff; }
        pre { white-space: pre-wrap; word-wrap: break-word; margin: 0; font-family: monospace; }
        .modal { display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.6); justify-content:center; align-items:center; z-index:999; }
        .modal-content { background:#fff; padding:20px; width:90%; max-width:900px; max-height:90%; overflow:auto; border-radius:8px; box-shadow:0 4px 12px rgba(0,0,0,0.3); }
        .close { float:right; font-size:20px; font-weight:bold; cursor:pointer; }
        .pagination { margin-top: 10px; text-align: center; }
        .pagination button { margin: 0 3px; padding: 5px 10px; cursor: pointer; }
        .modal-content pre { background: #1e1e1e; color: #d4d4d4; padding: 10px; border-radius: 5px; overflow: auto; max-height: 80vh; font-family: 'Fira Code', monospace; }
        .json-key { color: #9cdcfe; }
        .json-string { color: #ce9178; }
        .json-number { color: #b5cea8; }
        .json-boolean { color: #569cd6; }
        .json-null { color: #569cd6; font-style: italic; }
    </style>
</head>
<body>
    <h1>Loan Smart Agent Logs Viewer</h1>
    <input type="text" id="searchInput" placeholder="Search by chat, user, model, or content..." />
    <button onclick="loadLogs(0)">Search</button>
    <div class="table-container">
        <table id="logTable">
            <thead>
                <tr>
                    <th data-key="id">ID</th>
                    <th data-key="chat_id">Chat ID</th>
                    <th data-key="user_id">User ID</th>
                    <th data-key="system_prompt">System Prompt</th>
                    <th data-key="memory_prompt">Memory Prompt</th>
                    <th data-key="user_message">User Message</th>
                    <th data-key="model_response">Model Response</th>
                    <th data-key="validation_type">Validation Type</th>
                    <th data-key="validation_errors">Validation Errors</th>
                    <th data-key="model_name">Model Name</th>
                    <th data-key="token_prompt">Token Prompt</th>
                    <th data-key="token_completion">Token Completion</th>
                    <th data-key="token_total">Token Total</th>
                    <th data-key="retry_count">Retry Count</th>
                    <th data-key="metadata">Metadata</th>
                    <th data-key="created_at">Created At</th>
                </tr>
            </thead>
            <tbody></tbody>
        </table>
    </div>
    <div class="pagination" id="pagination"></div>

    <div class="modal" id="modal">
        <div class="modal-content">
            <span class="close" onclick="closeModal()">&times;</span>
            <pre id="modalContent"></pre>
        </div>
    </div>

    <script>
        let logs = [];
        let sortKey = 'created_at';
        let sortAsc = false;
        let offset = 0;
        const limit = 50;

        function safeFormatJSON(text) { if (!text) return ""; try { return JSON.parse(text); } catch { return text; } }
        function truncate(text, length = 50) { if (!text) return ''; return text.length > length ? text.slice(0, length) + '...' : text; }

        function syntaxHighlight(json) {
            if (typeof json !== 'string') json = JSON.stringify(json, null, 2);
            json = json.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
            return json.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\\s*:)?|\b(true|false|null)\b|-?\\d+(\\.\\d+)?([eE][+\\-]?\\d+)?)/g, function (match) {
                let cls = 'json-number';
                if (/^"/.test(match)) { if (/:$/.test(match)) cls = 'json-key'; else cls = 'json-string'; }
                else if (/true|false/.test(match)) cls = 'json-boolean';
                else if (/null/.test(match)) cls = 'json-null';
                return '<span class="' + cls + '">' + match + '</span>';
            });
        }

        function showModal(row) {
            const modal = document.getElementById('modalContent');
            const formatted = {};
            Object.keys(row).forEach(key => { try { formatted[key] = JSON.parse(row[key]); } catch { formatted[key] = row[key]; } });
            modal.innerHTML = syntaxHighlight(formatted);
            document.getElementById('modal').style.display = 'flex';
        }

        function closeModal() { document.getElementById('modal').style.display = 'none'; }

        async function loadLogs(newOffset) {
            offset = newOffset;
            const search = document.getElementById('searchInput').value;
            const res = await fetch(\`/api/logs?limit=\${limit}&offset=\${offset}&sortKey=\${sortKey}&sortDir=\${sortAsc ? 'ASC':'DESC'}&search=\${encodeURIComponent(search)}\`);
            logs = await res.json();
            renderTable();
        }

        function renderTable() {
            const tbody = document.querySelector('#logTable tbody');
            tbody.innerHTML = '';
            logs.forEach(row => {
                const tr = document.createElement('tr');
                tr.innerHTML = \`
                    <td>\${row.id}</td>
                    <td title="\${row.chat_id}">\${truncate(row.chat_id)}</td>
                    <td title="\${row.user_id}">\${truncate(row.user_id)}</td>
                    <td title="\${safeFormatJSON(row.system_prompt)}">\${truncate(JSON.stringify(safeFormatJSON(row.system_prompt)))}</td>
                    <td title="\${safeFormatJSON(row.memory_prompt)}">\${truncate(JSON.stringify(safeFormatJSON(row.memory_prompt)))}</td>
                    <td title="\${row.user_message}">\${truncate(row.user_message)}</td>
                    <td title="\${safeFormatJSON(row.model_response)}">\${truncate(JSON.stringify(safeFormatJSON(row.model_response)))}</td>
                    <td>\${row.validation_type || ''}</td>
                    <td title="\${row.validation_errors}">\${truncate(row.validation_errors)}</td>
                    <td>\${row.model_name || ''}</td>
                    <td>\${row.token_prompt || 0}</td>
                    <td>\${row.token_completion || 0}</td>
                    <td>\${row.token_total || 0}</td>
                    <td>\${row.retry_count || 0}</td>
                    <td title="\${safeFormatJSON(row.metadata)}">\${truncate(JSON.stringify(safeFormatJSON(row.metadata)))}</td>
                    <td>\${row.created_at}</td>
                \`;
                tr.ondblclick = () => showModal(row);
                tbody.appendChild(tr);
            });
            renderPagination();
        }

        function renderPagination() {
            const pagination = document.getElementById('pagination');
            pagination.innerHTML = '';
            if (offset > 0) {
                const prev = document.createElement('button');
                prev.textContent = 'Prev';
                prev.onclick = () => loadLogs(offset - limit);
                pagination.appendChild(prev);
            }
            if (logs.length === limit) {
                const next = document.createElement('button');
                next.textContent = 'Next';
                next.onclick = () => loadLogs(offset + limit);
                pagination.appendChild(next);
            }
        }

        document.querySelectorAll('th').forEach(th => {
            th.addEventListener('click', () => {
                const key = th.getAttribute('data-key');
                if (sortKey === key) sortAsc = !sortAsc;
                else { sortKey = key; sortAsc = true; }
                loadLogs(0);
            });
        });

        loadLogs(0);
    </script>
</body>
</html>
        `);
    });

    app.listen(port, () => {
        logger.info(`📊 Loan Smart Agent Logs Viewer running at http://localhost:${port}`);
    });
}

