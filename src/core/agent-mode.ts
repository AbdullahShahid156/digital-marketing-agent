import type { AgentMode } from '../types/index.js';
import { logger } from './logger.js';

const DEMO_PAGE = 'https://example.com';

export interface DemoScenario {
  name: string;
  steps: DemoStep[];
}

export interface DemoStep {
  action: string;
  url?: string;
  selector?: string;
  value?: string;
  expectedText?: string;
}

const DEMO_SCENARIOS: Record<string, DemoScenario> = {
  facebook_page_create: {
    name: 'Create Facebook Page (Demo)',
    steps: [
      { action: 'navigate', url: DEMO_PAGE },
      { action: 'observe', expectedText: 'Example Domain' },
      { action: 'click', selector: 'body' },
      { action: 'screenshot', value: 'demo-facebook-page-created.png' },
    ],
  },
  facebook_campaign: {
    name: 'Create Facebook Campaign (Demo)',
    steps: [
      { action: 'navigate', url: DEMO_PAGE },
      { action: 'observe', expectedText: 'Example Domain' },
      { action: 'fill', selector: 'body', value: 'Demo Campaign Name' },
      { action: 'screenshot', value: 'demo-facebook-campaign.png' },
    ],
  },
  linkedin_profile: {
    name: 'Optimize LinkedIn Profile (Demo)',
    steps: [
      { action: 'navigate', url: DEMO_PAGE },
      { action: 'observe', expectedText: 'Example Domain' },
      { action: 'screenshot', value: 'demo-linkedin-profile.png' },
    ],
  },
  linkedin_company: {
    name: 'Create LinkedIn Company Page (Demo)',
    steps: [
      { action: 'navigate', url: DEMO_PAGE },
      { action: 'observe', expectedText: 'Example Domain' },
      { action: 'screenshot', value: 'demo-linkedin-company.png' },
    ],
  },
};

export function getDemoScenario(action: string): DemoScenario | undefined {
  return DEMO_SCENARIOS[action];
}

export function getAllDemoScenarios(): DemoScenario[] {
  return Object.values(DEMO_SCENARIOS);
}

export function isDemoMode(mode: AgentMode): boolean {
  return mode === 'DEMO_MODE';
}

export function getDemoPageUrl(): string {
  return DEMO_PAGE;
}

export function logDemoAction(action: string, details: string): void {
  logger.info('DemoMode', `[DEMO] ${action}: ${details}`);
}
