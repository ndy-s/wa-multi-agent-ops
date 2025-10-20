import fetch from "node-fetch";
import logger from "../utils/logger.js";

export async function callApi(api, params) {
    try {
        console.log("call api", api);
        return;

        const res = await fetch(api.url, {
            method: api.method,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(params)
        });
        const data = await res.json();
        logger.info(`API call success: ${api.id} with params ${JSON.stringify(params)}`);
        return data;
    } catch (err) {
        logger.error(`API call failed: ${api.id} error: ${err}`);
        throw err;
    }
}

