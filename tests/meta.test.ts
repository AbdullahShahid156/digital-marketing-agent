import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { existsSync, rmSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { createNewProject } from '../src/core/state.js';
import { createBusinessProfile } from '../src/modules/business/analyzer.js';
import {
  createFacebookCampaign,
  createAdSet,
  createAd,
  generateContentCalendar,
  generateFacebookPageChecklist,
  generateAdCopyVariations,
} from '../src/modules/meta/agent.js';
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

describe('Facebook/Meta Agent', () => {
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

  it('should create Facebook campaign', () => {
    const campaign = createFacebookCampaign(project, 'Test Campaign', 'Lead Generation', 'PKR 50,000');
    expect(campaign).toBeDefined();
    expect(campaign.name).toBe('Test Campaign');
    expect(campaign.platform).toBe('meta');
  });

  it('should create ad set', () => {
    const campaign = createFacebookCampaign(project, 'Test', 'Leads', 'PKR 10,000');
    const adSet = createAdSet(project, campaign.id, 'Test AdSet', 'PKR 5,000');
    expect(adSet).toBeDefined();
    expect(adSet!.name).toBe('Test AdSet');
    expect(campaign.adSets).toHaveLength(1);
  });

  it('should create ad', () => {
    const campaign = createFacebookCampaign(project, 'Test', 'Leads', 'PKR 10,000');
    const adSet = createAdSet(project, campaign.id, 'AdSet', 'PKR 5,000');
    const ad = createAd(project, campaign.id, adSet!.id, {
      name: 'Test Ad',
      headline: 'Test Headline',
      primaryText: 'Test text',
      callToAction: 'Learn More',
      creativeType: 'Image',
    });
    expect(ad).toBeDefined();
    expect(ad!.headline).toBe('Test Headline');
  });

  it('should generate content calendar', () => {
    createBusinessProfile(project, 'Test', 'Tech', 'Lahore', 'Desc');
    const calendar = generateContentCalendar(project, 7);
    expect(calendar).toHaveLength(7);
    expect(calendar[0].platform).toBe('Facebook');
  });

  it('should return empty calendar if no business', () => {
    const calendar = generateContentCalendar(project, 7);
    expect(calendar).toHaveLength(0);
  });

  it('should generate page checklist', () => {
    const checklist = generateFacebookPageChecklist();
    expect(checklist.length).toBeGreaterThan(0);
    expect(checklist).toContain('Profile photo uploaded (professional, clear)');
  });

  it('should generate ad copy variations', () => {
    const variations = generateAdCopyVariations('Test Headline', 'Test primary text');
    expect(variations).toHaveLength(3);
    expect(variations[0].headline).toBe('Test Headline');
  });
});
