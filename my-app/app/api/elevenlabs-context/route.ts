import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { coordinates } = await request.json();

    // Format coordinates for the agent
    let contextMessage = '';

    if (coordinates && coordinates.length > 0) {
      // Extract the polygon coordinates
      const coords = coordinates[0]; // First polygon

      // Calculate center point (approximate)
      let sumLat = 0, sumLon = 0, count = 0;

      if (Array.isArray(coords[0])) {
        // GeoJSON format: array of [lon, lat] pairs
        coords[0].forEach((point: number[]) => {
          sumLon += point[0];
          sumLat += point[1];
          count++;
        });
      }

      const centerLon = sumLon / count;
      const centerLat = sumLat / count;

      contextMessage = `Selected area center coordinates: [${centerLon.toFixed(6)}, ${centerLat.toFixed(6)}]. The user has drawn a polygon on the map covering this area. Provide environmental and sustainability analysis for this specific location.`;
    } else {
      contextMessage = 'No area selected yet. Please ask the user to draw an area on the map to analyze.';
    }

    return NextResponse.json({
      success: true,
      context: contextMessage,
      coordinates
    });

  } catch (error) {
    console.error('Error processing coordinates:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to process coordinates'
    }, { status: 500 });
  }
}
