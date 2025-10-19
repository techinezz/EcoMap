import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextRequest, NextResponse } from 'next/server';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

// Fallback coordinates when API quota is exceeded - Worldwide cities
const FALLBACK_LOCATIONS = [
  // North America
  {
    coordinates: [[37.8000, -122.4600], [37.8000, -122.4550], [37.7975, -122.4550], [37.7975, -122.4600]],
    location: "Presidio, San Francisco, CA"
  },
  {
    coordinates: [[40.7580, -73.9855], [40.7580, -73.9805], [40.7555, -73.9805], [40.7555, -73.9855]],
    location: "Times Square, New York City, NY"
  },
  {
    coordinates: [[43.6532, -79.3832], [43.6532, -79.3782], [43.6507, -79.3782], [43.6507, -79.3832]],
    location: "Toronto, Canada"
  },
  {
    coordinates: [[19.4326, -99.1332], [19.4326, -99.1282], [19.4301, -99.1282], [19.4301, -99.1332]],
    location: "Mexico City, Mexico"
  },
  // Europe
  {
    coordinates: [[51.5074, -0.1278], [51.5074, -0.1228], [51.5049, -0.1228], [51.5049, -0.1278]],
    location: "London, United Kingdom"
  },
  {
    coordinates: [[48.8566, 2.3522], [48.8566, 2.3572], [48.8541, 2.3572], [48.8541, 2.3522]],
    location: "Paris, France"
  },
  {
    coordinates: [[52.5200, 13.4050], [52.5200, 13.4100], [52.5175, 13.4100], [52.5175, 13.4050]],
    location: "Berlin, Germany"
  },
  {
    coordinates: [[41.9028, 12.4964], [41.9028, 12.5014], [41.9003, 12.5014], [41.9003, 12.4964]],
    location: "Rome, Italy"
  },
  {
    coordinates: [[40.4168, -3.7038], [40.4168, -3.6988], [40.4143, -3.6988], [40.4143, -3.7038]],
    location: "Madrid, Spain"
  },
  {
    coordinates: [[55.7558, 37.6173], [55.7558, 37.6223], [55.7533, 37.6223], [55.7533, 37.6173]],
    location: "Moscow, Russia"
  },
  // Asia
  {
    coordinates: [[35.6762, 139.6503], [35.6762, 139.6553], [35.6737, 139.6553], [35.6737, 139.6503]],
    location: "Tokyo, Japan"
  },
  {
    coordinates: [[39.9042, 116.4074], [39.9042, 116.4124], [39.9017, 116.4124], [39.9017, 116.4074]],
    location: "Beijing, China"
  },
  {
    coordinates: [[31.2304, 121.4737], [31.2304, 121.4787], [31.2279, 121.4787], [31.2279, 121.4737]],
    location: "Shanghai, China"
  },
  {
    coordinates: [[1.3521, 103.8198], [1.3521, 103.8248], [1.3496, 103.8248], [1.3496, 103.8198]],
    location: "Singapore"
  },
  {
    coordinates: [[37.5665, 126.9780], [37.5665, 126.9830], [37.5640, 126.9830], [37.5640, 126.9780]],
    location: "Seoul, South Korea"
  },
  {
    coordinates: [[28.6139, 77.2090], [28.6139, 77.2140], [28.6114, 77.2140], [28.6114, 77.2090]],
    location: "New Delhi, India"
  },
  {
    coordinates: [[19.0760, 72.8777], [19.0760, 72.8827], [19.0735, 72.8827], [19.0735, 72.8777]],
    location: "Mumbai, India"
  },
  {
    coordinates: [[13.7563, 100.5018], [13.7563, 100.5068], [13.7538, 100.5068], [13.7538, 100.5018]],
    location: "Bangkok, Thailand"
  },
  // Middle East
  {
    coordinates: [[25.2048, 55.2708], [25.2048, 55.2758], [25.2023, 55.2758], [25.2023, 55.2708]],
    location: "Dubai, UAE"
  },
  {
    coordinates: [[41.0082, 28.9784], [41.0082, 28.9834], [41.0057, 28.9834], [41.0057, 28.9784]],
    location: "Istanbul, Turkey"
  },
  // Africa
  {
    coordinates: [[-33.9249, 18.4241], [-33.9249, 18.4291], [-33.9274, 18.4291], [-33.9274, 18.4241]],
    location: "Cape Town, South Africa"
  },
  {
    coordinates: [[30.0444, 31.2357], [30.0444, 31.2407], [30.0419, 31.2407], [30.0419, 31.2357]],
    location: "Cairo, Egypt"
  },
  {
    coordinates: [[-1.2921, 36.8219], [-1.2921, 36.8269], [-1.2946, 36.8269], [-1.2946, 36.8219]],
    location: "Nairobi, Kenya"
  },
  // South America
  {
    coordinates: [[-23.5505, -46.6333], [-23.5505, -46.6283], [-23.5530, -46.6283], [-23.5530, -46.6333]],
    location: "São Paulo, Brazil"
  },
  {
    coordinates: [[-34.6037, -58.3816], [-34.6037, -58.3766], [-34.6062, -58.3766], [-34.6062, -58.3816]],
    location: "Buenos Aires, Argentina"
  },
  {
    coordinates: [[-12.0464, -77.0428], [-12.0464, -77.0378], [-12.0489, -77.0378], [-12.0489, -77.0428]],
    location: "Lima, Peru"
  },
  // Oceania
  {
    coordinates: [[-33.8688, 151.2093], [-33.8688, 151.2143], [-33.8713, 151.2143], [-33.8713, 151.2093]],
    location: "Sydney, Australia"
  },
  {
    coordinates: [[-37.8136, 144.9631], [-37.8136, 144.9681], [-37.8161, 144.9681], [-37.8161, 144.9631]],
    location: "Melbourne, Australia"
  },
  {
    coordinates: [[-36.8485, 174.7633], [-36.8485, 174.7683], [-36.8510, 174.7683], [-36.8510, 174.7633]],
    location: "Auckland, New Zealand"
  },
];

