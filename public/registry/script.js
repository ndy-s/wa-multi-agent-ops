let loaded = { api: false, sql: false, schema: false, prompts: false };
let editors = { api: null, sql: null, schema: null, prompts: null };
let validJson = { api: false, sql: false, schema: false, prompts: false };
let lastSavedJson = { api: "", sql: "", schema: "", prompts: "" };

const skeletonTemplates = {
    api: JSON.stringify({
        "exampleService": {
            "description": "Example service API. Handles creation or retrieval of entities.",
            "fields": {
                "requiredField": {
                    "required": true,
                    "type": "string",
                    "enum": ["VALUE1", "VALUE2"], 
                    "mapping": {
                        "Option 1": "VALUE1",
                        "Option 2": "VALUE2"
                    },
                    "instructions": "Select one of the allowed values for this required field."
                },
                "optionalField": {
                    "required": false,
                    "type": "string",
                    "instructions": "Optional field. You can leave it empty or provide additional information."
                }
            },
            "examples": [
                {
                    "input": "Create a new entity with VALUE1 as the required field.",
                    "output": {
                        "id": "exampleService",
                        "params": {
                            "requiredField": "VALUE1",
                            "optionalField": "Some additional info"
                        }
                    }
                }
            ]
        }
    }, null, 4),

    schema: JSON.stringify({
        "tableName": {
            "table": "Table name",
            "description": "Table description",
            "columns": [
                { "name": "id", "type": "INTEGER", "description": "Primary key" },
                { "name": "name", "type": "TEXT", "description": "Name field" }
            ],
            "relations": [
                {
                    "column": "foreign_key_column",
                    "references": "referenced_table.referenced_column",
                    "description": "Foreign key relationship."
                }
            ]
        }
    }, null, 4),

    sql: JSON.stringify({
        "getExample": {
            "query": "SELECT * FROM tableName WHERE id = :id",
            "description": "Fetch by ID",
            "params": ["id"]
        }
    }, null, 4),

};

function highlightChanges(type) {
    const cm = editors[type];
    if (!cm) return;

    const currentLines = cm.getValue().split("\n");
    const savedLines = lastSavedJson[type] || [];

    const totalLines = Math.max(currentLines.length, savedLines.length);

    for (let i = 0; i < totalLines; i++) {
        const lineHandle = cm.getLineHandle(i);
        if (!lineHandle) continue;

        if (currentLines[i] !== savedLines[i]) {
            cm.addLineClass(i, "background", "cm-line-changed");
        } else {
            cm.removeLineClass(i, "background", "cm-line-changed");
        }
    }
}

function switchTab(tab) {
    document.querySelectorAll(".tab-btn").forEach(btn => btn.classList.remove("active"));
    document.querySelectorAll(".tab-content").forEach(c => c.classList.remove("active"));

    document.querySelector(`button[onclick="switchTab('${tab}')"]`).classList.add("active");
    const container = document.getElementById(tab);
    container.classList.add("active");

    if (!loaded[tab]) loadRegistry(tab);

    if (editors[tab]) editors[tab].refresh();
}

async function loadRegistry(type) {
    try {
        let res = null;
        let textarea = null;
        let content = "";

        if (type === "prompts") {
            const agentSelect = document.getElementById("agentSelect");
            const agent = agentSelect ? agentSelect.value : "classifier";
            res = await fetch(`/api/agent-prompts/${agent}`);
            content = await res.text(); 
            textarea = document.getElementById("promptEditor");
            lastSavedJson[type] = content.split("\n");
        } else {
            res = await fetch(`/api/registry/${type}`);
            const data = await res.json();
            content = JSON.stringify(data, null, 4);
            textarea = document.getElementById(type + "Json");
            lastSavedJson[type] = content.split("\n");
        }

        if (!textarea) throw new Error("Textarea not found for tab: " + type);

        if (editors[type]) {
            editors[type].setValue(content);
            lastSavedJson[type] = content.split("\n");
            highlightChanges(type);
            loaded[type] = true;
            return;
        }

        textarea.value = content;
        const container = document.getElementById(type);

        editors[type] = CodeMirror.fromTextArea(textarea, {
            mode: type === "prompts" ? "text/plain" : { name: "javascript", json: true },
            lineNumbers: true,
            tabSize: 4,
            indentUnit: 4,
            indentWithTabs: false,
            theme: "idea",
            autoCloseBrackets: type !== "prompts",
            matchBrackets: type !== "prompts",
            keyMap: "default",
            viewportMargin: Infinity,
            foldGutter: true,
            gutters: ["CodeMirror-linenumbers", "CodeMirror-foldgutter"],
            extraKeys: {
                Tab: cm => {
                    if (cm.somethingSelected()) cm.indentSelection("add");
                    else cm.replaceSelection(" ".repeat(cm.getOption("indentUnit")), "end");
                },
                "Shift-Tab": cm => cm.indentSelection("subtract"),
                Backspace: cm => {
                    const pos = cm.getCursor();
                    const line = cm.getLine(pos.line);
                    if (/^ {1,4}$/.test(line.slice(0, pos.ch).slice(-cm.getOption("indentUnit")))) {
                        cm.replaceRange("", { line: pos.line, ch: pos.ch - cm.getOption("indentUnit") }, pos);
                    } else cm.deleteH(-1, "char");
                }
            }
        });

        editors[type].setSize(null, 600);

        const updateBtn = container.querySelector(".update-btn");

        // Only validate JSON for non-prompts
        if (type !== "prompts") {
            editors[type].on("change", () => {
                const val = editors[type].getValue();
                try {
                    JSON.parse(val);
                    validJson[type] = true;
                    updateBtn.disabled = false;
                    updateBtn.style.background = "#007bff";
                    editors[type].getWrapperElement().style.backgroundColor = "white";
                } catch {
                    validJson[type] = false;
                    updateBtn.disabled = true;
                    updateBtn.style.background = "#999";
                    editors[type].getWrapperElement().style.backgroundColor = "#FFCDD2";
                }
                highlightChanges(type);
            });
        } else {
            editors[type].on("change", () => {
                highlightChanges(type);
            });
        }

        highlightChanges(type);
        loaded[type] = true;

    } catch (err) {
        alert("Failed to load registry: " + err);
        console.error(err);
    }
}

