import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { existsSync, rmSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { createNewProject } from '../src/core/state.js';
import {
  createFacebookCampaign,
  createAdSet,
  createAd,
  createLeadGenForm,
  createABTest,
  generateMetaBusinessSuite,
  generateContentCalendar,
  generateFacebookPageChecklist,
  generateAdvancedPageSetup,
  generateAdCopyVariations,
  generateCampaignStructure,
} from '../src/modules/meta/agent.js';
import {
  optimizeLinkedInProfile,
  createLinkedInCompanyPage,
  createLinkedInLeadGenCampaign,
  generateAudienceSegments,
  generateLinkedInContentPlan,
  generateClientHuntingMethod,
  generateOutreachMessages,
  generatePerformanceMetrics,
  generateLinkedInChecklist,
  findClientProspects,
} from '../src/modules/linkedin/agent.js';
import {
  generateContentCalendar as genContentCalendar,
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

describe('Facebook/Meta Agent - Enhanced', () => {
  let project: Project;

  beforeEach(() => {
    if (!existsSync(TEST_DATA_DIR)) mkdirSync(TEST_DATA_DIR, { recursive: true });
    project = createNewProject('Test', 'Desc');
  });

  afterEach(() => {
    safeRmSync(join(TEST_DATA_DIR, 'project.json'));
    safeRmSync(join(TEST_DATA_DIR, 'project.json.tmp'));
  });

  it('should create Facebook campaign', () => {
    const campaign = createFacebookCampaign(project, 'Test Campaign', 'LEAD_GENERATION', '500/day');
    expect(campaign.name).toBe('Test Campaign');
    expect(campaign.platform).toBe('meta');
    expect(project.campaigns).toHaveLength(1);
  });

  it('should create ad set', () => {
    const campaign = createFacebookCampaign(project, 'Test', 'TRAFFIC', '100/day');
    const adSet = createAdSet(project, campaign.id, 'Test AdSet', '50/day');
    expect(adSet).not.toBeNull();
    expect(adSet!.name).toBe('Test AdSet');
    expect(campaign.adSets).toHaveLength(1);
  });

  it('should create ad', () => {
    const campaign = createFacebookCampaign(project, 'Test', 'TRAFFIC', '100/day');
    const adSet = createAdSet(project, campaign.id, 'AdSet', '50/day');
    const ad = createAd(project, campaign.id, adSet!.id, {
      name: 'Test Ad',
      headline: 'Test Headline',
      primaryText: 'Test text',
      callToAction: 'Learn More',
      creativeType: 'Image',
    });
    expect(ad).not.toBeNull();
    expect(ad!.headline).toBe('Test Headline');
  });

  it('should create lead gen form', () => {
    const form = createLeadGenForm(
      'Test Form',
      'Sign Up Now',
      'Free Consultation',
      ['Name', 'Email', 'Phone'],
      'Get Started'
    );
    expect(form.name).toBe('Test Form');
    expect(form.fields).toHaveLength(3);
    expect(form.thankYouMessage).toContain('Thank you');
  });

  it('should create A/B test', () => {
    const test = createABTest(
      'Headline Test',
      'headline',
      'Version A - Learn More',
      'Version B - Sign Up Now'
    );
    expect(test.name).toBe('Headline Test');
    expect(test.type).toBe('headline');
    expect(test.status).toBe('PLANNING');
  });

  it('should generate Meta Business Suite config', () => {
    const suite = generateMetaBusinessSuite();
    expect(suite.inboxAutoReplies).toBe(true);
    expect(suite.weeklyContentPlan).toHaveLength(7);
  });

  it('should generate content calendar', () => {
    project.business = { name: 'Test' } as any;
    const calendar = generateContentCalendar(project, 7);
    expect(calendar).toHaveLength(7);
  });

  it('should return empty calendar if no business', () => {
    const calendar = generateContentCalendar(project);
    expect(calendar).toHaveLength(0);
  });

  it('should generate page checklist', () => {
    const checklist = generateFacebookPageChecklist();
    expect(checklist.length).toBeGreaterThan(0);
  });

  it('should generate advanced page setup', () => {
    const setup = generateAdvancedPageSetup();
    expect(setup.length).toBeGreaterThan(0);
    expect(setup).toContain('Professional Dashboard accessed');
  });

  it('should generate ad copy variations', () => {
    const variations = generateAdCopyVariations('Test Headline', 'Test text');
    expect(variations).toHaveLength(3);
  });

  it('should generate campaign structure', () => {
    const structure = generateCampaignStructure('Test Campaign', 'LEAD_GENERATION');
    expect(structure.length).toBeGreaterThan(0);
    expect(structure[0]).toContain('Campaign: Test Campaign');
  });
});

describe('LinkedIn Agent - Enhanced', () => {
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
      services: ['Marketing'],
      cta: 'Contact Us',
    });
    expect(page.name).toBe('Test Company');
  });

  it('should create LinkedIn Lead Gen campaign', () => {
    const campaign = createLinkedInLeadGenCampaign(
      'Test Campaign',
      'LEAD_GENERATION',
      [{ name: 'Segment 1', location: 'Lahore', industry: 'Tech', jobTitles: ['Manager'], companySize: '10-50', seniority: 'Senior', interests: ['Marketing'] }],
      '500/day',
      'Image Ad',
      'Sign up for free consultation'
    );
    expect(campaign.name).toBe('Test Campaign');
    expect(campaign.leadGenForm.fields).toHaveLength(5);
  });

  it('should generate audience segments', () => {
    const segments = generateAudienceSegments();
    expect(segments).toHaveLength(3);
    expect(segments[0].jobTitles.length).toBeGreaterThan(0);
  });

  it('should generate LinkedIn content plan', () => {
    const plan = generateLinkedInContentPlan(project);
    expect(plan).toHaveLength(7);
  });

  it('should generate client hunting method', () => {
    const methods = generateClientHuntingMethod();
    expect(methods.length).toBeGreaterThan(0);
  });

  it('should generate outreach messages', () => {
    const messages = generateOutreachMessages('Facebook Marketing');
    expect(messages.connectionRequest).toContain('connect');
    expect(messages.firstOutreach).toContain('Facebook Marketing');
    expect(messages.followUp).toContain('follow up');
  });

  it('should generate performance metrics', () => {
    const metrics = generatePerformanceMetrics();
    expect(metrics.length).toBeGreaterThan(0);
  });

  it('should generate LinkedIn checklist', () => {
    const checklist = generateLinkedInChecklist();
    expect(checklist.length).toBeGreaterThan(0);
  });

  it('should find client prospects', () => {
    const prospects = findClientProspects();
    expect(prospects).toHaveLength(10);
    expect(prospects[0].businessName).toBeDefined();
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
    const calendar = genContentCalendar(project, 'Facebook', 7);
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
