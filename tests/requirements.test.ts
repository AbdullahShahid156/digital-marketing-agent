import { describe, it, expect } from 'vitest';
import {
  parseRawRequirements,
  extractRequirementsFromText,
  generateRequirementChecklist,
} from '../src/modules/requirements/parser.js';
import type { RawRequirement } from '../src/modules/requirements/parser.js';

describe('Requirement Parser', () => {
  const sampleRawRequirements: RawRequirement[] = [
    {
      id: 'R1',
      section: 'Facebook Page Optimization',
      title: 'Create and optimize Facebook business page',
      description: 'Set up a professional Facebook page with all required sections',
      priority: 'high',
    },
    {
      id: 'R2',
      section: 'Facebook Page Optimization',
      title: 'Take screenshot of optimized page',
      description: 'Capture evidence of the completed page setup',
      priority: 'high',
    },
    {
      id: 'R3',
      section: 'Content Strategy',
      title: 'Create content calendar',
      description: 'Plan 30 days of content',
      priority: 'medium',
    },
  ];

  it('should parse raw requirements', () => {
    const requirements = parseRawRequirements(sampleRawRequirements);
    expect(requirements).toHaveLength(3);
    expect(requirements[0].title).toBe('Create and optimize Facebook business page');
    expect(requirements[0].priority).toBe('high');
  });

  it('should detect automatable requirements', () => {
    const requirements = parseRawRequirements(sampleRawRequirements);
    expect(requirements[0].automatable).toBe(true);
    expect(requirements[1].automatable).toBe(false);
  });

  it('should extract requirements from text', () => {
    const text = `Q1: Facebook Page Setup
1. Create Facebook business page
2. Optimize page with profile/cover photos
3. Take screenshot of completed setup

Q2: Content Strategy
1. Create content calendar
2. Plan daily posts`;
    const requirements = extractRequirementsFromText(text);
    expect(requirements.length).toBeGreaterThan(0);
  });

  it('should generate checklist', () => {
    const requirements = parseRawRequirements(sampleRawRequirements);
    const checklist = generateRequirementChecklist(requirements);
    expect(checklist).toContain('Requirement Checklist');
    expect(checklist).toContain('R1');
    expect(checklist).toContain('R2');
  });

  it('should default priority to medium', () => {
    const raw: RawRequirement[] = [
      {
        id: 'R1',
        section: 'Test',
        title: 'Test Item',
        description: 'Test description',
      },
    ];
    const requirements = parseRawRequirements(raw);
    expect(requirements[0].priority).toBe('medium');
  });
});
