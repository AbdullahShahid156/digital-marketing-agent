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
  generateAssignmentReport,
  exportAssignmentToMarkdown,
} from '../src/modules/reports/generator.js';
import { createEvidence, updateEvidenceStatus } from '../src/core/evidence-manager.js';
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

describe('Assignment Report Generator', () => {
  let project: Project;

  beforeEach(() => {
    if (!existsSync(TEST_DATA_DIR)) mkdirSync(TEST_DATA_DIR, { recursive: true });
    project = createNewProject('Test Assignment', 'Digital Marketing Project');
  });

  afterEach(() => {
    safeRmSync(join(TEST_DATA_DIR, 'project.json'));
    safeRmSync(join(TEST_DATA_DIR, 'project.json.tmp'));
  });

  it('should generate assignment report', () => {
    const report = generateAssignmentReport(project);
    expect(report.projectName).toBe('Test Assignment');
    expect(report.qaVerified).toBeDefined();
    expect(report.completionPercentage).toBe(0);
    expect(report.totalTasks).toBe(0);
    expect(report.completedTasks).toBe(0);
    expect(report.sections).toBeDefined();
    expect(report.sections.length).toBeGreaterThan(0);
    expect(report.evidenceSummary).toBeDefined();
    expect(report.q1Summary).toBeDefined();
    expect(report.q2Summary).toBeDefined();
  });

  it('should include executive summary section', () => {
    const report = generateAssignmentReport(project);
    const execSummary = report.sections.find(s => s.title === 'Executive Summary');
    expect(execSummary).toBeDefined();
    expect(execSummary!.content).toContain('Hunarmand Punjab Batch-3');
    expect(execSummary!.content).toContain('Q1');
    expect(execSummary!.content).toContain('Q2');
  });

  it('should include evidence collection section', () => {
    const report = generateAssignmentReport(project);
    const evidenceSection = report.sections.find(s => s.title === 'Evidence Collection');
    expect(evidenceSection).toBeDefined();
    expect(evidenceSection!.content).toContain('Evidence Collection Summary');
  });

  it('should export assignment report to markdown', () => {
    const report = generateAssignmentReport(project);
    const markdown = exportAssignmentToMarkdown(report);
    expect(markdown).toContain('# Test Assignment');
    expect(markdown).toContain('QA Verified');
    expect(markdown).toContain('Completion');
    expect(markdown).toContain('Executive Summary');
    expect(markdown).toContain('Evidence Collection');
  });

  it('should track evidence summary correctly', () => {
    const evidence = createEvidence(
      project,
      'Q1-R1',
      'TASK-1',
      'Test Evidence',
      'Description',
      'Login Page'
    );
    updateEvidenceStatus(project, evidence.id, 'CAPTURED');

    const report = generateAssignmentReport(project);
    expect(report.evidenceSummary.total).toBe(1);
    expect(report.evidenceSummary.captured).toBe(1);
  });

  it('should track Q1 and Q2 summaries', () => {
    const report = generateAssignmentReport(project);
    expect(report.q1Summary.totalTasks).toBe(0);
    expect(report.q1Summary.completedTasks).toBe(0);
    expect(report.q1Summary.blockedTasks).toBe(0);
    expect(report.q2Summary.totalTasks).toBe(0);
    expect(report.q2Summary.completedTasks).toBe(0);
    expect(report.q2Summary.blockedTasks).toBe(0);
  });
});
