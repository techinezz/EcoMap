import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextRequest, NextResponse } from 'next/server';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

interface SimulationData {
  treeClusters: Array<{ id: string; center: [number, number]; count: number }>;
  solarClusters: Array<{ id: string; center: [number, number]; count: number }>;
  placedPavementPoints: Array<{ id: string; center: [number, number] }>;
  placedParks: Array<{ id: string; center: [number, number] }>;
  totalTreesPlaced: number;
  totalSolarPlaced: number;
}

export async function POST(request: NextRequest) {
  try {
    if (!process.env.GEMINI_API_KEY) {
      console.error('GEMINI_API_KEY is not set');
      return NextResponse.json(
        { error: 'API key not configured' },
        { status: 500 }
      );
    }

    const { locationAnalysis, simulationData } = await request.json();

    if (!locationAnalysis || !simulationData) {
      return NextResponse.json(
        { error: 'Location analysis and simulation data are required' },
        { status: 400 }
      );
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

    const simData = simulationData as SimulationData;

    const prompt = `You are an environmental sustainability scoring system. Based on the location analysis and user's simulation placements, calculate an EcoScore from 1-1000.

LOCATION ANALYSIS:
${locationAnalysis}

USER'S SIMULATION PLACEMENTS:
- Trees: ${simData.totalTreesPlaced} total in ${simData.treeClusters.length} clusters
- Solar Panels: ${simData.totalSolarPlaced} total in ${simData.solarClusters.length} clusters
- Permeable Pavement Points: ${simData.placedPavementPoints.length}
- Parks: ${simData.placedParks.length}

SCORING CRITERIA:
1. **Relevance to Issues (50% of score)**: How well do the simulations address the KEY ISSUES mentioned in the location analysis?
   - If flooding is an issue, permeable pavement should score higher
   - If heat is an issue, trees and parks should score higher
   - If energy is an issue, solar panels should score higher
   - If air quality is an issue, trees should score higher

2. **Quantity (25% of score)**: Appropriate number of interventions
   - Too few interventions = lower score
   - Balanced distribution = higher score
   - Excessive focus on one type = moderate score

3. **Diversity (15% of score)**: Variety of solution types
   - Multiple types of interventions = higher score
   - Only one type = lower score

4. **Spatial Distribution (10% of score)**: How well distributed are the placements
   - Cluster data shows if interventions are concentrated or spread out
   - Better distribution = higher score

IMPORTANT SCORING NOTES:
- If the area already has something (e.g., "the area has many parks"), adding more of that should receive a LOWER relevance score
- Solutions that directly address stated problems should score highest
- Creative but relevant combinations should be rewarded
- Completely irrelevant solutions should significantly reduce the score

Please respond with ONLY a JSON object (no markdown, no code blocks):
{
  "ecoscore": <number 1-1000>,
  "breakdown": {
    "relevance": <number 1-500>,
    "quantity": <number 1-250>,
    "diversity": <number 1-150>,
    "distribution": <number 1-100>
  },
  "feedback": {
    "whatWorked": "<2-3 sentence explanation of what improved the score>",
    "whatDidntWork": "<2-3 sentence explanation of what decreased the score>",
    "optimalSolution": "<2-3 sentence description of what the best simulation would have been>"
  }
}`;

    const result = await model.generateContent(prompt);
    const response = result.response;
    let text = response.text().trim();

    // Remove markdown code blocks if present
    text = text.replace(/```json\n?/g, '').replace(/```\n?/g, '');

    // Parse the JSON response
    const data = JSON.parse(text);

    // Validate the response
    if (typeof data.ecoscore !== 'number' || data.ecoscore < 1 || data.ecoscore > 1000) {
      throw new Error('Invalid ecoscore value');
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Calculate EcoScore Error:', error);
    return NextResponse.json(
      { error: 'Failed to calculate ecoscore', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
