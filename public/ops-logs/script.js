let logs = [];
let sortKey = 'created_at';
let sortAsc = false;
let offset = 0;
const limit = 15;

function truncate(text, length = 50) { 
    if (!text) return ''; 
    return text.length > length ? text.slice(0, length) + '...' : text; 
}

function syntaxHighlight(json) {
    if (typeof json !== 'string') {
        json = JSON.stringify(json, null, 2);
    }

    // Escape HTML
    json = json
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');

    // Detect long multi-line strings
    return json.replace(
        /("(?:\\.|[^"\\])*"(?:\s*:)?|\btrue\b|\bfalse\b|\bnull\b|-?\d+(?:\.\d+)?(?:[eE][+\-]?\d+)?)/g,
        match => {
            // Multi-line string detection
            if (match.startsWith('"') && match.includes('\\n')) {
                const clean = match.replace(/\\n/g, '\n').replace(/\\"/g, '"');
                return `<span class="json-multiline">${clean}</span>`;
            }

            let cls = 'json-number';
            if (match.startsWith('"')) {
                cls = match.endsWith(':') ? 'json-key' : 'json-string';
            } else if (match === 'true' || match === 'false') {
                cls = 'json-boolean';
            } else if (match === 'null') {
                cls = 'json-null';
            }

            return `<span class="${cls}">${match}</span>`;
        }
    );
}

function showModal(row) {
    const modal = document.getElementById('modalContent');
    const formatted = {};
    Object.keys(row).forEach(key => { try { formatted[key] = JSON.parse(row[key]); } catch { formatted[key] = row[key]; } });
    modal.innerHTML = syntaxHighlight(formatted);
    document.getElementById('modal').style.display = 'flex';
}

function closeModal() { 
    document.getElementById('modal').style.display = 'none'; 
}

async function loadLogs(newOffset) {
    offset = newOffset;
    const search = document.getElementById('searchInput').value;

    document.getElementById('loading').style.display = 'block';
    document.querySelector('.table-container').style.opacity = '0.5';

    const res = await fetch(`/api/logs?limit=${limit}&offset=${offset}&sortKey=${sortKey}&sortDir=${sortAsc ? 'ASC':'DESC'}&search=${encodeURIComponent(search)}`);
    logs = await res.json();
    renderTable();

    document.getElementById('loading').style.display = 'none';
    document.querySelector('.table-container').style.opacity = '1';
}

function renderTable() {
    const tbody = document.querySelector('#logTable tbody');
    tbody.innerHTML = '';
    logs.forEach(row => {
        const tr = document.createElement('tr');

        Object.keys(row).forEach(key => {
            const td = document.createElement('td');
            td.title = row[key] || '';
            td.textContent = truncate(row[key]);

            td.ondblclick = (e) => {
                const modal = document.getElementById('modalContent');
                let value;
                try {
                    value = JSON.parse(row[key]);
                } catch {
                    value = row[key];
                }
                const formatted = { [key]: value };
                modal.innerHTML = syntaxHighlight(formatted);
                document.getElementById('modal').style.display = 'flex';
            };

            tr.appendChild(td);
        });

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

