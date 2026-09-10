import type { AgentMode } from '../types/index.js';

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

export function parseNaturalLanguage(input: string): ParsedRequest {
  const lower = input.toLowerCase().trim();

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
  }

  return { section, mode, resume, intent, confidence };
}

export function formatDetectedPlan(parsed: ParsedRequest): string {
  const lines: string[] = [];
  lines.push('Detected:');
  lines.push(`  Section: ${parsed.section === 'ALL' ? 'Q1 + Q2 (Full Assignment)' : parsed.section === 'Q1' ? 'Q1 Facebook/Meta' : 'Q2 LinkedIn'}`);
  lines.push(`  Mode: ${parsed.mode}`);
  if (parsed.resume) lines.push('  Resume: Yes');
  return lines.join('\n');
}
