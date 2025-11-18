import { NextResponse } from 'next/server';

const LM_STUDIO_MODELS_URL = 'http://127.0.0.1:1234/v1/models';

export async function GET() {
    try {
        // Direct fetch to the LM Studio models endpoint.
        const response = await fetch(LM_STUDIO_MODELS_URL, {
            method: 'GET',
            headers: {
                // Required for OpenAI compatible local servers
                'Authorization': 'Bearer lm-studio' 
            }
        });

        if (!response.ok) {
            console.error(`[API/MODELS Error] Fetch failed with status: ${response.status}`);
            const errorText = await response.text();
            throw new Error(`LM Studio API returned status ${response.status}. Response: ${errorText}`);
        }

        const data = await response.json();
        
        // LM Studio's models endpoint returns a list with a structure like { data: [...] }
        const models = data.data; 

        // Return the list of models wrapped in a 'data' property
        return NextResponse.json({ data: models }, { status: 200 });

    } catch (error: any) {
        console.error("[API/MODELS Error] Failed to list models from LM Studio:", error.message);
        
        return NextResponse.json(
            { error: `Could not fetch models. Check if LM Studio is running and loaded a model. Detail: ${error.message}` }, 
            { status: 500 }
        );
    }
}