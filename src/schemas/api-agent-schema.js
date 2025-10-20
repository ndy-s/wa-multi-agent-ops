import { z } from "zod";

export const apiCallSchema = z.object({
    id: z.string(),
    params: z.record(z.any()),
});

export const apiActionSchema = z.object({
    thoughts: z.array(z.string()),
    type: z.literal("api_action"),
    inScope: z.literal(true),
    content: z.object({
        apis: z.array(apiCallSchema),
        message: z.string().nullable().optional(),
    }),
});

export const messageSchema = z.object({
    thoughts: z.array(z.string()),
    type: z.literal("message"),
    inScope: z.boolean(),
    content: z.object({
        apis: z.array(z.any()).nullable().optional(),
        message: z.string(),
    }),
});

export const apiAgentSchema = z.union([apiActionSchema, messageSchema]);
