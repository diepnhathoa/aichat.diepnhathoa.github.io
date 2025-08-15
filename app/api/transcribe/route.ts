import { NextResponse } from 'next/server';
import { openai } from '@ai-sdk/openai';

export const maxDuration = 60;

export async function POST(req: Request) {
  const formData = await req.formData();
  const file = formData.get('audio') as File | null;
  if (!file) {
    return NextResponse.json({ error: 'No audio file provided' }, { status: 400 });
  }
  try {
    const data = new FormData();
    data.append('model', 'whisper-1');
    data.append('file', file);
    const resp = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: data,
    });
    const result = await resp.json();
    if (resp.ok) {
      return NextResponse.json({ text: result.text });
    }
    return NextResponse.json({ error: result.error?.message || 'Transcription failed' }, { status: 500 });
  } catch (error) {
    console.error('Transcription error', error);
    return NextResponse.json({ error: 'Transcription failed' }, { status: 500 });
  }
}
