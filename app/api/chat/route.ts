import { streamText, convertToModelMessages, type UIMessage } from 'ai';
import { openai } from '@ai-sdk/openai';
import { anthropic } from '@ai-sdk/anthropic';
import { google } from '@ai-sdk/google';
import { groq } from '@ai-sdk/groq';

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

export async function POST(req: Request) {
  const body = await req.json();
  const { messages } = body;
  
  // Check if web search is enabled from the last message's metadata
  const lastMessage = messages[messages.length - 1];
  const useWebSearch = lastMessage?.metadata?.useWebSearch || false;
  const modelId = lastMessage?.metadata?.modelId || 'gpt-4o-mini';
  const provider = lastMessage?.metadata?.provider || 'openai';

  const result = streamText({
    model:
      provider === 'openai'
        ? openai.responses(modelId)
        : provider === 'anthropic'
        ? anthropic(modelId)
        : provider === 'google'
        ? google(modelId)
        : groq(modelId),
    messages: convertToModelMessages(messages),
    ...(useWebSearch && {
      tools: {
          web_search_preview: openai.tools.webSearchPreview({
          searchContextSize: 'high',
        }),
      },
    }),
  });

  return result.toUIMessageStreamResponse({ sendSources: true, sendReasoning: true });
}