export async function POST(request: NextRequest) {
  try {
    if (!process.env.GEMINI_API_KEY) {
      console.error('GEMINI_API_KEY is not set');
      return NextResponse.json(
        { error: 'API key not configured' },
        { status: 500 }
      );
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

    const prompt = `Generate 4 random coordinate points that form a rectangular area suitable for an environmental challenge game.

REQUIREMENTS:
1. The 4 points should form a rectangle (or roughly rectangular polygon)
2. The area should be between 5 and 30 miles in radius from a central point
3. ALL 4 points MUST be on land (not in the ocean or large bodies of water)
4. The area should be in an urban or suburban location ANYWHERE IN THE WORLD (any continent, any country)
5. The coordinates should be in [latitude, longitude] format
6. IMPORTANT: Choose a completely random city from anywhere on Earth - North America, South America, Europe, Asia, Africa, Oceania, Middle East, etc.

Please respond with ONLY a JSON object in this exact format (no markdown, no code blocks, no additional text):
{
  "coordinates": [
    [lat1, lon1],
    [lat2, lon2],
    [lat3, lon3],
    [lat4, lon4]
  ],
  "location": "City Name, Country"
}

The coordinates should form a rectangle by going in order (top-left, top-right, bottom-right, bottom-left) or similar pattern.`;

    console.log('Calling Gemini API...');
    const result = await model.generateContent(prompt);
    const response = result.response;
    let text = response.text().trim();

    console.log('Gemini raw response:', text);

    // Remove markdown code blocks if present
    text = text.replace(/```json\n?/g, '').replace(/```\n?/g, '');

    console.log('Cleaned response:', text);

    // Parse the JSON response
    let data;
    try {
      data = JSON.parse(text);
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      console.error('Text that failed to parse:', text);
      throw new Error(`Failed to parse Gemini response as JSON: ${text.substring(0, 100)}...`);
    }

    // Validate the response
    if (!data.coordinates || !Array.isArray(data.coordinates) || data.coordinates.length !== 4) {
      console.error('Invalid data structure:', data);
      throw new Error('Invalid coordinate format from Gemini');
    }

    // Validate each coordinate is [lat, lon]
    for (const coord of data.coordinates) {
      if (!Array.isArray(coord) || coord.length !== 2) {
        throw new Error('Invalid coordinate point format');
      }
      const [lat, lon] = coord;
      if (typeof lat !== 'number' || typeof lon !== 'number') {
        throw new Error('Coordinates must be numbers');
      }
      if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
        throw new Error('Coordinates out of valid range');
      }
    }

    console.log('Successfully generated coordinates:', data);
    return NextResponse.json(data);
  } catch (error) {
    console.error('Generate Challenge Coords Error:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack');

    // Check if it's a quota error (429)
    const errorMessage = error instanceof Error ? error.message : '';
    if (errorMessage.includes('429') || errorMessage.includes('quota') || errorMessage.includes('Too Many Requests')) {
      console.log('⚠️ Quota exceeded, using fallback coordinates');
      const randomLocation = FALLBACK_LOCATIONS[Math.floor(Math.random() * FALLBACK_LOCATIONS.length)];
      return NextResponse.json(randomLocation);
    }

    return NextResponse.json(
      { error: 'Failed to generate coordinates', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
