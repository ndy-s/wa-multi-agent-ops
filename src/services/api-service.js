import fetch from "node-fetch";
import logger from "../helpers/logger.js";
import { loadConfig } from "../config/env.js";

export async function callApi(apiId, params = {}) {
    const config = await loadConfig();
    const url = `${config.baseApiUrl}/${apiId}`;

    try {
        const res = await fetch(url, {
            method: "POST",
            headers: { 
                "Content-Type": "application/json",
                ...config.apiCustomHeaders,
            },
            body: JSON.stringify(params),
        });

        if (res.status === 401) {
            throw new Error(`Unauthorized: You don't have access to ${apiId}`);
        }

        let data;
        try {
            data = await res.json();
        } catch {
            throw new Error("Invalid JSON response from server");
        }

        if (!res.ok) {
            throw new Error(`HTTP ${res.status}: ${data?.message || "Unknown error"}`);
        }

        logger.info(`API call success: ${apiId} | params=${JSON.stringify(params)}`);

        return data;
    } catch (err) {
        logger.error(`API call failed: ${apiId} | error=${err.message} | params=${JSON.stringify(params)}`);
        throw err;
    }
}

