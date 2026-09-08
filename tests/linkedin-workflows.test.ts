import { describe, it, expect, beforeEach, vi } from 'vitest';
import { executeLinkedInQ2Workflow } from '../src/modules/linkedin/workflows.js';
import { Orchestrator } from '../src/core/orchestrator.js';
import { TaskExecutor } from '../src/core/task-executor.js';
import { createNewProject, saveProject } from '../src/core/state.js';
import { createTask, updateTaskState } from '../src/core/task-manager.js';
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
    screenshot: vi.fn(),
    close: vi.fn(),
  })),
  setBrowserManager: vi.fn(),
}));

vi.mock('../src/core/verification-engine.js', () => ({
  verifyPageState: vi.fn(async () => ({ passed: true, expected: 'test', observed: 'test', details: 'All checks passed' })),
  createTextVisibleCheck: vi.fn((text: string) => ({ type: 'text_visible' as const, expected: text })),
  createUrlCheck: vi.fn((pattern: string) => ({ type: 'url_contains' as const, expected: pattern })),
}));

vi.mock('../src/core/evidence-manager.js', () => ({
  captureEvidence: vi.fn(async () => ({
    id: 'ECAP-1',
    requirementId: 'Q2-R1',
    taskId: 'test',
    actionId: 'test',
    screenshotPath: 'evidence/q2/test.png',
    pageUrl: 'https://linkedin.com',
    pageTitle: 'LinkedIn',
    description: 'Test',
    verificationStatus: 'PENDING' as const,
    capturedAt: new Date(),
  })),
}));

vi.mock('../src/modules/business/analyzer.js', () => ({
  addCustomerPersona: vi.fn(),
}));

function createTestProject(): Project {
  const project = createNewProject(`Test Project ${Date.now()}`, 'Test Description');
  saveProject(project, 'create');
  return project;
}

function createTaskWithReq(project: Project, reqId: string, title: string, description: string, deps: string[]): Task {
  return createTask(project, reqId, title, description, deps);
}

