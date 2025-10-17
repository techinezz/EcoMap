import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextRequest, NextResponse } from 'next/server';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function POST(request: NextRequest) {
  try {
    // Check if API key is present
    if (!process.env.GEMINI_API_KEY) {
      console.error('GEMINI_API_KEY is not set');
      return NextResponse.json(
        { error: 'API key not configured' },
        { status: 500 }
      );
    }

    const { prompt } = await request.json();

    if (!prompt) {
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      );
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

    // System prompt to keep AI focused on map-related topics
    const systemPrompt = `You are an AI assistant specifically designed to help users understand and analyze geographic and map data.

Your primary functions are:
- Answer questions about geographic locations, coordinates, and areas on the map
- Provide summaries and insights about specific locations when given coordinates
- Help users understand spatial data and geographic information
- Analyze map-related queries and provide relevant geographic context

You should ONLY respond to questions related to:
- Maps and geographic locations
- Coordinates and spatial data
- Area analysis and location information
- Geographic features and landmarks
- Environmental or demographic data about locations

If a user asks about topics unrelated to maps, geography, or location data, politely redirect them by saying: "I'm specifically designed to help with map and location-related questions. Please ask me about geographic areas, coordinates, or locations you'd like to know more about."

User query: ${prompt}`;

    const result = await model.generateContent(systemPrompt);
    const response = result.response;
    const text = response.text();

    return NextResponse.json({ text });
  } catch (error) {
    console.error('Gemini API Error:', error);
    return NextResponse.json(
      { error: 'Failed to generate content', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}