import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { existsSync, rmSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { createNewProject } from '../src/core/state.js';
import { createBusinessProfile } from '../src/modules/business/analyzer.js';
import {
  createMarketingStrategy,
  generateSWOTAnalysis,
  generateMarketingPlan,
} from '../src/modules/marketing/strategy.js';
import type { Project } from '../src/types/index.js';

const TEST_DATA_DIR = join(process.cwd(), 'data');

function safeRmSync(path: string): void {
  try {
    if (existsSync(path)) {
      rmSync(path, { recursive: true, force: true });
    }
  } catch {
    // Ignore cleanup errors
  }
}

describe('Marketing Strategy', () => {
  let project: Project;

  beforeEach(() => {
    if (!existsSync(TEST_DATA_DIR)) {
      mkdirSync(TEST_DATA_DIR, { recursive: true });
    }
    project = createNewProject('Test Project', 'Description');
  });

  afterEach(() => {
    safeRmSync(join(TEST_DATA_DIR, 'project.json'));
    safeRmSync(join(TEST_DATA_DIR, 'project.json.tmp'));
  });

  it('should create marketing strategy', () => {
    createBusinessProfile(project, 'Test', 'Tech', 'Lahore', 'Desc');
    const strategy = createMarketingStrategy(project, {
      targetAudience: 'Small businesses',
      valueProposition: 'Best digital marketing',
      channels: ['Facebook', 'LinkedIn'],
      budget: 'PKR 100,000',
      timeline: '3 months',
      objectives: ['Increase brand awareness'],
      kpis: ['Engagement rate'],
      contentPillars: ['Education', 'Tips'],
      competitiveAdvantage: 'Local expertise',
    });
    expect(strategy).toBeDefined();
    expect(strategy!.targetAudience).toBe('Small businesses');
  });

  it('should return null if no business profile', () => {
    const strategy = createMarketingStrategy(project, {
      targetAudience: 'Test',
      valueProposition: 'Test',
      channels: [],
      budget: 'PKR 0',
      timeline: '1 month',
      objectives: [],
      kpis: [],
      contentPillars: [],
      competitiveAdvantage: '',
    });
    expect(strategy).toBeNull();
  });

  it('should generate SWOT analysis', () => {
    createBusinessProfile(project, 'Test', 'Technology', 'Lahore', 'Desc');
    const swot = generateSWOTAnalysis(project);
    expect(swot).toBeDefined();
    expect(swot!.strengths).toHaveLength(3);
    expect(swot!.opportunities).toHaveLength(3);
  });

  it('should generate marketing plan', () => {
    createBusinessProfile(project, 'Test', 'Tech', 'Lahore', 'Desc');
    const plan = generateMarketingPlan(project);
    expect(plan).toContain('Marketing Strategy Plan');
    expect(plan).toContain('Test');
  });
});
