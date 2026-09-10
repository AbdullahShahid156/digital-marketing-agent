import { describe, it, expect } from 'vitest';
import { parseNaturalLanguage, formatDetectedPlan } from '../src/core/nlp.js';

describe('Natural Language Parser', () => {
  it('should detect Q1 from Facebook keywords', () => {
    const result = parseNaturalLanguage('Complete my Facebook marketing assignment');
    expect(result.section).toBe('Q1');
    expect(result.confidence).toBeGreaterThan(0);
  });

  it('should detect Q2 from LinkedIn keywords', () => {
    const result = parseNaturalLanguage('Complete Q2 LinkedIn assignment');
    expect(result.section).toBe('Q2');
    expect(result.confidence).toBeGreaterThan(0);
  });

  it('should detect ALL from full assignment keywords', () => {
    const result = parseNaturalLanguage('Complete the whole digital marketing assignment');
    expect(result.section).toBe('ALL');
  });

  it('should detect ALL when both Q1 and Q2 mentioned', () => {
    const result = parseNaturalLanguage('Do Facebook and LinkedIn tasks');
    expect(result.section).toBe('ALL');
  });

  it('should detect LIVE_MODE from live keywords', () => {
    const result = parseNaturalLanguage('Run LinkedIn tasks in live mode');
    expect(result.mode).toBe('LIVE_MODE');
  });

  it('should default to DEMO_MODE', () => {
    const result = parseNaturalLanguage('Complete LinkedIn assignment');
    expect(result.mode).toBe('DEMO_MODE');
  });

  it('should detect resume intent', () => {
    const result = parseNaturalLanguage('Resume where I left off');
    expect(result.resume).toBe(true);
  });

  it('should detect help intent', () => {
    const result = parseNaturalLanguage('What can you do?');
    expect(result.intent).toBe('help');
  });

  it('should detect status intent', () => {
    const result = parseNaturalLanguage('Show progress');
    expect(result.intent).toBe('status');
  });

  it('should handle empty input', () => {
    const result = parseNaturalLanguage('');
    expect(result.section).toBe('ALL');
    expect(result.mode).toBe('DEMO_MODE');
    expect(result.resume).toBe(false);
  });

  it('should handle Meta/Facebook keywords for Q1', () => {
    const result = parseNaturalLanguage('Do Meta Business Suite setup');
    expect(result.section).toBe('Q1');
  });

  it('should handle LinkedIn company page for Q2', () => {
    const result = parseNaturalLanguage('Create LinkedIn company page');
    expect(result.section).toBe('Q2');
  });

  it('should handle ambiguous input as ALL', () => {
    const result = parseNaturalLanguage('Do the assignment');
    expect(result.section).toBe('ALL');
  });
});

describe('Display Format', () => {
  it('should format detected plan correctly', () => {
    const parsed = parseNaturalLanguage('Complete Q2 LinkedIn');
    const output = formatDetectedPlan(parsed);
    expect(output).toContain('Q2 LinkedIn');
    expect(output).toContain('Mode:');
  });

  it('should format ALL section correctly', () => {
    const parsed = parseNaturalLanguage('Complete everything');
    const output = formatDetectedPlan(parsed);
    expect(output).toContain('Q1 + Q2');
  });
});
