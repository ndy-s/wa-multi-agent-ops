import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { z } from "zod";
import { config } from "../config/env.js";
import apis from "../config/apiConfig.json" with { type: "json" };
import { apiParserPrompt } from "../prompts/apiParserPrompt.js";

// 1️⃣ Define structured output schema
const apiResponseSchema = z.object({
  api_id: z.string().nullable(),
  params: z.record(z.any()).optional(),
  clarification: z.string().optional(),
});

// 2️⃣ Initialize model
const model = new ChatOpenAI({
  temperature: 0,
  model: "tngtech/deepseek-r1t2-chimera:free",
  apiKey: config.openaiApiKey,
  configuration: {
    baseURL: config.openaiBaseUrl,
  },
});

// 3️⃣ Agent function
export async function invokeAgent(userMessage) {
  console.log("Bot invoked with message:", userMessage);

  let response;

  try {
    const messages = [
      new SystemMessage(
        `You are a helpful API assistant that parses user messages into API calls.`
      ),
      new HumanMessage(apiParserPrompt(apis, userMessage)),
    ];

    console.log("Sending messages to model:", messages.map(m => m.text || m.content));

    // Call the model
    const res = await model.invoke(messages);
    console.log("Raw model response:", res);

    const content = res.content.trim();
    console.log("Model content:", content);

    // Try to parse structured output
    try {
      const parsed = JSON.parse(content);
      const validated = apiResponseSchema.parse(parsed);

      if (!validated.api_id) {
        response = validated.clarification || "I couldn't understand your request. Can you clarify?";
      } else {
        response = `API to call: ${validated.api_id}, Params: ${JSON.stringify(validated.params)}`;
      }

    } catch (parseErr) {
      console.error("Error parsing model output:", parseErr);
      response = "I couldn't understand your request clearly. Can you please clarify?";
    }

  } catch (err) {
    console.error("Error in agent invocation:", err);
    response = "Sorry, I encountered an error. Please try again.";
  }

  console.log("Bot response:", response);
  return response;
}


