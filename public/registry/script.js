let loaded = { api: false, sql: false };
let editors = { api: null, sql: null };
let validJson = { api: false, sql: false };

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
    }, null, 4)
};

function switchTab(tab) {
    document.querySelectorAll(".tab-btn").forEach(btn => btn.classList.remove("active"));
    document.querySelectorAll(".tab-content").forEach(c => c.classList.remove("active"));

    document.querySelector(`button[onclick="switchTab('${tab}')"]`).classList.add("active");
    const container = document.getElementById(tab);
    container.classList.add("active");

    if (!loaded[tab]) {
        loadRegistry(tab);
    }

    if (editors[tab]) {
        editors[tab].refresh();
    }
}

async function loadRegistry(type) {
    try {
        const res = await fetch(`/api/registry/${type}`);
        const data = await res.json();
        const textarea = document.getElementById(type + "Json");
        textarea.value = JSON.stringify(data, null, 4);

        const container = document.getElementById(type);

        if (!editors[type]) {
            editors[type] = CodeMirror.fromTextArea(textarea, {
                mode: { name: "javascript", json: true },
                lineNumbers: true,
                tabSize: 4,
                indentUnit: 4,
                indentWithTabs: false,
                lineWrapping: false,
                theme: "idea",
                autoCloseBrackets: true,
                matchBrackets: true,
                keyMap: "default",
                viewportMargin: Infinity,
                foldGutter: true,
                gutters: ["CodeMirror-linenumbers", "CodeMirror-foldgutter"],

                extraKeys: {
                    Tab: cm => {
                        if (cm.somethingSelected()) {
                            cm.indentSelection("add");
                        } else {
                            const spaces = Array(cm.getOption("indentUnit") + 1).join(" ");
                            cm.replaceSelection(spaces, "end", "+input");
                        }
                    },
                    "Shift-Tab": cm => cm.indentSelection("subtract"),
                    Backspace: cm => {
                        const pos = cm.getCursor();
                        const line = cm.getLine(pos.line);
                        const start = line.slice(0, pos.ch);
                        if (/^ {1,4}$/.test(start.slice(-cm.getOption("indentUnit")))) {
                            cm.replaceRange("", { line: pos.line, ch: pos.ch - cm.getOption("indentUnit") }, pos);
                        } else {
                            cm.deleteH(-1, "char");
                        }
                    }
                }
            });

            editors[type].setSize(null, 600);

            const updateBtn = container.querySelector(".update-btn");

            editors[type].on("change", () => {
                const val = editors[type].getValue();
                try {
                    JSON.parse(val);
                    validJson[type] = true;
                    updateBtn.disabled = false;
                    updateBtn.style.background = "#007bff";

                    editors[type].getWrapperElement().style.backgroundColor = "white";
                } catch (err) {
                    validJson[type] = false;
                    updateBtn.disabled = true;
                    updateBtn.style.background = "#999";

                    editors[type].getWrapperElement().style.backgroundColor = "#FFCDD2";
                }
            });
        }

        const val = editors[type].getValue();
        try {
            JSON.parse(val);
            validJson[type] = true;
        } catch (err) {
            validJson[type] = false;
        }

        loaded[type] = true;
    } catch (err) {
        alert("Failed to load registry: " + err);
    }
}

function toggleVim(type, checkbox) {
    const cm = editors[type];
    if (!cm) return;

    const statusEl = document.querySelector(`#${type} .vim-status`);

    if (checkbox.checked) {
        cm.setOption("keyMap", "vim");
        if (statusEl) {
            statusEl.innerText = "Vim Mode: ON";
            statusEl.classList.add("vim-on");
        }
    } else {
        cm.setOption("keyMap", "default");
        if (statusEl) {
            statusEl.innerText = "Vim Mode: OFF";
            statusEl.classList.remove("vim-on");
        }
    }

    cm.focus();
}

function appendSkeleton(tab) {
    if (!editors[tab]) return;

    const currentValue = editors[tab].getValue().trim();
    const skeleton = skeletonTemplates[tab];

    if (!currentValue) {
        editors[tab].setValue(skeleton);
    } else {
        try {
            const currentObj = JSON.parse(currentValue);
            const skeletonObj = JSON.parse(skeleton);
            const mergedObj = { ...currentObj, ...skeletonObj }; 
            editors[tab].setValue(JSON.stringify(mergedObj, null, 4));
        } catch (err) {
            editors[tab].setValue(currentValue + "\n\n" + skeleton);
        }
    }

    const lastLine = editors[tab].lineCount() - 1;
    const lastChar = editors[tab].getLine(lastLine).length;
    editors[tab].scrollIntoView({ line: lastLine, ch: lastChar });
    editors[tab].setCursor({ line: lastLine, ch: lastChar });

    const updateBtn = document.querySelector(`#${tab} .update-btn`);
    try {
        JSON.parse(editors[tab].getValue());
        validJson[tab] = true;
        updateBtn.disabled = false;
        updateBtn.style.background = "#007bff";
        editors[tab].getWrapperElement().style.backgroundColor = "white";
    } catch (err) {
        validJson[tab] = false;
        updateBtn.disabled = true;
        updateBtn.style.background = "#999";
        editors[tab].getWrapperElement().style.backgroundColor = "#FFCDD2";
    }
}

async function updateRegistry(type) {
    if (!validJson[type]) {
        alert("Cannot update. JSON is invalid!");
        return;
    }

    let data;
    try {
        data = JSON.parse(editors[type].getValue());
    } catch (err) {
        alert("Invalid JSON: " + err);
        return;
    }

    const updateBtn = document.querySelector(`#${type} .update-btn`);
    updateBtn.disabled = true;
    const originalText = updateBtn.innerText;
    updateBtn.innerText = "Updating...";

    try {
        const res = await fetch(`/api/registry/${type}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data)
        });

        if (res.ok) {
            const freshRes = await fetch(`/api/registry/${type}`);
            const freshData = await freshRes.json();
            editors[type].setValue(JSON.stringify(freshData, null, 4));

            validJson[type] = true;
            alert(type.toUpperCase() + " registry updated successfully!");
        } else {
            const errText = await res.text();
            alert("Failed to update registry: " + errText);
        }
    } catch (err) {
        alert("Failed to update registry: " + err);
    } finally {
        updateBtn.disabled = !validJson[type];
        updateBtn.innerText = originalText;
    }
}


loadRegistry('api');


