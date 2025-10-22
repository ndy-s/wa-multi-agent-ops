import * as deepseek from "./deepseek.js";
import * as gemini from "./gemini.js";
import logger from "../../helpers/logger.js";

const models = { deepseek, gemini };

export class ModelManager {
    constructor(strategy) {
        this.strategy = strategy;
        this.currentIndex = 0;
        this.keyIndices = {};
        for (const name of strategy) this.keyIndices[name] = 0;
    }

    async getModel() {
        for (let i = 0; i < this.strategy.length; i++) {
            const modelName = this.strategy[i];
            const mod = models[modelName];
            if (!mod) continue;

            const keys = mod.apiKeys || [];
            if (!keys.length) continue;

            for (let attempt = 0; attempt < keys.length; attempt++) {
                const keyIndex = this.keyIndices[modelName];
                const apiKey = keys[keyIndex];

                const quotaOk = mod.hasQuota ? await mod.hasQuota(apiKey) : true;
                if (quotaOk) {
                    this.keyIndices[modelName] = (keyIndex + 1) % keys.length;
                    return mod.createDeepseekModel
                        ? mod.createDeepseekModel(apiKey)
                        : mod.createGeminiModel(apiKey);
                } else {
                    this.keyIndices[modelName] = (keyIndex + 1) % keys.length;
                }
            }
        }

        return null;
    }
}