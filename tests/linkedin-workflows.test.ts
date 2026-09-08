import { describe, it, expect, beforeEach, vi } from 'vitest';
import { executeLinkedInQ2Workflow } from '../src/modules/linkedin/workflows.js';
import { Orchestrator } from '../src/core/orchestrator.js';
import { TaskExecutor } from '../src/core/task-executor.js';
import { createNewProject, saveProject } from '../src/core/state.js';
import { createTask, updateTaskState } from '../src/core/task-manager.js';
import { setBrowserManager } from '../src/core/browser-manager.js';
import type { Project, Task } from '../src/types/index.js';

vi.mock('../src/core/browser-manager.js', () => ({
  getBrowserManager: vi.fn(() => ({
    isLaunched: vi.fn(() => false),
    navigate: vi.fn(),
    getCurrentState: vi.fn(() => ({
      url: 'https://www.linkedin.com',
      title: 'LinkedIn',
      visibleText: 'Feed My Network Search',
      elements: [],
    })),
    fill: vi.fn(),
    click: vi.fn(),
  })),
  setBrowserManager: vi.fn(),
}));

function createTestProject(): Project {
  const project = createNewProject(`Test Project ${Date.now()}`, 'Test Description');
  saveProject(project, 'create');
  return project;
}

function createTaskWithReq(project: Project, reqId: string, title: string, description: string, deps: string[]): Task {
  return createTask(project, reqId, title, description, deps);
}

