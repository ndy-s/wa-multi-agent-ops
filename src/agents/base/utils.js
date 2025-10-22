import { DateTime } from "luxon";
import crypto from "crypto";

export const jakartaTime = () => DateTime.now().setZone("Asia/Jakarta").toISO();

export function summarizeTokens(res, model) {
    const tokenUsage = res?.response_metadata?.tokenUsage || res?.usage_metadata || {};
    return {
        modelName: res?.response_metadata?.model_name || model?.name || "unknown",
        promptTokens: tokenUsage?.promptTokens || 0,
        completionTokens: tokenUsage?.completionTokens || 0,
        totalTokens: tokenUsage?.totalTokens || 0
    };
}

export function hashText(text) {
    return crypto.createHash("sha256").update(text).digest("hex");
}

export function flatten(arr) {
    if (!arr) return [];
    if (Array.isArray(arr)) return arr.flat(Infinity).map(Number);
    if (typeof arr === "number") return [arr];
    return [];
}

export function cosine(a, b) {
    if (!a || !b || a.length !== b.length) return 0;
    const dot = a.reduce((sum, val, i) => sum + val * b[i], 0);
    const magA = Math.sqrt(a.reduce((sum, val) => sum + val ** 2, 0));
    const magB = Math.sqrt(b.reduce((sum, val) => sum + val ** 2, 0));
    return dot / (magA * magB + 1e-10);
}

