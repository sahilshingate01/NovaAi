import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { messages } = await request.json();
    // Fallback to NVIDIA API key since it's working, OpenRouter returns 401
    const apiKey = process.env.NVIDIA_IMAGE_KEY || process.env.OPENROUTER_API_KEY;

    if (!apiKey) {
      return NextResponse.json({ error: 'API key not configured' }, { status: 500 });
    }

    const response = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        model: 'meta/llama3-8b-instruct',
        messages: messages,
        max_tokens: 1024,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Chat API Error:', {
        status: response.status,
        error: errorData
      });
      return NextResponse.json(
        { error: errorData.error?.message || errorData.detail || `API error: ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('Chat API Response Success');
    return NextResponse.json(data);
  } catch (error) {
    console.error('Chat API Internal Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
