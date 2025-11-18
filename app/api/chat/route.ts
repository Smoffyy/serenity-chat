import { createOpenAI } from '@ai-sdk/openai';
import { streamText } from 'ai';

// CONFIGURATION: Set up the OpenAI provider to point to LM Studio
const lmStudio = createOpenAI({
  baseURL: 'http://127.0.0.1:1234/v1',
  apiKey: 'lm-studio',
});

export async function POST(req: Request) {
  try {
    const { messages, model } = await req.json();

    console.log(`[Server] Sending request to Local AI... Model: ${model}`);

    const result = streamText({
      // Use the configured provider instance with the selected model ID
      model: lmStudio(model || 'local-model'), 
      messages,
    });

    // Return the response as a stream of text
    return result.toTextStreamResponse();

  } catch (error) {
    console.error("[Server Error]", error);
    return new Response(JSON.stringify({ error: "Failed to connect to LM Studio" }), {
      status: 500,
    });
  }
}