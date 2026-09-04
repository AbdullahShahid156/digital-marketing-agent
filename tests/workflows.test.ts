import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { existsSync, rmSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { Orchestrator } from '../src/core/orchestrator.js';
import { executeFacebookQ1Workflow } from '../src/modules/meta/workflows.js';
import { loadProject, createNewProject, saveProject } from '../src/core/state.js';
import { createTask, updateTaskState } from '../src/core/task-manager.js';
import type { Project, Task } from '../src/types/index.js';

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

function createTestProject(): Project {
  const project = createNewProject('Test Project', 'Test Description');
  saveProject(project, 'create');
  return project;
}

describe('Step 3 - Q1 Meta Workflows', () => {
  let project: Project;

  beforeEach(() => {
    if (!existsSync(TEST_DATA_DIR)) {
      mkdirSync(TEST_DATA_DIR, { recursive: true });
    }
    project = createTestProject();
  });

  afterEach(() => {
    safeRmSync(join(TEST_DATA_DIR, 'project.json'));
    safeRmSync(join(TEST_DATA_DIR, 'project.json.tmp'));
  });

  it('should load Q1 requirements and build task graph', async () => {
    const orchestrator = new Orchestrator();
    await orchestrator.initialize();
    const reqs = orchestrator.loadRequirements('Q1');
    expect(reqs.length).toBe(8);
    expect(reqs.every(r => r.id.startsWith('Q1'))).toBe(true);

    const tasks = orchestrator.buildTaskGraph(reqs);
    expect(tasks.length).toBe(24);
  });

  it('should route Q1-R1 business tasks through automated workflow', async () => {
    const task = createTask(project, 'Q1-R1', 'Create Business Profile', 'Define business name', []);
    const result = await executeFacebookQ1Workflow(project, 'Q1-R1', task, 'DEMO_MODE');

    expect(result.success).toBe(true);
    expect(result.action).toBe('COMPLETED');
  });

  it('should return DEMO for Q1-R2 page tasks without browser', async () => {
    const task = createTask(project, 'Q1-R2', 'Create Facebook Business Page', 'Create page', []);
    const result = await executeFacebookQ1Workflow(project, 'Q1-R2', task, 'DEMO_MODE');

    expect(result.success).toBe(true);
    expect(result.action).toBe('DEMO');
  });

  it('should return DEMO for Q1-R3 advanced setup without browser', async () => {
    const task = createTask(project, 'Q1-R3', 'Access Professional Dashboard', 'Navigate to dashboard', []);
    const result = await executeFacebookQ1Workflow(project, 'Q1-R3', task, 'DEMO_MODE');

    expect(result.success).toBe(true);
    expect(result.action).toBe('DEMO');
  });

  it('should return DEMO for Q1-R4 business suite without browser', async () => {
    const task = createTask(project, 'Q1-R4', 'Access Meta Business Suite', 'Navigate to suite', []);
    const result = await executeFacebookQ1Workflow(project, 'Q1-R4', task, 'DEMO_MODE');

    expect(result.success).toBe(true);
    expect(result.action).toBe('DEMO');
  });

  it('should return DEMO for Q1-R5 campaign tasks without browser', async () => {
    const task = createTask(project, 'Q1-R5', 'Create Facebook Ads Campaign', 'Create campaign', []);
    const result = await executeFacebookQ1Workflow(project, 'Q1-R5', task, 'DEMO_MODE');

    expect(result.success).toBe(true);
    expect(result.action).toBe('DEMO');
  });

  it('should return DEMO for Q1-R6 lead gen tasks without browser', async () => {
    const task = createTask(project, 'Q1-R6', 'Create Lead Generation Form', 'Set up form', []);
    const result = await executeFacebookQ1Workflow(project, 'Q1-R6', task, 'DEMO_MODE');

    expect(result.success).toBe(true);
    expect(result.action).toBe('DEMO');
  });

  it('should return DEMO for Q1-R7 A/B test tasks without browser', async () => {
    const task = createTask(project, 'Q1-R7', 'Create A/B Test', 'Set up test', []);
    const result = await executeFacebookQ1Workflow(project, 'Q1-R7', task, 'DEMO_MODE');

    expect(result.success).toBe(true);
    expect(result.action).toBe('DEMO');
  });

  it('should return DEMO for Q1-R8 evidence collection without browser', async () => {
    const task = createTask(project, 'Q1-R8', 'Collect Facebook Evidence', 'Capture screenshots', []);
    const result = await executeFacebookQ1Workflow(project, 'Q1-R8', task, 'DEMO_MODE');

    expect(result.success).toBe(true);
    expect(result.action).toBe('DEMO');
  });

  it('should handle Q1-R5 ad set 1 with campaign existing', async () => {
    const task = createTask(project, 'Q1-R5', 'Create Ad Set 1 - Interest Based', 'First ad set', []);
    const result = await executeFacebookQ1Workflow(project, 'Q1-R5', task, 'DEMO_MODE');

    expect(result.success).toBe(true);
    expect(result.action).toBe('DEMO');
  });

  it('should handle Q1-R5 ad set 2 without campaign', async () => {
    const task = createTask(project, 'Q1-R5', 'Create Ad Set 2 - Lookalike', 'Second ad set', []);
    const result = await executeFacebookQ1Workflow(project, 'Q1-R5', task, 'DEMO_MODE');

    expect(result.success).toBe(false);
    expect(result.action).toBe('DEMO');
  });

  it('should handle Q1-R5 ad creative tasks without campaign', async () => {
    const task = createTask(project, 'Q1-R5', 'Create Ads for Each Ad Set', 'Ad creatives', []);
    const result = await executeFacebookQ1Workflow(project, 'Q1-R5', task, 'DEMO_MODE');

    expect(result.success).toBe(false);
    expect(result.action).toBe('DEMO');
  });

  it('should handle Q1-R6 follow-up message tasks', async () => {
    const task = createTask(project, 'Q1-R6', 'Configure Follow-up Message', 'Set thank you message', []);
    const result = await executeFacebookQ1Workflow(project, 'Q1-R6', task, 'DEMO_MODE');

    expect(result.success).toBe(true);
    expect(result.action).toBe('DEMO');
  });

  it('should handle unknown requirement IDs gracefully', async () => {
    const task = createTask(project, 'Q99-R1', 'Unknown Task', 'Something', []);
    const result = await executeFacebookQ1Workflow(project, 'Q99-R1', task, 'DEMO_MODE');

    expect(result.success).toBe(false);
    expect(result.action).toBe('BLOCKED');
    expect(result.message).toContain('Unknown requirement');
  });

  it('should complete full Q1 DEMO_MODE execution without browser errors', async () => {
    const orchestrator = new Orchestrator();
    await orchestrator.initialize();
    const report = await orchestrator.executeProject('DEMO_MODE', 'Q1');

    expect(report.totalTasks).toBe(24);
    expect(report.completedTasks + report.failedTasks + report.actionRequiredTasks + report.blockedTasks)
      .toBe(report.totalTasks);
    expect(report.failedTasks).toBe(0);
    expect(report.actionRequiredTasks).toBe(1);
    expect(report.completedTasks).toBe(23);
  }, 30000);
});
