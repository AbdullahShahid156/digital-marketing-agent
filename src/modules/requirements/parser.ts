import type { Requirement, RequirementPriority } from '../../types/index.js';

export interface RawRequirement {
  id: string;
  section: string;
  title: string;
  description: string;
  priority?: string;
  subtasks?: string[];
}

export function parseRawRequirements(raw: RawRequirement[]): Requirement[] {
  return raw.map(r => ({
    id: r.id,
    section: r.section,
    title: r.title,
    description: r.description,
    priority: normalizePriority(r.priority),
    automatable: determineAutomatability(r),
    tasks: [],
  }));
}

function normalizePriority(priority?: string): RequirementPriority {
  if (!priority) return 'medium';
  const lower = priority.toLowerCase();
  if (lower === 'high' || lower === 'critical') return 'high';
  if (lower === 'low') return 'low';
  return 'medium';
}

function determineAutomatability(req: RawRequirement): boolean {
  const manualKeywords = [
    'screenshot',
    'login',
    'publish',
    'post',
    'connect account',
    'approve',
    'manual',
  ];
  const lower = (req.title + ' ' + req.description).toLowerCase();
  return !manualKeywords.some(kw => lower.includes(kw));
}

export function extractRequirementsFromText(text: string): RawRequirement[] {
  const requirements: RawRequirement[] = [];
  const lines = text.split('\n');
  let currentSection = '';
  let currentReq: Partial<RawRequirement> | null = null;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const sectionMatch = trimmed.match(/^(?:Q\d+|Section\s+\d+)[\s:.-]*(.+)/i);
    if (sectionMatch) {
      currentSection = sectionMatch[1].trim();
      continue;
    }

    const reqMatch = trimmed.match(
      /^(?:Task|Requirement|Item)?\s*(\d+)[\s:.-]+(.+)/i
    );
    if (reqMatch) {
      if (currentReq?.title) {
        requirements.push(currentReq as RawRequirement);
      }
      currentReq = {
        id: `REQ-${requirements.length + 1}`,
        section: currentSection,
        title: reqMatch[2].trim(),
        description: '',
      };
      continue;
    }

    if (currentReq && !currentReq.description) {
      currentReq.description = trimmed;
    } else if (currentReq) {
      currentReq.description += ' ' + trimmed;
    }
  }

  if (currentReq?.title) {
    requirements.push(currentReq as RawRequirement);
  }

  return requirements;
}

export function generateRequirementChecklist(
  requirements: Requirement[]
): string {
  const lines: string[] = [
    '# Assignment Requirement Checklist',
    '',
    `Generated: ${new Date().toISOString()}`,
    '',
    '## Summary',
    `- Total Requirements: ${requirements.length}`,
    `- High Priority: ${requirements.filter(r => r.priority === 'high').length}`,
    `- Medium Priority: ${requirements.filter(r => r.priority === 'medium').length}`,
    `- Low Priority: ${requirements.filter(r => r.priority === 'low').length}`,
    `- Automatable: ${requirements.filter(r => r.automatable).length}`,
    `- Manual Required: ${requirements.filter(r => !r.automatable).length}`,
    '',
    '## Requirements',
    '',
  ];

  const sections = [...new Set(requirements.map(r => r.section))];
  for (const section of sections) {
    lines.push(`### ${section}`);
    lines.push('');
    const sectionReqs = requirements.filter(r => r.section === section);
    for (const req of sectionReqs) {
      const checkbox = '- [ ]';
      const priority = `[${req.priority.toUpperCase()}]`;
      const auto = req.automatable ? '[AUTO]' : '[MANUAL]';
      lines.push(`${checkbox} ${req.id}: ${req.title} ${priority} ${auto}`);
      if (req.description) {
        lines.push(`  ${req.description}`);
      }
    }
    lines.push('');
  }

  return lines.join('\n');
}
