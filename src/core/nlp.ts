import type { AgentMode } from '../types/index.js';
import { generateText, isLLMConfigured } from './llm.js';
import { logger } from './logger.js';

export interface ParsedRequest {
  section: 'Q1' | 'Q2' | 'ALL';
  mode: AgentMode;
  resume: boolean;
  intent: string;
  confidence: number;
}

const Q1_KEYWORDS = [
  'facebook', 'meta', 'ads campaign', 'ad set', 'lead form',
  'a/b test', 'ab test', 'business suite', 'q1', 'question 1',
];

const Q2_KEYWORDS = [
  'linkedin', 'profile', 'company page', 'lead gen', 'outreach',
  'prospects', 'client hunting', 'content plan', 'q2', 'question 2',
];

const RESUME_KEYWORDS = ['resume', 'continue', 'restart', 'pick up', 'where left'];

const ALL_KEYWORDS = ['all', 'everything', 'both', 'full assignment', 'entire', 'whole'];

export async function parseNaturalLanguage(input: string): Promise<ParsedRequest> {
  const lower = input.toLowerCase().trim();

  // Try LLM-based parsing first
  if (isLLMConfigured() && input.length > 5) {
    try {
      const parsed = await parseWithLLM(input);
      if (parsed.confidence > 0.7) {
        return parsed;
      }
    } catch (err) {
      logger.warn('NLP', `LLM parsing failed, falling back to keyword matching: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  }

  // Fallback to keyword matching
  return parseWithKeywords(lower);
}

async function parseWithLLM(input: string): Promise<ParsedRequest> {
  const prompt = `Parse this user request into structured data. Return ONLY valid JSON, no explanation.

User input: "${input}"

Return JSON with these fields:
{
  "section": "Q1" | "Q2" | "ALL",
  "mode": "DEMO_MODE" | "LIVE_MODE",
  "resume": boolean,
  "intent": "execute" | "help" | "status" | "report" | "evidence" | "security",
  "confidence": number (0-1)
}

Rules:
- Q1 = Facebook/Meta tasks, Q2 = LinkedIn tasks, ALL = both
- LIVE_MODE = real browser actions, DEMO_MODE = simulated
- resume = true if user wants to continue from where they left off
- intent = what the user wants to do
- confidence = how confident you are in the parsing (0-1)`;

  const response = await generateText(
    prompt,
    'You are an NLP parser. Return only valid JSON.',
    { temperature: 0.1, maxTokens: 300 }
  );

  const jsonMatch = response.content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('No JSON found in LLM response');
  }

  const parsed = JSON.parse(jsonMatch[0]);

  return {
    section: ['Q1', 'Q2', 'ALL'].includes(parsed.section) ? parsed.section : 'ALL',
    mode: parsed.mode === 'LIVE_MODE' ? 'LIVE_MODE' : 'DEMO_MODE',
    resume: Boolean(parsed.resume),
    intent: parsed.intent || 'execute',
    confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.8,
  };
}

function parseWithKeywords(lower: string): ParsedRequest {
  const resume = RESUME_KEYWORDS.some(k => lower.includes(k));

  let section: 'Q1' | 'Q2' | 'ALL' = 'ALL';
  const q1Score = Q1_KEYWORDS.filter(k => lower.includes(k)).length;
  const q2Score = Q2_KEYWORDS.filter(k => lower.includes(k)).length;
  const allScore = ALL_KEYWORDS.filter(k => lower.includes(k)).length;

  if (allScore > 0 || (q1Score > 0 && q2Score > 0)) {
    section = 'ALL';
  } else if (q1Score > q2Score) {
    section = 'Q1';
  } else if (q2Score > q1Score) {
    section = 'Q2';
  } else {
    section = 'ALL';
  }

  let mode: AgentMode = 'DEMO_MODE';
  if (lower.includes('live') || lower.includes('real') || lower.includes('browser') || lower.includes('actually')) {
    mode = 'LIVE_MODE';
  }

  const maxScore = Math.max(q1Score, q2Score, allScore);
  const confidence = Math.min(1, maxScore * 0.3 + 0.4);

  let intent = 'execute';
  if (lower.includes('help') || lower.includes('what can')) {
    intent = 'help';
  } else if (lower.includes('status') || lower.includes('progress')) {
    intent = 'status';
  } else if (lower.includes('report')) {
    intent = 'report';
  } else if (lower.includes('evidence')) {
    intent = 'evidence';
  } else if (lower.includes('security') || lower.includes('audit')) {
    intent = 'security';
  }

  return { section, mode, resume, intent, confidence };
}

export function formatDetectedPlan(parsed: ParsedRequest): string {
  const lines: string[] = [];
  lines.push('Detected:');
  lines.push(`  Section: ${parsed.section === 'ALL' ? 'Q1 + Q2 (Full Assignment)' : parsed.section === 'Q1' ? 'Q1 Facebook/Meta' : 'Q2 LinkedIn'}`);
  lines.push(`  Mode: ${parsed.mode}`);
  lines.push(`  Intent: ${parsed.intent}`);
  if (parsed.resume) lines.push('  Resume: Yes');
  lines.push(`  Confidence: ${(parsed.confidence * 100).toFixed(0)}%`);
  return lines.join('\n');
}
