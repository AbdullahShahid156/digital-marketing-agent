import Groq from 'groq-sdk';
import { logger } from './logger.js';

let groqClient: Groq | null = null;

function getGroqClient(): Groq {
  if (!groqClient) {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      throw new Error('GROQ_API_KEY environment variable is required');
    }
    groqClient = new Groq({ apiKey });
  }
  return groqClient;
}

export interface LLMOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface LLMResponse {
  content: string;
  model: string;
  tokensUsed: number;
}

const DEFAULT_MODEL = 'llama-3.3-70b-versatile';

export async function generateText(
  prompt: string,
  systemPrompt?: string,
  options: LLMOptions = {}
): Promise<LLMResponse> {
  const model = options.model || DEFAULT_MODEL;
  const temperature = options.temperature ?? 0.7;
  const maxTokens = options.maxTokens ?? 1024;

  try {
    const client = getGroqClient();

    const messages: Array<{ role: 'system' | 'user'; content: string }> = [];
    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt });
    }
    messages.push({ role: 'user', content: prompt });

    const response = await client.chat.completions.create({
      model,
      messages,
      temperature,
      max_tokens: maxTokens,
    });

    const content = response.choices[0]?.message?.content || '';
    const tokensUsed = response.usage?.total_tokens || 0;

    logger.info('LLM', `Generated ${tokensUsed} tokens using ${model}`);

    return {
      content,
      model,
      tokensUsed,
    };
  } catch (error) {
    logger.error('LLM', `Generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    throw error;
  }
}

export async function generateAdCopy(
  businessName: string,
  product: string,
  audience: string,
  platform: 'facebook' | 'linkedin' = 'facebook'
): Promise<string[]> {
  const systemPrompt = `You are a digital marketing expert specializing in ${platform} ads. Generate compelling ad copy that drives engagement and conversions.`;

  const prompt = `Generate 3 different ad copy variations for:
Business: ${businessName}
Product/Service: ${product}
Target Audience: ${audience}
Platform: ${platform}

Format each variation on a new line starting with "Variation 1:", "Variation 2:", etc.`;

  const response = await generateText(prompt, systemPrompt, { temperature: 0.8 });

  const variations = response.content
    .split(/\n/)
    .filter(line => line.trim().startsWith('Variation'))
    .map(line => line.replace(/^Variation\s*\d*:?\s*/i, '').trim())
    .filter(v => v.length > 0);

  return variations.length > 0 ? variations : [response.content];
}

export async function generatePostCaption(
  businessName: string,
  topic: string,
  platform: 'facebook' | 'linkedin' = 'facebook'
): Promise<string> {
  const systemPrompt = `You are a social media expert creating engaging ${platform} posts. Be concise, professional, and include relevant hashtags.`;

  const prompt = `Create a ${platform} post for:
Business: ${businessName}
Topic: ${topic}

Include 3-5 relevant hashtags at the end.`;

  const response = await generateText(prompt, systemPrompt, { temperature: 0.7, maxTokens: 512 });

  return response.content;
}

export async function generateAudienceSuggestions(
  businessType: string,
  product: string
): Promise<string[]> {
  const systemPrompt = 'You are a digital marketing audience targeting expert.';

  const prompt = `Suggest 5 target audience segments for:
Business Type: ${businessType}
Product/Service: ${product}

Format as a numbered list.`;

  const response = await generateText(prompt, systemPrompt, { temperature: 0.7 });

  const audiences = response.content
    .split('\n')
    .filter(line => /^\d+[\.\)]/.test(line.trim()))
    .map(line => line.replace(/^\d+[\.\)]\s*/, '').trim())
    .filter(a => a.length > 0);

  return audiences.length > 0 ? audiences : response.content.split('\n').filter(l => l.trim().length > 0);
}

export function isLLMConfigured(): boolean {
  return !!process.env.GROQ_API_KEY;
}
