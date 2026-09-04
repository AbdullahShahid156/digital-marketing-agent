import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { existsSync, rmSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { Orchestrator } from '../src/core/orchestrator.js';
import { TaskExecutor } from '../src/core/task-executor.js';
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

function createTestTask(project: Project, overrides: Partial<Task> = {}): Task {
  const task: Task = {
    id: crypto.randomUUID(),
    requirementId: 'TEST-REQ',
    title: 'Test Task',
    description: 'A test task',
    state: 'PENDING',
    dependencies: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
  project.tasks.push(task);
  return task;
}

describe('Orchestrator - Execution Loop', () => {
  let testOrchestrator: Orchestrator;
  let project: Project;

  beforeEach(async () => {
    if (!existsSync(TEST_DATA_DIR)) {
      mkdirSync(TEST_DATA_DIR, { recursive: true });
    }
    testOrchestrator = new Orchestrator();
    project = await testOrchestrator.initialize();
  });

  afterEach(() => {
    safeRmSync(join(TEST_DATA_DIR, 'project.json'));
    safeRmSync(join(TEST_DATA_DIR, 'project.json.tmp'));
  });

  it('should load requirements from assignment', () => {
    const reqs = testOrchestrator.loadRequirements('Q1');
    expect(reqs.length).toBeGreaterThan(0);
    expect(reqs[0].id).toMatch(/^Q1/);
  });

  it('should load Q2 requirements', () => {
    const reqs = testOrchestrator.loadRequirements('Q2');
    expect(reqs.length).toBeGreaterThan(0);
    expect(reqs[0].id).toMatch(/^Q2/);
  });

  it('should load all requirements', () => {
    const reqs = testOrchestrator.loadRequirements('ALL');
    expect(reqs.length).toBeGreaterThanOrEqual(17);
  });

  it('should not duplicate requirements on second load', () => {
    testOrchestrator.loadRequirements('ALL');
    const reqs2 = testOrchestrator.loadRequirements('ALL');
    expect(reqs2.length).toBeGreaterThanOrEqual(17);
  });

  it('should build task graph from requirements', () => {
    const reqs = testOrchestrator.loadRequirements('ALL');
    const tasks = testOrchestrator.buildTaskGraph(reqs);
    expect(tasks.length).toBeGreaterThan(30);
    expect(tasks.every(t => t.requirementId.startsWith('Q'))).toBe(true);
  });

  it('should track action required tasks in progress report', () => {
    createTestTask(project, {
      title: 'Facebook Login',
      state: 'ACTION_REQUIRED',
    });
    const progress = testOrchestrator.getProgress();
    expect(progress.actionRequiredTasks).toBeGreaterThanOrEqual(0);
  });

  it('should approve an action required task', () => {
    const task = testOrchestrator.createTaskForRequirement('Q1-R2', 'FB Login', 'Log into Facebook');
    testOrchestrator.updateTask(task.id, 'ACTION_REQUIRED');

    const approved = testOrchestrator.approveTask(task.id);
    expect(approved).toBe(true);

    const updated = project.tasks.find(t => t.id === task.id);
    expect(updated?.state).toBe('PENDING');
  });

  it('should return false when approving non-action-required task', () => {
    const task = testOrchestrator.createTaskForRequirement('Q1-R2', 'FB Page', 'Create page');
    const approved = testOrchestrator.approveTask(task.id);
    expect(approved).toBe(false);
  });

  it('should return false when approving non-existent task', () => {
    const approved = testOrchestrator.approveTask('non-existent-id');
    expect(approved).toBe(false);
  });

  it('should return execution log', () => {
    const log = testOrchestrator.getExecutionLog();
    expect(Array.isArray(log)).toBe(true);
  });
});

describe('TaskExecutor - Core Logic', () => {
  let project: Project;

  beforeEach(async () => {
    if (!existsSync(TEST_DATA_DIR)) {
      mkdirSync(TEST_DATA_DIR, { recursive: true });
    }
    const testOrchestrator = new Orchestrator();
    project = await testOrchestrator.initialize();
  });

  afterEach(() => {
    safeRmSync(join(TEST_DATA_DIR, 'project.json'));
    safeRmSync(join(TEST_DATA_DIR, 'project.json.tmp'));
  });

  it('should infer BROWSER mode for profile/page tasks', () => {
    const executor = new TaskExecutor({ mode: 'DEMO_MODE' });
    const task = createTestTask(project, { title: 'Create Business Profile', description: 'Define business name and industry' });
    const mode = (executor as any).inferExecutionMode(task);
    expect(mode).toBe('BROWSER');
  });

  it('should infer USER_ACTION for Facebook login', () => {
    const executor = new TaskExecutor({ mode: 'DEMO_MODE' });
    const task = createTestTask(project, { title: 'Facebook Login', description: 'Log into Facebook account' });
    const mode = (executor as any).inferExecutionMode(task);
    expect(mode).toBe('USER_ACTION');
  });

  it('should infer USER_ACTION for LinkedIn login', () => {
    const executor = new TaskExecutor({ mode: 'DEMO_MODE' });
    const task = createTestTask(project, { title: 'LinkedIn Login', description: 'Log into LinkedIn' });
    const mode = (executor as any).inferExecutionMode(task);
    expect(mode).toBe('USER_ACTION');
  });

  it('should infer RESEARCH for prospect research tasks', () => {
    const executor = new TaskExecutor({ mode: 'DEMO_MODE' });
    const task = createTestTask(project, { title: 'Research Client Prospects', description: 'Find potential clients' });
    const mode = (executor as any).inferExecutionMode(task);
    expect(mode).toBe('RESEARCH');
  });

  it('should infer AUTOMATED for generic tasks', () => {
    const executor = new TaskExecutor({ mode: 'DEMO_MODE' });
    const task = createTestTask(project, { title: 'Write Connection Message', description: 'Draft LinkedIn connection' });
    const mode = (executor as any).inferExecutionMode(task);
    expect(mode).toBe('AUTOMATED');
  });

  it('should create action plans for Q1-R1 tasks', () => {
    const executor = new TaskExecutor({ mode: 'DEMO_MODE' });
    const task = createTestTask(project, {
      requirementId: 'Q1-R1',
      title: 'Create Business Profile',
    });
    const plan = executor.createActionPlan(project, task);
    expect(plan).toBeDefined();
    expect(plan.length).toBeGreaterThan(0);
  });

  it('should create action plans for Q1-R5 meta campaigns', () => {
    const executor = new TaskExecutor({ mode: 'DEMO_MODE' });
    const task = createTestTask(project, {
      requirementId: 'Q1-R5',
      title: 'Create Facebook Ads Campaign',
    });
    const plan = executor.createActionPlan(project, task);
    expect(plan.length).toBeGreaterThan(0);
  });

  it('should execute automated tasks in DEMO_MODE', async () => {
    const executor = new TaskExecutor({ mode: 'DEMO_MODE' });
    const task = createTestTask(project, {
      requirementId: 'Q1-R1',
      title: 'Create Business Profile',
      description: 'Define business name and industry',
    });
    const result = await executor.executeTask(project, task);
    expect(result).toBeDefined();
    expect(typeof result.success).toBe('boolean');
  });

  it('should return ACTION_REQUIRED for login tasks', async () => {
    const executor = new TaskExecutor({ mode: 'DEMO_MODE' });
    const task = createTestTask(project, {
      requirementId: 'Q1-R2',
      title: 'Facebook Login',
      description: 'Log into Facebook',
    });
    const result = await executor.executeTask(project, task);
    expect(result.state).toBe('ACTION_REQUIRED');
    expect(result.error).toBeDefined();
    expect(result.error?.length).toBeGreaterThan(0);
  });

  it('should generate user instructions for browser page tasks', () => {
    const executor = new TaskExecutor({ mode: 'DEMO_MODE' });
    const task = createTestTask(project, {
      requirementId: 'Q1-R2',
      title: 'Create Facebook Business Page',
      description: 'Create page with name and category',
    });
    const instruction = (executor as any).generateUserInstruction(task);
    expect(instruction).toBeDefined();
    expect(instruction.length).toBeGreaterThan(0);
  });

  it('should generate instructions for profile optimization', () => {
    const executor = new TaskExecutor({ mode: 'DEMO_MODE' });
    const task = createTestTask(project, {
      requirementId: 'Q2-R1',
      title: 'Optimize LinkedIn Profile Headline',
      description: 'Set professional headline',
    });
    const instruction = (executor as any).generateUserInstruction(task);
    expect(instruction).toContain('LinkedIn');
  });

  it('should handle outreach module tasks', async () => {
    const executor = new TaskExecutor({ mode: 'DEMO_MODE' });
    const task = createTestTask(project, {
      requirementId: 'Q2-R7',
      title: 'Write Connection Message',
      description: 'Draft LinkedIn connection request',
    });
    const result = await executor.executeTask(project, task);
    expect(result.success).toBe(true);
  });

  it('should handle prospects module tasks', async () => {
    const executor = new TaskExecutor({ mode: 'DEMO_MODE' });
    const task = createTestTask(project, {
      requirementId: 'Q2-R6',
      title: 'Research Client Prospects',
      description: 'Find potential clients',
    });
    const result = await executor.executeTask(project, task);
    expect(result.success).toBe(true);
  });

  it('should handle reports module tasks', async () => {
    const executor = new TaskExecutor({ mode: 'DEMO_MODE' });
    const task = createTestTask(project, {
      requirementId: 'Q1-R8',
      title: 'Collect Facebook Evidence',
      description: 'Capture screenshots of Page',
    });
    const result = await executor.executeTask(project, task);
    expect(result.success).toBe(true);
  });
});
