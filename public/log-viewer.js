let logs = [];
let sortKey = 'created_at';
let sortAsc = false;
let offset = 0;
const limit = 15;

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
        tr.innerHTML = Object.keys(row).map(key => `<td title="${row[key] || ''}">${truncate(row[key])}</td>`).join('');
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

