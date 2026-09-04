import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { existsSync, rmSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { createNewProject, saveProject, loadProject } from '../src/core/state.js';
import { Orchestrator } from '../src/core/orchestrator.js';
import { createBusinessProfile } from '../src/modules/business/analyzer.js';
import { createMarketingStrategy } from '../src/modules/marketing/strategy.js';
import { createFacebookCampaign } from '../src/modules/meta/agent.js';
import { runQAAudit, generateQAReport } from '../src/modules/qa/validator.js';
import { generateFinalReport, exportReportToMarkdown } from '../src/modules/reports/generator.js';
import { createEvidence, getEvidenceSummary } from '../src/core/evidence-manager.js';
import { registerWebResearchTools, executeTool } from '../src/tools/index.js';
import type { Project } from '../src/types/index.js';

const TEST_DATA_DIR = join(process.cwd(), 'data');

function safeRmSync(path: string): void {
  try {
    if (existsSync(path)) {
      rmSync(path, { recursive: true, force: true });
    }
  } catch {}
}

describe('E2E: Full Project Workflow', () => {
  let project: Project;

  beforeEach(() => {
    if (!existsSync(TEST_DATA_DIR)) mkdirSync(TEST_DATA_DIR, { recursive: true });
    project = createNewProject('Hunarmand Punjab Batch-3', 'Digital Marketing & AI Final Project');
  });

  afterEach(() => {
    safeRmSync(join(TEST_DATA_DIR, 'project.json'));
    safeRmSync(join(TEST_DATA_DIR, 'project.json.tmp'));
  });

  it('should complete full project lifecycle', async () => {
    const orchestrator = new Orchestrator();

    await orchestrator.executeStep('Initialize Project', async () => {
      project.status = 'IN_PROGRESS';
      saveProject(project, 'init');
      return { initialized: true };
    });

    await orchestrator.executeStep('Create Business Profile', async () => {
      const profile = createBusinessProfile(
        project,
        'Hunarmand Punjab',
        'Education',
        'Punjab, Pakistan',
        'Youth seeking digital skills'
      );
      return { profile };
    });

    await orchestrator.executeStep('Create Marketing Strategy', async () => {
      const strategy = createMarketingStrategy(project, {
        name: 'Digital Marketing Strategy',
        targetAudience: 'Young professionals',
        channels: ['Facebook', 'LinkedIn'],
        budget: 50000,
        goals: ['Increase enrollment', 'Brand awareness'],
      });
      return { strategy };
    });

    await orchestrator.executeStep('Create Facebook Campaign', async () => {
      const campaign = createFacebookCampaign(project, {
        name: 'Enrollment Campaign',
        objective: 'AWARENESS',
        budget: 25000,
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        status: 'DRAFT',
      });
      return { campaign };
    });

    await orchestrator.executeStep('Collect Evidence', async () => {
      const evidence = createEvidence(project, {
        requirementId: 'REQ-001',
        title: 'Business Profile Evidence',
        description: 'Business profile created successfully',
        type: 'SCREENSHOT',
        status: 'CAPTURED',
      });
      const summary = getEvidenceSummary(project);
      return { evidence, summary };
    });

    await orchestrator.executeStep('Run QA Audit', async () => {
      const qaReport = runQAAudit(project);
      const markdown = generateQAReport(qaReport);
      return { qaReport, markdownGenerated: markdown.length > 0 };
    });

    await orchestrator.executeStep('Generate Final Report', async () => {
      const report = generateFinalReport(project);
      const markdown = exportReportToMarkdown(report);
      return { report, markdownGenerated: markdown.length > 0 };
    });

    project.status = 'COMPLETED';
    saveProject(project, 'complete');

    const loaded = loadProject();
    expect(loaded).not.toBeNull();
    expect(loaded!.status).toBe('COMPLETED');
  });

  it('should handle tool system integration', async () => {
    registerWebResearchTools();

    const result = await executeTool('web_search', { query: 'test' });
    expect(result.success).toBe(true);
  });

  it('should maintain state across operations', () => {
    project.business = createBusinessProfile(
      project,
      'Test Business',
      'Tech',
      'Lahore',
      'Students'
    );
    saveProject(project, 'add_business');

    const loaded = loadProject();
    expect(loaded).not.toBeNull();
    expect(loaded!.business).not.toBeNull();
    expect(loaded!.business!.name).toBe('Test Business');
  });
});
