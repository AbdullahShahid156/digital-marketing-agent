import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { existsSync, rmSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { createNewProject } from '../src/core/state.js';
import {
  optimizeLinkedInProfile,
  createLinkedInCompanyPage,
  generateLinkedInContentPlan,
  generateLinkedInChecklist,
} from '../src/modules/linkedin/agent.js';
import {
  generateContentCalendar,
  generateContentPillars,
  generateHashtags,
} from '../src/modules/content/planner.js';
import {
  addProspect,
  qualifyProspect,
} from '../src/modules/prospects/research.js';
import {
  createOutreachMessage,
  generateOutreachTemplates,
} from '../src/modules/outreach/engine.js';
import type { Project } from '../src/types/index.js';

const TEST_DATA_DIR = join(process.cwd(), 'data');

function safeRmSync(path: string): void {
  try {
    if (existsSync(path)) {
      rmSync(path, { recursive: true, force: true });
    }
  } catch {}
}

describe('LinkedIn Agent', () => {
  let project: Project;

  beforeEach(() => {
    if (!existsSync(TEST_DATA_DIR)) mkdirSync(TEST_DATA_DIR, { recursive: true });
    project = createNewProject('Test', 'Desc');
  });

  afterEach(() => {
    safeRmSync(join(TEST_DATA_DIR, 'project.json'));
    safeRmSync(join(TEST_DATA_DIR, 'project.json.tmp'));
  });

  it('should optimize LinkedIn profile', () => {
    const profile = optimizeLinkedInProfile(project, {
      headline: 'Digital Marketing Expert',
      summary: 'Experienced marketer',
      experience: ['5 years in marketing'],
      skills: ['SEO', 'PPC'],
      recommendations: [],
    });
    expect(profile.headline).toBe('Digital Marketing Expert');
  });

  it('should create LinkedIn company page', () => {
    const page = createLinkedInCompanyPage(project, {
      name: 'Test Company',
      description: 'A test company',
      industry: 'Technology',
      location: 'Lahore',
      website: 'https://test.com',
      logo: '',
    });
    expect(page.name).toBe('Test Company');
  });

  it('should generate LinkedIn content plan', () => {
    const plan = generateLinkedInContentPlan(project);
    expect(plan.length).toBeGreaterThan(0);
  });

  it('should generate LinkedIn checklist', () => {
    const checklist = generateLinkedInChecklist();
    expect(checklist.length).toBeGreaterThan(0);
  });
});

describe('Content Planner', () => {
  let project: Project;

  beforeEach(() => {
    if (!existsSync(TEST_DATA_DIR)) mkdirSync(TEST_DATA_DIR, { recursive: true });
    project = createNewProject('Test', 'Desc');
  });

  afterEach(() => {
    safeRmSync(join(TEST_DATA_DIR, 'project.json'));
    safeRmSync(join(TEST_DATA_DIR, 'project.json.tmp'));
  });

  it('should generate content calendar', () => {
    const calendar = generateContentCalendar(project, 'Facebook', 7);
    expect(calendar).toHaveLength(7);
  });

  it('should generate content pillars', () => {
    const pillars = generateContentPillars('Technology');
    expect(pillars.length).toBeGreaterThan(0);
  });

  it('should generate hashtags', () => {
    const hashtags = generateHashtags('Technology', 'Lahore');
    expect(hashtags.length).toBeGreaterThan(0);
    expect(hashtags).toContain('#Lahore');
  });
});

describe('Prospect Research', () => {
  let project: Project;

  beforeEach(() => {
    if (!existsSync(TEST_DATA_DIR)) mkdirSync(TEST_DATA_DIR, { recursive: true });
    project = createNewProject('Test', 'Desc');
  });

  afterEach(() => {
    safeRmSync(join(TEST_DATA_DIR, 'project.json'));
    safeRmSync(join(TEST_DATA_DIR, 'project.json.tmp'));
  });

  it('should add prospect', () => {
    const prospect = addProspect(project, {
      businessName: 'Test Business',
      industry: 'Tech',
      location: 'Lahore',
      potentialProblems: ['No online presence'],
      recommendedServices: ['Social Media'],
      qualificationReason: 'Growing business',
      source: 'LinkedIn',
      verificationStatus: 'UNVERIFIED',
      outreachStatus: 'NOT_CONTACTED',
    });
    expect(prospect.businessName).toBe('Test Business');
    expect(project.prospects).toHaveLength(1);
  });

  it('should qualify prospect', () => {
    const prospect = addProspect(project, {
      businessName: 'Test',
      industry: 'Tech',
      location: 'Lahore',
      potentialProblems: [],
      recommendedServices: [],
      qualificationReason: '',
      source: '',
      verificationStatus: 'UNVERIFIED',
      outreachStatus: 'NOT_CONTACTED',
    });
    const qualified = qualifyProspect(project, prospect.id, true);
    expect(qualified!.verificationStatus).toBe('VERIFIED');
  });
});

describe('Outreach Engine', () => {
  let project: Project;

  beforeEach(() => {
    if (!existsSync(TEST_DATA_DIR)) mkdirSync(TEST_DATA_DIR, { recursive: true });
    project = createNewProject('Test', 'Desc');
  });

  afterEach(() => {
    safeRmSync(join(TEST_DATA_DIR, 'project.json'));
    safeRmSync(join(TEST_DATA_DIR, 'project.json.tmp'));
  });

  it('should create outreach message', () => {
    const message = createOutreachMessage(project, 'PROSPECT-1', 'initial', 'linkedin', undefined, 'Hello!');
    expect(message.content).toBe('Hello!');
    expect(message.status).toBe('DRAFT');
  });

  it('should generate outreach templates', () => {
    const templates = generateOutreachTemplates();
    expect(Object.keys(templates).length).toBeGreaterThan(0);
  });
});