async function updateRegistry(type) {
    if (type !== "prompts" && !validJson[type]) {
        alert("Cannot update. JSON is invalid!");
        return;
    }

    const confirmed = confirm(`Are you sure you want to update the ${type.toUpperCase()} registry?`);
    if (!confirmed) return;

    const updateBtn = document.querySelector(`#${type} .update-btn`);
    updateBtn.disabled = true;
    const originalText = updateBtn.innerText;
    updateBtn.innerText = "Updating...";

    try {
        let res;
        if (type === "prompts") {
            const agent = document.getElementById("agentSelect").value;
            const text = editors[type].getValue();
            res = await fetch(`/api/agent-prompts/${agent}`, {
                method: "POST",
                headers: { "Content-Type": "text/plain" }, 
                body: text
            });
        } else {
            const data = JSON.parse(editors[type].getValue());
            res = await fetch(`/api/registry/${type}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data)
            });
        }

        if (res.ok) {
            if (type === "prompts") {
                const agent = document.getElementById("agentSelect").value;
                const freshRes = await fetch(`/api/agent-prompts/${agent}`);
                const freshText = await freshRes.text();
                editors[type].setValue(freshText);
                lastSavedJson[type] = freshText.split("\n");
            } else {
                const freshRes = await fetch(`/api/registry/${type}`);
                const freshData = await freshRes.json();
                const jsonString = JSON.stringify(freshData, null, 4);
                editors[type].setValue(jsonString);
                lastSavedJson[type] = jsonString.split("\n");
            }

            highlightChanges(type);
            alert(type.toUpperCase() + " registry updated successfully!");
        } else {
            const errText = await res.text();
            alert("Failed to update registry: " + errText);
        }

    } catch (err) {
        alert("Failed to update registry: " + err);
        console.error(err);
    } finally {
        updateBtn.disabled = false;
        updateBtn.innerText = originalText;
    }
}

function toggleVim(type, checkbox) {
    const cm = editors[type];
    if (!cm) return;

    const statusEl = document.querySelector(`#${type} .vim-status`);

    if (checkbox.checked) {
        cm.setOption("keyMap", "vim");
        statusEl.innerText = "Vim Mode: ON";
        statusEl.classList.add("vim-on");
    } else {
        cm.setOption("keyMap", "default");
        statusEl.innerText = "Vim Mode: OFF";
        statusEl.classList.remove("vim-on");
    }

    cm.focus();
}

function appendSkeleton(tab) {
    const cm = editors[tab];
    if (!cm) return;

    const currentValue = cm.getValue().trim();
    const skeleton = skeletonTemplates[tab];

    if (tab === "prompts") {
        if (!currentValue) {
            cm.setValue(skeleton);
        } else {
            cm.setValue(currentValue + "\n\n" + skeleton);
        }
    } else {
        if (!currentValue) {
            cm.setValue(skeleton);
        } else {
            try {
                const merged = { ...JSON.parse(currentValue), ...JSON.parse(skeleton) };
                cm.setValue(JSON.stringify(merged, null, 4));
            } catch {
                cm.setValue(currentValue + "\n\n" + skeleton);
            }
        }
    }

    const lastLine = cm.lineCount() - 1;
    cm.scrollIntoView({ line: lastLine, ch: 999 });
    cm.setCursor({ line: lastLine, ch: 999 });

    highlightChanges(tab);
}

const agentSelectEl = document.getElementById("agentSelect");
if (agentSelectEl) {
    agentSelectEl.addEventListener("change", () => {
        loadRegistry("prompts");
    });
}

loadRegistry("prompts");


