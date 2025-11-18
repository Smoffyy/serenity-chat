import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const res = await fetch(`${process.env.LM_STUDIO_BASE_URL}/models`);
    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ data: [] });
  }
}