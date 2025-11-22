import { NextRequest, NextResponse } from "next/server";
import { API_CONFIG } from "@/lib/api-config";

export const runtime = "edge";

export async function POST(req: NextRequest) {
  try {
    const { messages, model } = await req.json();

    const response = await fetch(`${API_CONFIG.BASE_URL}/chat/completions`, {
      method: "POST",
      headers: API_CONFIG.headers,
      body: JSON.stringify({
        model: model,
        messages: messages,
        stream: true, 
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: "LM Studio Error: " + response.statusText },
        { status: response.status }
      );
    }

    // Pass the stream directly through to the client
    return new NextResponse(response.body, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("Proxy Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}