import logger from "../../helpers/logger.js";
import { pendingAgentActions } from "../../agents/base/utils.js";
import { callApi } from "../../services/api-service.js";
import { callSql } from "../../services/sql-service.js";

export async function reactionHandler(sock, msg) {
    try {
        const reaction = msg.message.reactionMessage;
        if (!reaction) return;

        const reactedMsgId = reaction.key.id;
        const reactionEmoji = reaction.text;
        const reactorJid = msg.key.participant || msg.key.remoteJid;

        const pending = pendingAgentActions[reactedMsgId];
        if (!pending) return; 

        if (reactorJid !== pending.userJid) return;
        if (reactionEmoji !== "👍") return;

        clearTimeout(pending.timeout);
        delete pendingAgentActions[reactedMsgId];

        const { type: actionType, action } = pending;
        const { id, params, query } = action;

        const header = `*${actionType.toUpperCase()} Confirmed*`;
        const body =
            actionType === "api"
                ? `API: \`${id}\`\nParameters:\n\`\`\`json\n${JSON.stringify(params, null, 2)}\n\`\`\``
                : `SQL: \`${id}\`\nQuery:\n\`\`\`sql\n${query || "(no query)"}\n\`\`\`\nParameters:\n\`\`\`json\n${JSON.stringify(params, null, 2)}\n\`\`\``;

        await sock.sendMessage(
            pending.userJid,
            {
                text: `${header}\n\n${body}\n\n⏳ Executing, please wait...`,
                edit: pending.msgKey,
            }
        );

        let result;
        try {
            if (actionType === "api") {
                result = await callApi(id, params);
            } else if (actionType === "sql") {
                result = await callSql(query, params);
            } else {
                throw new Error(`Unknown pending action type: ${actionType}`);
            }

            let resultText = JSON.stringify(result, null, 2);
            if (resultText.length > 3000) {
                resultText = resultText.slice(0, 3000) + "\n... (truncated)";
            }

            const successHeader = `🎊 *${actionType.toUpperCase()} Executed Successfully*`;
            const successBody = `Result:\n\`\`\`json\n${resultText}\n\`\`\``;

            await sock.sendMessage(
                pending.userJid,
                {
                    text: `${successHeader}\n\n${successBody}`,
                    edit: pending.msgKey, 
                }
            );

            logger.info(`[reactionHandler] Success for ${actionType}:${id}`);
        } catch (err) {
            logger.error(`[reactionHandler] Execution failed: ${err}`);

            const errorHeader = `❌ *${actionType.toUpperCase()} Failed*`;
            const errorBody = `ID: \`${id}\`\nError: ${err.message}`;

            await sock.sendMessage(
                pending.userJid,
                {
                    text: `${errorHeader}\n\n${errorBody}`,
                    edit: pending.msgKey
                }
            );
        }
    } catch (error) {
        console.error("❌ handleReaction error:", error);
    }
}
