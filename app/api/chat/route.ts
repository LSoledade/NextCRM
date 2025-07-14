import { openai } from '@ai-sdk/openai';
import { streamText } from 'ai';

export const runtime = 'edge';

export async function POST(req: Request) {
  const { messages } = await req.json();
  
  const result = await streamText({
    model: openai('gpt-4o'),
    messages: [
      {
        role: 'system',
        content: 'Você é um agente IA útil. Formate respostas com bullet points para listas, use markdown para código, e estruture pensamentos de forma clara.'
      },
      ...messages
    ],
  });
  
  return result.toDataStreamResponse();
}