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
    const keySuffix = apiKey.slice(-3);
    const targetModel = "tngtech/deepseek-r1t2-chimera";

    try {
        const keysResp = await fetch("https://openrouter.ai/api/internal/v1/api-keys", {
            headers: { Authorization: `Bearer ${apiKey}` },
        });
        const keysData = await keysResp.json();

        const keyInfo = keysData.data.find(k => k.label.slice(-3) === keySuffix);
        if (!keyInfo) {
            logger.warn(`API key not found (suffix match): ${keySuffix}`);
            return false;
        }

        const keyId = keyInfo.id;

        const usageResp = await fetch(
            `https://openrouter.ai/api/frontend/user/transaction-analytics?api_key_ids=${keyId}&window=1mo`,
            {
                headers: { Authorization: `Bearer ${apiKey}` },
            }
        );
        const usageData = await usageResp.json();

        const usageList = usageData.data?.data || [];

        if (usageList.length === 0) {
            logger.info(`No usage yet for API key suffix: ${keySuffix}, model: ${targetModel}`);
            return true;
        }

        const today = new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"
        const todayUsage = usageList.find(
            u => u.date.startsWith(today) && u.model_permaslug === targetModel
        );

        if (!todayUsage) {
            logger.info(`No usage today for API key suffix: ${keySuffix}, model: ${targetModel}`);
            return true;
        }

        if (todayUsage.requests >= 50) {
            logger.warn(`API key suffix ${keySuffix} has reached the daily free tier limit (50 requests) for model: ${targetModel}`);
            return false;
        }

        logger.info(`API key suffix ${keySuffix} has ${50 - todayUsage.requests} requests remaining today for model: ${targetModel}`);
        return true;
    } catch (err) {
        logger.error(`Error checking quota for API key suffix ${keySuffix}, model: ${modelPermaSlug}`, err);
        return false;
    }
}

