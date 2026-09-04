import type { Project } from '../../types/index.js';
import { saveProject } from '../../core/state.js';
import { logger } from '../../core/logger.js';

export interface MarketingStrategy {
  id: string;
  businessId: string;
  targetAudience: string;
  valueProposition: string;
  channels: string[];
  budget: string;
  timeline: string;
  objectives: string[];
  kpis: string[];
  contentPillars: string[];
  competitiveAdvantage: string;
}

export interface ContentPillar {
  id: string;
  name: string;
  description: string;
  topics: string[];
  frequency: string;
}

export function createMarketingStrategy(
  project: Project,
  strategy: Omit<MarketingStrategy, 'id' | 'businessId'>
): MarketingStrategy | null {
  if (!project.business) {
    logger.error('MarketingStrategy', 'No business profile exists');
    return null;
  }

  const newStrategy: MarketingStrategy = {
    id: crypto.randomUUID(),
    businessId: project.business.id,
    ...strategy,
  };

  project.campaigns.push({
    id: newStrategy.id,
    platform: 'meta',
    name: `Strategy for ${project.business.name}`,
    objective: strategy.valueProposition,
    audience: { demographics: [], interests: [], behaviors: [], locations: [] },
    budget: strategy.budget,
    schedule: strategy.timeline,
    adSets: [],
    status: 'PLANNING',
  });

  saveProject(project, 'create_strategy');
  logger.info('MarketingStrategy', `Created marketing strategy: ${newStrategy.id}`);
  return newStrategy;
}

export function generateSWOTAnalysis(project: Project): {
  strengths: string[];
  weaknesses: string[];
  opportunities: string[];
  threats: string[];
} | null {
  if (!project.business) {
    return null;
  }

  const b = project.business;
  return {
    strengths: [
      `${b.industry} expertise`,
      `Location in ${b.location}`,
      b.usp ? `Unique USP: ${b.usp}` : 'Strong value proposition',
    ],
    weaknesses: [
      'New market entry',
      'Limited brand awareness',
      'Budget constraints',
    ],
    opportunities: [
      'Growing digital market in Pakistan',
      'Increasing internet penetration',
      'Social media adoption growth',
    ],
    threats: [
      'Established competitors',
      'Market saturation',
      'Economic fluctuations',
    ],
  };
}

export function generateMarketingPlan(project: Project): string {
  if (!project.business) {
    return 'No business profile available for marketing plan.';
  }

  const b = project.business;
  const lines: string[] = [
    '# Marketing Strategy Plan',
    '',
    `## Business: ${b.name}`,
    '',
    '### Target Audience',
    ...b.targetMarket.map(t => `- ${t}`),
    '',
    '### Value Proposition',
    b.usp || 'To be defined',
    '',
    '### Marketing Channels',
    '- Facebook/Meta Marketing',
    '- LinkedIn Marketing',
    '- Content Marketing',
    '- Email Marketing',
    '',
    '### Content Pillars',
    '- Educational Content',
    '- Industry Insights',
    '- Case Studies',
    '- Tips and Best Practices',
    '',
    '### KPIs',
    '- Engagement Rate',
    '- Click-Through Rate',
    '- Conversion Rate',
    '- Cost Per Lead',
    '- Return on Ad Spend',
    '',
    '### Budget Allocation',
    '- 40% Facebook/Meta Ads',
    '- 30% LinkedIn Ads',
    '- 20% Content Creation',
    '- 10% Tools and Analytics',
  ];

  return lines.join('\n');
}
