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

    const { prompt, coordinates } = await request.json();

    if (!prompt) {
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      );
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

    // Build coordinate context if coordinates are provided
    let coordinateContext = '';
    let isInitialAnalysis = false;

    if (coordinates && coordinates.length > 0) {
      // Check if this is the initial analysis request
      isInitialAnalysis = prompt.toLowerCase().includes('analyze the area i just selected');

      if (isInitialAnalysis) {
        coordinateContext = `\n\nIMPORTANT: The user has selected the following area(s) on the map:\n${JSON.stringify(coordinates, null, 2)}\n\nThese coordinates are in [longitude, latitude] format.

REQUIRED RESPONSE FORMAT for initial coordinate analysis:
You MUST structure your response exactly as follows:

1. **Location Identification** 📍:
   - Start with "You selected [specific area description]."
   - Be VERY specific: Include neighborhood names, street boundaries if possible, notable landmarks, and exact borough/district
   - Example: "You selected an area in Chelsea and Greenwich Village, bounded approximately by West 34th Street to the north, West 14th Street to the south, 8th Avenue to the east, and the Hudson River to the west in Manhattan, New York City, New York, USA."
   - If multiple areas, describe each one separately

2. **Key Issues**
   - List EXACTLY 2 primary sustainability challenges this specific area faces
   - Focus on: climate change impacts (flooding 💧, heat 🌡️, storms 🌪️), infrastructure problems, environmental quality (air quality 💨, water 💧), waste management ♻️, energy ⚡, transportation 🚗, biodiversity 🌳
   - Keep each issue BRIEF: 1-2 sentences ONLY. Don't go into deep detail - just state the issue clearly and concisely

3. **Possible Solutions**
   - Provide EXACTLY 2 concrete, actionable solutions
   - Include: infrastructure improvements, green infrastructure, policy changes, community initiatives, technological solutions
   - Make solutions specific to the identified issues

Use clear formatting with headers, bullet points, and emojis.`;
      } else {
        // For follow-up questions, just provide the coordinates as context
        coordinateContext = `\n\nContext: The user previously selected area(s) with these coordinates:\n${JSON.stringify(coordinates, null, 2)}\n\nIMPORTANT: Answer their question in a SHORT, CONCISE format:
- Start with 1-2 short paragraphs (2-3 sentences each) introducing your answer
- Then provide 3-5 bullet points with specific, actionable details
- Do NOT use the structured format with sections like "Key Issues" or "Possible Solutions"
- Be conversational, direct, and to the point
- Use emojis where relevant to make it engaging

Example format:
[Short intro paragraph explaining the concept]

[Optional second paragraph with context]

- First specific point with details
- Second specific point
- Third specific point
- etc.`;
      }
    }

    // System prompt to keep AI focused on map-related topics
    const systemPrompt = `You are an AI assistant specifically designed to help users understand and analyze geographic and map data with a focus on sustainability and environmental issues.

Your primary functions are:
- Answer questions about geographic locations, coordinates, and areas on the map
- Provide summaries and insights about specific locations when given coordinates
- Analyze sustainability challenges and solutions for selected geographic areas
- Help users understand environmental, climate, and infrastructure issues in specific locations
- Provide detailed explanations about sustainability solutions, policies, and implementation strategies
- Calculate center points, areas, and other geographic metrics from coordinate data

You should respond to questions related to:
- Maps and geographic locations
- Coordinates and spatial data
- Area analysis and location information
- Geographic features and landmarks
- Environmental or demographic data about locations
- **Sustainability issues and solutions for the selected areas** (flooding, climate change, energy, transportation, waste, air quality, etc.)
- **Implementation strategies** for sustainability solutions (How to implement green infrastructure, building retrofits, policy changes, etc.)
- **Comparative analysis** between different geographic areas
- **Specific details** about any sustainability topic related to the selected location

IMPORTANT: If the user has selected an area on the map, you should answer ANY question related to sustainability, environment, infrastructure, or solutions for that area. This includes questions like:
- "How can we start replacing older buildings?"
- "What are the costs of these solutions?"
- "How do we implement green infrastructure?"
- "What policies are needed?"

Only redirect the user if they ask about topics completely unrelated to geography, location, or sustainability (like cooking recipes, sports scores, etc.).

${coordinateContext}

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