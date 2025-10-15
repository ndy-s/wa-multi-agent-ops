import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { config } from "../config/env.js";

const model = new ChatOpenAI({
    temperature: 0.7,
    model: "tngtech/deepseek-r1t2-chimera:free",
    apiKey: config.openaiApiKey,
    configuration: { 
        baseURL: config.openaiBaseUrl 
    },
});

export async function invoke(userMessage) {
    console.log("Bot invoked with message:", userMessage);
    let response;
    try {
        const messages = [
            new SystemMessage("You are a helpful loan assistant bot. Respond concisely and friendly to user queries about loans or general chat."),
            new HumanMessage(userMessage),
        ];
        const res = await model.invoke(messages);
        response = res.content;
    } catch (err) {
        console.error("Error in bot invocation:", err);
        response = "Sorry, I encountered followed by an error. Please try again.";
    }
    console.log("Bot response:", response);
    return response;
}
