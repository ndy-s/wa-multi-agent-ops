import * as deepseek from "./deepseek.js";
import * as gemini from "./gemini.js";
import logger from "../../helpers/logger.js";

export class ModelManager {
    constructor(strategy) {
        this.strategy = strategy;
        this.keyIndices = {};
        this.keyCooldowns = {};

        for (const name of strategy) {
            this.keyIndices[name] = 0;
            this.keyCooldowns[name] = {};
        }
    }

    async getModel() {
        const models = { deepseek, gemini };
        const now = Date.now();

        for (const modelName of this.strategy) {
            const mod = models[modelName];
            if (!mod) continue;

            const keys = await mod.getApiKeys() || [];
            if (!keys.length) continue;

            let attempts = 0;
            while (attempts < keys.length) {
                const keyIndex = this.keyIndices[modelName];
                const apiKey = keys[keyIndex];

                this.keyIndices[modelName] = (keyIndex + 1) % keys.length;

                const cooldown = this.keyCooldowns[modelName][apiKey];
                if (cooldown && cooldown > now) {
                    attempts++;
                    continue;
                }

                const quotaOk = mod.hasQuota ? await mod.hasQuota(apiKey) : true;

                if (quotaOk) {
                    logger.info(`[ModelManager] Using model: ${modelName}, keyIndex: ${keyIndex}, apiKey: ***${apiKey.slice(-4)}`);
                    return mod.createModel(apiKey);
                } else {
                    this.keyCooldowns[modelName][apiKey] = now + 60_000;
                    attempts++;
                }
            }
        }

        return null;
    }
}
