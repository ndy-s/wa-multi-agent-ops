import * as local from "./local-embedder.js";
import * as openai from "./openai-embedder.js";
import { config } from "../../config/env.js";

let activeEmbedder = null;

switch (config.embedderType) {
    case "openai":
        activeEmbedder = openai;
        break;
    case "local":
    default:
        activeEmbedder = local;
        break;
}

export const embedder = activeEmbedder;

