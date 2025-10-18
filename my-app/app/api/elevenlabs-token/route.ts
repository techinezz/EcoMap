import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  console.log('===== ELEVENLABS TOKEN API ROUTE CALLED =====');

  try {
    const body = await request.json();
    console.log('Request body:', body);

    const { agentId, context } = body;
    console.log('Requesting token for agent:', agentId);

    const apiKey = process.env.NEXT_PUBLIC_ELEVENLABS_API_KEY;

    if (!apiKey) {
      console.error('API key not found in environment');
      return NextResponse.json(
        { error: 'API key not configured' },
        { status: 500 }
      );
    }

    console.log('Making request to ElevenLabs API...');
    console.log('Context to send (length):', context?.length);

    // Try a simpler approach - just get the signed URL without variables first
    const url = `https://api.elevenlabs.io/v1/convai/conversation/get_signed_url?agent_id=${agentId}`;
    console.log('Request URL:', url);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'xi-api-key': apiKey,
      },
    });

    console.log('ElevenLabs API response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('ElevenLabs API error response:', errorText);
      return NextResponse.json(
        {
          error: 'Failed to get conversation token',
          details: errorText,
          status: response.status
        },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('Successfully got token from ElevenLabs');

    return NextResponse.json({
      signedUrl: data.signed_url,
      conversationId: data.conversation_id,
    });
  } catch (error: any) {
    console.error('Error getting ElevenLabs token:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error.message
      },
      { status: 500 }
    );
  }
}
