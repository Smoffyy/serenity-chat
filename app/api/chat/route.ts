import { createOpenAI } from '@ai-sdk/openai';
import { streamText } from 'ai';

// CONFIGURATION FIX:
// 1. use 'baseURL' (Capital URL), not 'baseUrl'.
// 2. Hardcoded http://127.0.0.1:1234/v1 to ensure it hits local machine.
const lmStudio = createOpenAI({
  baseURL: 'http://127.0.0.1:1234/v1',
  apiKey: 'lm-studio', // This can be anything, but cannot be empty
});

export async function POST(req: Request) {
  try {
    const { messages, model } = await req.json();

    // Console log to prove we are entering the route
    console.log(`[Server] Sending request to Local AI... Model: ${model}`);

    const result = streamText({
      model: lmStudio(model || 'local-model'),
      messages,
    });

    // Using toTextStreamResponse() for our manual frontend
    return result.toTextStreamResponse();

  } catch (error) {
    console.error("[Server Error]", error);
    return new Response(JSON.stringify({ error: "Failed to connect to LM Studio" }), {
      status: 500,
    });
  }
}