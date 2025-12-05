import { NextResponse } from "next/server";
import { API_CONFIG } from "@/lib/api-config";

export async function GET() {
  try {
    const response = await fetch(`${API_CONFIG.BASE_URL}/models`, {
      headers: API_CONFIG.headers,
    });

    if (!response.ok) {
      throw new Error("Failed to fetch models from LM Studio");
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Model fetch error:", error);
    return NextResponse.json({ data: [] }, { status: 500 });
  }
}