describe('Step 4 - Q2 LinkedIn Workflows', () => {
  let project: Project;

  beforeEach(() => {
    project = createTestProject();
  });

  it('should load Q2 requirements and build task graph', async () => {
    const orchestrator = new Orchestrator();
    await orchestrator.initialize();
    const reqs = orchestrator.loadRequirements('Q2');
    expect(reqs.length).toBe(9);
    expect(reqs.every(r => r.id.startsWith('Q2'))).toBe(true);

    const tasks = orchestrator.buildTaskGraph(reqs);
    expect(tasks.length).toBe(23);
  });

  it('should route Q2-R1 LinkedIn Login as ACTION_REQUIRED without browser', async () => {
    const task = createTaskWithReq(project, 'Q2-R1', 'LinkedIn Login', 'Log into LinkedIn', []);
    const result = await executeLinkedInQ2Workflow(project, 'Q2-R1', task, 'LIVE_MODE');
    expect(result.success).toBe(false);
    expect(result.action).toBe('ACTION_REQUIRED');
    expect(result.message).toContain('login');
  });

  it('should generate headline for Q2-R1 without browser', async () => {
    const task = createTaskWithReq(project, 'Q2-R1', 'Optimize LinkedIn Profile Headline', 'Set headline', []);
    const result = await executeLinkedInQ2Workflow(project, 'Q2-R1', task, 'LIVE_MODE');
    expect(result.success).toBe(true);
    expect(result.action).toBe('COMPLETED');
    expect(result.details).toBeDefined();
  });

  it('should generate about section for Q2-R1 without browser', async () => {
    const task = createTaskWithReq(project, 'Q2-R1', 'Write LinkedIn About Section', 'Complete about', []);
    const result = await executeLinkedInQ2Workflow(project, 'Q2-R1', task, 'LIVE_MODE');
    expect(result.success).toBe(true);
    expect(result.action).toBe('COMPLETED');
  });

  it('should generate skills for Q2-R1 without browser', async () => {
    const task = createTaskWithReq(project, 'Q2-R1', 'Add Skills and Experience', 'Add skills', []);
    const result = await executeLinkedInQ2Workflow(project, 'Q2-R1', task, 'LIVE_MODE');
    expect(result.success).toBe(true);
    expect(result.action).toBe('COMPLETED');
  });

  it('should create company page for Q2-R2 without browser', async () => {
    const task = createTaskWithReq(project, 'Q2-R2', 'Create LinkedIn Company Page', 'Set up company', []);
    const result = await executeLinkedInQ2Workflow(project, 'Q2-R2', task, 'LIVE_MODE');
    expect(result.success).toBe(true);
    expect(result.action).toBe('COMPLETED');
    expect(result.details).toBeDefined();
  });

  it('should configure company description for Q2-R2 without browser', async () => {
    const task = createTaskWithReq(project, 'Q2-R2', 'Configure Company Description', 'Add description', []);
    const result = await executeLinkedInQ2Workflow(project, 'Q2-R2', task, 'LIVE_MODE');
    expect(result.success).toBe(true);
    expect(result.action).toBe('COMPLETED');
  });

  it('should create campaign for Q2-R3 without browser', async () => {
    const task = createTaskWithReq(project, 'Q2-R3', 'Create LinkedIn Lead Gen Campaign', 'Design campaign', []);
    const result = await executeLinkedInQ2Workflow(project, 'Q2-R3', task, 'LIVE_MODE');
    expect(result.success).toBe(true);
    expect(result.action).toBe('COMPLETED');
    expect(result.details).toBeDefined();
  });

  it('should generate ad creative for Q2-R3 without browser', async () => {
    const task = createTaskWithReq(project, 'Q2-R3', 'Create LinkedIn Ad Creative', 'Set up creative', []);
    const result = await executeLinkedInQ2Workflow(project, 'Q2-R3', task, 'LIVE_MODE');
    expect(result.success).toBe(true);
    expect(result.action).toBe('COMPLETED');
  });

  it('should create lead gen form for Q2-R3 without browser', async () => {
    const task = createTaskWithReq(project, 'Q2-R3', 'Create LinkedIn Lead Gen Form', 'Set up form', []);
    const result = await executeLinkedInQ2Workflow(project, 'Q2-R3', task, 'LIVE_MODE');
    expect(result.success).toBe(true);
    expect(result.action).toBe('COMPLETED');
  });

  it('should define audience segment 1 for Q2-R4 without browser', async () => {
    const task = createTaskWithReq(project, 'Q2-R4', 'Define Audience Segment 1', 'Small business owners', []);
    const result = await executeLinkedInQ2Workflow(project, 'Q2-R4', task, 'LIVE_MODE');
    expect(result.success).toBe(true);
    expect(result.action).toBe('COMPLETED');
    expect(result.details).toBeDefined();
  });

  it('should define audience segment 2 for Q2-R4 without browser', async () => {
    const task = createTaskWithReq(project, 'Q2-R4', 'Define Audience Segment 2', 'Marketing managers', []);
    const result = await executeLinkedInQ2Workflow(project, 'Q2-R4', task, 'LIVE_MODE');
    expect(result.success).toBe(true);
    expect(result.action).toBe('COMPLETED');
  });

  it('should generate AI client persona for Q2-R5 without browser', async () => {
    const task = createTaskWithReq(project, 'Q2-R5', 'Generate AI Client Persona', 'Use AI for persona', []);
    const result = await executeLinkedInQ2Workflow(project, 'Q2-R5', task, 'LIVE_MODE');
    expect(result.success).toBe(true);
    expect(result.action).toBe('COMPLETED');
  });

  it('should generate 7-day content plan for Q2-R5 without browser', async () => {
    const task = createTaskWithReq(project, 'Q2-R5', 'Generate 7-Day Content Plan', 'Create weekly plan', []);
    const result = await executeLinkedInQ2Workflow(project, 'Q2-R5', task, 'LIVE_MODE');
    expect(result.success).toBe(true);
    expect(result.action).toBe('COMPLETED');
    expect(result.details).toBeDefined();
  });

  it('should generate campaign angle for Q2-R5 without browser', async () => {
    const task = createTaskWithReq(project, 'Q2-R5', 'Generate Campaign Angle', 'Develop messaging', []);
    const result = await executeLinkedInQ2Workflow(project, 'Q2-R5', task, 'LIVE_MODE');
    expect(result.success).toBe(true);
    expect(result.action).toBe('COMPLETED');
  });

  it('should research client prospects for Q2-R6 without browser', async () => {
    const task = createTaskWithReq(project, 'Q2-R6', 'Research Client Prospects', 'Find 10+ clients', []);
    const result = await executeLinkedInQ2Workflow(project, 'Q2-R6', task, 'LIVE_MODE');
    expect(result.success).toBe(true);
    expect(result.action).toBe('COMPLETED');
    expect(result.details).toBeDefined();
  });

  it('should qualify prospects for Q2-R6 without browser', async () => {
    const task = createTaskWithReq(project, 'Q2-R6', 'Qualify Prospects', 'Evaluate prospects', []);
    const result = await executeLinkedInQ2Workflow(project, 'Q2-R6', task, 'LIVE_MODE');
    expect(result.success).toBe(true);
    expect(result.action).toBe('COMPLETED');
  });

  it('should write connection message for Q2-R7 without browser', async () => {
    const task = createTaskWithReq(project, 'Q2-R7', 'Write Connection Message', 'Draft connection request', []);
    const result = await executeLinkedInQ2Workflow(project, 'Q2-R7', task, 'LIVE_MODE');
    expect(result.success).toBe(true);
    expect(result.action).toBe('COMPLETED');
    expect(result.details).toBeDefined();
  });

  it('should write first outreach for Q2-R7 without browser', async () => {
    const task = createTaskWithReq(project, 'Q2-R7', 'Write First Outreach Message', 'Draft outreach', []);
    const result = await executeLinkedInQ2Workflow(project, 'Q2-R7', task, 'LIVE_MODE');
    expect(result.success).toBe(true);
    expect(result.action).toBe('COMPLETED');
  });

  it('should write follow-up for Q2-R7 without browser', async () => {
    const task = createTaskWithReq(project, 'Q2-R7', 'Write Follow-up Message', 'Draft follow-up', []);
    const result = await executeLinkedInQ2Workflow(project, 'Q2-R7', task, 'LIVE_MODE');
    expect(result.success).toBe(true);
    expect(result.action).toBe('COMPLETED');
  });

  it('should define campaign metrics for Q2-R8 without browser', async () => {
    const task = createTaskWithReq(project, 'Q2-R8', 'Define Campaign Metrics', 'Set KPIs', []);
    const result = await executeLinkedInQ2Workflow(project, 'Q2-R8', task, 'LIVE_MODE');
    expect(result.success).toBe(true);
    expect(result.action).toBe('COMPLETED');
  });

  it('should define outreach metrics for Q2-R8 without browser', async () => {
    const task = createTaskWithReq(project, 'Q2-R8', 'Define Outreach Metrics', 'Set outreach KPIs', []);
    const result = await executeLinkedInQ2Workflow(project, 'Q2-R8', task, 'LIVE_MODE');
    expect(result.success).toBe(true);
    expect(result.action).toBe('COMPLETED');
  });

  it('should create improvement strategy for Q2-R8 without browser', async () => {
    const task = createTaskWithReq(project, 'Q2-R8', 'Create Improvement Strategy', 'Document improvements', []);
    const result = await executeLinkedInQ2Workflow(project, 'Q2-R8', task, 'LIVE_MODE');
    expect(result.success).toBe(true);
    expect(result.action).toBe('COMPLETED');
  });

  it('should collect LinkedIn evidence for Q2-R9 without browser', async () => {
    const task = createTaskWithReq(project, 'Q2-R9', 'Collect LinkedIn Evidence', 'Capture screenshots', []);
    const result = await executeLinkedInQ2Workflow(project, 'Q2-R9', task, 'LIVE_MODE');
    expect(result.success).toBe(true);
    expect(result.action).toBe('COMPLETED');
    expect(result.details).toBeDefined();
  });

  it('should handle unknown requirement IDs gracefully', async () => {
    const task = createTaskWithReq(project, 'Q99-R1', 'Unknown Task', 'Unknown', []);
    const result = await executeLinkedInQ2Workflow(project, 'Q99-R1', task, 'LIVE_MODE');
    expect(result.success).toBe(false);
    expect(result.action).toBe('BLOCKED');
    expect(result.message).toContain('Unknown requirement');
  });

  it('should handle DEMO_MODE for Q2-R1 without browser', async () => {
    const task = createTaskWithReq(project, 'Q2-R1', 'Optimize LinkedIn Profile Headline', 'Set headline', []);
    const result = await executeLinkedInQ2Workflow(project, 'Q2-R1', task, 'DEMO_MODE');
    expect(result.success).toBe(true);
  });

  it('should handle DEMO_MODE for Q2-R3 campaign without browser', async () => {
    const task = createTaskWithReq(project, 'Q2-R3', 'Create LinkedIn Lead Gen Campaign', 'Design campaign', []);
    const result = await executeLinkedInQ2Workflow(project, 'Q2-R3', task, 'DEMO_MODE');
    expect(result.success).toBe(true);
  });

  it('should complete full Q2 DEMO_MODE execution without browser errors', async () => {
    const orchestrator = new Orchestrator();
    await orchestrator.initialize();
    const reqs = orchestrator.loadRequirements('Q2');
    expect(reqs.length).toBe(9);

    const tasks = orchestrator.buildTaskGraph(reqs);
    expect(tasks.length).toBe(23);

    const proj = orchestrator.getProject();
    for (const t of proj.tasks) {
      if (t.state !== 'PENDING') {
        updateTaskState(proj, t.id, 'PENDING');
      }
    }

    const executor = new TaskExecutor({ mode: 'DEMO_MODE' });
    let completed = 0;
    let actionRequired = 0;
    let failed = 0;

    for (const task of proj.tasks) {
      const result = await executor.executeTask(proj, task);
      if (result.state === 'COMPLETED') completed++;
      else if (result.state === 'ACTION_REQUIRED') actionRequired++;
      else if (result.state === 'FAILED') failed++;
    }

    expect(completed + actionRequired + failed).toBe(23);
    expect(failed).toBe(0);
    expect(actionRequired).toBeGreaterThanOrEqual(1);
    expect(completed).toBeGreaterThanOrEqual(21);
  });
});
