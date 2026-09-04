import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { existsSync, rmSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { createNewProject } from '../src/core/state.js';
import {
  createBusinessProfile,
  updateBusinessProfile,
  addCustomerPersona,
  updateFourPs,
  updateFourAs,
  generateBusinessAnalysisReport,
} from '../src/modules/business/analyzer.js';
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

describe('Business Analyzer', () => {
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

  it('should create business profile', () => {
    const profile = createBusinessProfile(
      project,
      'Test Business',
      'Technology',
      'Lahore, Pakistan',
      'A tech company'
    );
    expect(profile).toBeDefined();
    expect(profile.name).toBe('Test Business');
    expect(profile.industry).toBe('Technology');
    expect(project.business).toBeDefined();
  });

  it('should update business profile', () => {
    createBusinessProfile(project, 'Test', 'Tech', 'Lahore', 'Desc');
    const updated = updateBusinessProfile(project, { website: 'https://test.com' });
    expect(updated).toBeDefined();
    expect(updated!.website).toBe('https://test.com');
  });

  it('should add customer persona', () => {
    createBusinessProfile(project, 'Test', 'Tech', 'Lahore', 'Desc');
    const persona = addCustomerPersona(project, {
      name: 'Tech Entrepreneur',
      age: '25-35',
      gender: 'Male',
      location: 'Lahore',
      interests: ['Technology', 'Business'],
      painPoints: ['Finding clients'],
      goals: ['Grow business'],
    });
    expect(persona).toBeDefined();
    expect(persona!.name).toBe('Tech Entrepreneur');
    expect(project.business!.customerPersonas).toHaveLength(1);
  });

  it('should update 4Ps', () => {
    createBusinessProfile(project, 'Test', 'Tech', 'Lahore', 'Desc');
    const fourPs = updateFourPs(project, {
      product: 'Digital Marketing Services',
      price: 'PKR 50,000/month',
    });
    expect(fourPs).toBeDefined();
    expect(fourPs!.product).toBe('Digital Marketing Services');
  });

  it('should update 4As', () => {
    createBusinessProfile(project, 'Test', 'Tech', 'Lahore', 'Desc');
    const fourAs = updateFourAs(project, {
      acceptability: 'High quality services',
      affordability: 'Competitive pricing',
    });
    expect(fourAs).toBeDefined();
    expect(fourAs!.acceptability).toBe('High quality services');
  });

  it('should generate report', () => {
    createBusinessProfile(project, 'Test Business', 'Technology', 'Lahore', 'A test business');
    const report = generateBusinessAnalysisReport(project);
    expect(report).toContain('Test Business');
    expect(report).toContain('Technology');
  });
});
