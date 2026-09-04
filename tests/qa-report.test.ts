import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { existsSync, rmSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { createNewProject } from '../src/core/state.js';
import {
  runQAAudit,
  generateQAReport,
  isProjectVerified,
} from '../src/modules/qa/validator.js';
import {
  generateFinalReport,
  exportReportToMarkdown,
} from '../src/modules/reports/generator.js';
import type { Project } from '../src/types/index.js';

const TEST_DATA_DIR = join(process.cwd(), 'data');

function safeRmSync(path: string): void {
  try {
    if (existsSync(path)) {
      rmSync(path, { recursive: true, force: true });
    }
  } catch {}
}

describe('QA Validator', () => {
  let project: Project;

  beforeEach(() => {
    if (!existsSync(TEST_DATA_DIR)) mkdirSync(TEST_DATA_DIR, { recursive: true });
    project = createNewProject('Test', 'Desc');
  });

  afterEach(() => {
    safeRmSync(join(TEST_DATA_DIR, 'project.json'));
    safeRmSync(join(TEST_DATA_DIR, 'project.json.tmp'));
  });

  it('should run QA audit and return report', () => {
    const report = runQAAudit(project);
    expect(report.checks).toBeDefined();
    expect(report.checks.length).toBeGreaterThan(0);
    expect(report.projectName).toBe('Test');
  });

  it('should generate QA report as markdown', () => {
    const report = runQAAudit(project);
    const markdown = generateQAReport(report);
    expect(markdown).toContain('# Quality Assurance Report');
    expect(markdown).toContain('Test');
  });

  it('should determine if project is verified', () => {
    const report = runQAAudit(project);
    const verified = isProjectVerified(report);
    expect(typeof verified).toBe('boolean');
  });
});

describe('Report Generator', () => {
  let project: Project;

  beforeEach(() => {
    if (!existsSync(TEST_DATA_DIR)) mkdirSync(TEST_DATA_DIR, { recursive: true });
    project = createNewProject('Test', 'Desc');
  });

  afterEach(() => {
    safeRmSync(join(TEST_DATA_DIR, 'project.json'));
    safeRmSync(join(TEST_DATA_DIR, 'project.json.tmp'));
  });

  it('should generate final report', () => {
    const report = generateFinalReport(project);
    expect(report.projectName).toBe('Test');
    expect(report.sections).toBeDefined();
    expect(report.sections.length).toBeGreaterThan(0);
    expect(report.completionPercentage).toBe(0);
  });

  it('should export report to markdown', () => {
    const report = generateFinalReport(project);
    const markdown = exportReportToMarkdown(report);
    expect(markdown).toContain('# Test');
    expect(markdown).toContain('Completion');
  });
});
