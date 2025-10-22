import { getApiAgent } from "./api-agent/index.js";
import logger from "../helpers/logger.js";

export const agentRegistry = {
    api: getApiAgent,
};

export async function getAgent(agentId) {
    const factory = agentRegistry[agentId];
    if (!factory) {
        logger.error(`Agent ID "${agentId}" not found in registry`);
        return null;
    }

    const agent = await factory();
    if (!agent) {
        logger.error(`Agent "${agentId}" could not be created: model unavailable or all keys exhausted`);
        return null;
    }

    return agent;
}
