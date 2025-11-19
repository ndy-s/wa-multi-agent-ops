import { ChatOpenAI } from "@langchain/openai";
import { config } from "../../config/env.js";
import fetch from "node-fetch";
import logger from "../../helpers/logger.js";

export const apiKeys = config.openrouterApiKeys || [];

export function createDeepseekModel(apiKey) {
    return new ChatOpenAI({
        temperature: 0,
        model: "tngtech/deepseek-r1t2-chimera:free",
        apiKey,
        configuration: { baseURL: config.openrouterBaseUrl },
    });
}

export async function hasQuota(apiKey) {
    return true;

    const keySuffix = apiKey.slice(-3);
    const DAILY_LIMIT = 50;

    try {
        const keysResp = await fetch("https://openrouter.ai/api/internal/v1/api-keys", {
            headers: { Authorization: `Bearer ${apiKey}` },
        });

        const keysData = await keysResp.json();
        const keyList = keysData?.data || [];

        if (!keyList.length) {
            logger.warn(`No API keys found for suffix: ${keySuffix}`);
            return false;
        }

        const keyIds = keyList.map(k => k.id).join(",");

        const usageResp = await fetch(
            `https://openrouter.ai/api/frontend/user/transaction-analytics?api_key_ids=${keyIds}&window=1mo`,
            { headers: { Authorization: `Bearer ${apiKey}` } }
        );

        const usageData = await usageResp.json();
        const usageList = usageData?.data?.data || [];

        if (!usageList.length) {
            logger.info(`No usage data yet for keys ending with: ${keySuffix}`);
            return true;
        }

        const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
        const todayUsages = usageList.filter(u => u.date.startsWith(today));

        const totalRequests = todayUsages.reduce((sum, u) => sum + (u.requests || 0), 0);

        if (totalRequests >= DAILY_LIMIT) {
            logger.warn(
                `Total usage reached (${totalRequests}/${DAILY_LIMIT}) for API key suffix ${keySuffix}`
            );
            return false;
        }

        logger.info(
            `API key suffix ${keySuffix} has ${DAILY_LIMIT - totalRequests} requests remaining today`
        );
        return true;
    } catch (err) {
        logger.error(`Error checking quota for API key suffix ${keySuffix}:`, err);
        return false;
    }
}