describe('Step 5 - Q2 LinkedIn Workflows', () => {
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

  it('should return ACTION_REQUIRED for login without browser', async () => {
    const task = createTaskWithReq(project, 'Q2-R1', 'LinkedIn Login', 'Log into LinkedIn', []);
    const result = await executeLinkedInQ2Workflow(project, 'Q2-R1', task, 'LIVE_MODE');
    expect(result.success).toBe(false);
    expect(result.action).toBe('ACTION_REQUIRED');
    expect(result.message).toContain('Browser not launched');
  });

  it('should return SIMULATED for headline in DEMO_MODE without browser', async () => {
    const task = createTaskWithReq(project, 'Q2-R1', 'Optimize LinkedIn Profile Headline', 'Set headline', []);
    const result = await executeLinkedInQ2Workflow(project, 'Q2-R1', task, 'DEMO_MODE');
    expect(result.success).toBe(true);
    expect(result.action).toBe('SIMULATED');
    expect(result.message).toContain('SIMULATED');
    expect(result.details).toBeDefined();
  });

  it('should return SIMULATED for about section in DEMO_MODE without browser', async () => {
    const task = createTaskWithReq(project, 'Q2-R1', 'Write LinkedIn About Section', 'Complete about', []);
    const result = await executeLinkedInQ2Workflow(project, 'Q2-R1', task, 'DEMO_MODE');
    expect(result.success).toBe(true);
    expect(result.action).toBe('SIMULATED');
  });

  it('should return SIMULATED for skills in DEMO_MODE without browser', async () => {
    const task = createTaskWithReq(project, 'Q2-R1', 'Add Skills and Experience', 'Add skills', []);
    const result = await executeLinkedInQ2Workflow(project, 'Q2-R1', task, 'DEMO_MODE');
    expect(result.success).toBe(true);
    expect(result.action).toBe('SIMULATED');
  });

  it('should return SIMULATED for company page in DEMO_MODE without browser', async () => {
    const task = createTaskWithReq(project, 'Q2-R2', 'Create LinkedIn Company Page', 'Set up company', []);
    const result = await executeLinkedInQ2Workflow(project, 'Q2-R2', task, 'DEMO_MODE');
    expect(result.success).toBe(true);
    expect(result.action).toBe('SIMULATED');
    expect(result.details).toBeDefined();
  });

  it('should return SIMULATED for campaign in DEMO_MODE without browser', async () => {
    const task = createTaskWithReq(project, 'Q2-R3', 'Create LinkedIn Lead Gen Campaign', 'Design campaign', []);
    const result = await executeLinkedInQ2Workflow(project, 'Q2-R3', task, 'DEMO_MODE');
    expect(result.success).toBe(true);
    expect(result.action).toBe('SIMULATED');
  });

  it('should return COMPLETED for audience segment (data task)', async () => {
    const task = createTaskWithReq(project, 'Q2-R4', 'Define Audience Segment 1', 'Small business owners', []);
    const result = await executeLinkedInQ2Workflow(project, 'Q2-R4', task, 'LIVE_MODE');
    expect(result.success).toBe(true);
    expect(result.action).toBe('COMPLETED');
    expect(result.details).toBeDefined();
  });

  it('should return COMPLETED for AI persona (data task)', async () => {
    const task = createTaskWithReq(project, 'Q2-R5', 'Generate AI Client Persona', 'Use AI for persona', []);
    const result = await executeLinkedInQ2Workflow(project, 'Q2-R5', task, 'LIVE_MODE');
    expect(result.success).toBe(true);
    expect(result.action).toBe('COMPLETED');
  });

  it('should return COMPLETED for 7-day content plan', async () => {
    const task = createTaskWithReq(project, 'Q2-R5', 'Generate 7-Day Content Plan', 'Create weekly plan', []);
    const result = await executeLinkedInQ2Workflow(project, 'Q2-R5', task, 'LIVE_MODE');
    expect(result.success).toBe(true);
    expect(result.action).toBe('COMPLETED');
    expect(result.details).toBeDefined();
  });

  it('should return COMPLETED for campaign angle', async () => {
    const task = createTaskWithReq(project, 'Q2-R5', 'Generate Campaign Angle', 'Develop messaging', []);
    const result = await executeLinkedInQ2Workflow(project, 'Q2-R5', task, 'LIVE_MODE');
    expect(result.success).toBe(true);
    expect(result.action).toBe('COMPLETED');
  });

  it('should return COMPLETED for prospect research', async () => {
    const task = createTaskWithReq(project, 'Q2-R6', 'Research Client Prospects', 'Find 10+ clients', []);
    const result = await executeLinkedInQ2Workflow(project, 'Q2-R6', task, 'LIVE_MODE');
    expect(result.success).toBe(true);
    expect(result.action).toBe('COMPLETED');
    expect(result.details).toBeDefined();
  });

  it('should return COMPLETED for prospect qualification', async () => {
    const task = createTaskWithReq(project, 'Q2-R6', 'Qualify Prospects', 'Evaluate prospects', []);
    const result = await executeLinkedInQ2Workflow(project, 'Q2-R6', task, 'LIVE_MODE');
    expect(result.success).toBe(true);
    expect(result.action).toBe('COMPLETED');
  });

  it('should return COMPLETED with personalized connection message', async () => {
    const task = createTaskWithReq(project, 'Q2-R7', 'Write Connection Message', 'Draft connection request', []);
    const result = await executeLinkedInQ2Workflow(project, 'Q2-R7', task, 'LIVE_MODE');
    expect(result.success).toBe(true);
    expect(result.action).toBe('COMPLETED');
    expect(result.details).toBeDefined();
    const details = result.details as Record<string, unknown>;
    expect(details.connectionRequest).toBeDefined();
    expect(details.personalizationReason).toBeDefined();
  });

  it('should return COMPLETED with personalized first outreach', async () => {
    const task = createTaskWithReq(project, 'Q2-R7', 'Write First Outreach Message', 'Draft outreach', []);
    const result = await executeLinkedInQ2Workflow(project, 'Q2-R7', task, 'LIVE_MODE');
    expect(result.success).toBe(true);
    expect(result.action).toBe('COMPLETED');
  });

  it('should return COMPLETED with personalized follow-up', async () => {
    const task = createTaskWithReq(project, 'Q2-R7', 'Write Follow-up Message', 'Draft follow-up', []);
    const result = await executeLinkedInQ2Workflow(project, 'Q2-R7', task, 'LIVE_MODE');
    expect(result.success).toBe(true);
    expect(result.action).toBe('COMPLETED');
  });

  it('should return COMPLETED for campaign metrics', async () => {
    const task = createTaskWithReq(project, 'Q2-R8', 'Define Campaign Metrics', 'Set KPIs', []);
    const result = await executeLinkedInQ2Workflow(project, 'Q2-R8', task, 'LIVE_MODE');
    expect(result.success).toBe(true);
    expect(result.action).toBe('COMPLETED');
  });

  it('should return COMPLETED for outreach metrics', async () => {
    const task = createTaskWithReq(project, 'Q2-R8', 'Define Outreach Metrics', 'Set outreach KPIs', []);
    const result = await executeLinkedInQ2Workflow(project, 'Q2-R8', task, 'LIVE_MODE');
    expect(result.success).toBe(true);
    expect(result.action).toBe('COMPLETED');
  });

  it('should return COMPLETED for improvement strategy', async () => {
    const task = createTaskWithReq(project, 'Q2-R8', 'Create Improvement Strategy', 'Document improvements', []);
    const result = await executeLinkedInQ2Workflow(project, 'Q2-R8', task, 'LIVE_MODE');
    expect(result.success).toBe(true);
    expect(result.action).toBe('COMPLETED');
  });

  it('should validate evidence files for Q2-R9', async () => {
    const task = createTaskWithReq(project, 'Q2-R9', 'Collect LinkedIn Evidence', 'Capture screenshots', []);
    const result = await executeLinkedInQ2Workflow(project, 'Q2-R9', task, 'LIVE_MODE');
    expect(result.details).toBeDefined();
    const details = result.details as Record<string, unknown>;
    expect(details.evidenceItems).toBeDefined();
    expect(Array.isArray(details.evidenceItems)).toBe(true);
  });

  it('should return BLOCKED for unknown requirement IDs', async () => {
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
    expect(result.action).toBe('SIMULATED');
  });

  it('should complete full Q2 DEMO_MODE execution', async () => {
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
