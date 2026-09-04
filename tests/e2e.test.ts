import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { existsSync, rmSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { Orchestrator } from '../src/core/orchestrator.js';

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

describe('Demo E2E - Full Orchestration', () => {
  let testOrchestrator: Orchestrator;

  beforeEach(async () => {
    if (!existsSync(TEST_DATA_DIR)) {
      mkdirSync(TEST_DATA_DIR, { recursive: true });
    }
    testOrchestrator = new Orchestrator();
    await testOrchestrator.initialize();
  });

  afterEach(() => {
    safeRmSync(join(TEST_DATA_DIR, 'project.json'));
    safeRmSync(join(TEST_DATA_DIR, 'project.json.tmp'));
  });

  it('should load requirements and build task graph', () => {
    const reqs = testOrchestrator.loadRequirements('ALL');
    expect(reqs.length).toBeGreaterThanOrEqual(17);

    const tasks = testOrchestrator.buildTaskGraph(reqs);
    expect(tasks.length).toBeGreaterThan(30);
  });

  it('should execute Q1 section in DEMO_MODE', async () => {
    const report = await testOrchestrator.executeProject('DEMO_MODE', 'Q1');

    expect(report).toBeDefined();
    expect(report.totalTasks).toBeGreaterThan(0);
    expect(report.completedTasks + report.failedTasks + report.actionRequiredTasks + report.blockedTasks)
      .toBe(report.totalTasks);
    expect(report.mode).toBe('DEMO_MODE');
    expect(report.duration).toBeGreaterThanOrEqual(0);
    expect(report.log.length).toBeGreaterThan(0);
  }, 60000);

  it('should execute Q2 section in DEMO_MODE', async () => {
    const report = await testOrchestrator.executeProject('DEMO_MODE', 'Q2');

    expect(report).toBeDefined();
    expect(report.totalTasks).toBeGreaterThan(0);
    expect(report.completedTasks + report.failedTasks + report.actionRequiredTasks + report.blockedTasks)
      .toBe(report.totalTasks);
    expect(report.mode).toBe('DEMO_MODE');
  }, 60000);

  it('should generate progress report after execution', async () => {
    await testOrchestrator.executeProject('DEMO_MODE', 'Q1');

    const progress = testOrchestrator.getProgress();
    expect(progress.totalTasks).toBeGreaterThan(0);
    expect(progress.projectName).toBeDefined();
    expect(typeof progress.percentComplete).toBe('number');
  }, 60000);

  it('should track action required tasks after execution', async () => {
    const report = await testOrchestrator.executeProject('DEMO_MODE', 'Q1');

    expect(typeof report.actionRequiredTasks).toBe('number');
    expect(typeof report.blockedTasks).toBe('number');
  }, 60000);

  it('should allow resuming after approval', async () => {
    const report1 = await testOrchestrator.executeProject('DEMO_MODE', 'Q1');

    const actionRequiredTasks = testOrchestrator.getProject().tasks.filter(t => t.state === 'ACTION_REQUIRED');

    if (actionRequiredTasks.length > 0) {
      for (const task of actionRequiredTasks) {
        testOrchestrator.approveTask(task.id);
      }

      const report2 = await testOrchestrator.resumeExecution('DEMO_MODE');
      expect(report2.totalTasks).toBeGreaterThan(0);
    }
  }, 60000);

  it('should generate execution log with entries', async () => {
    await testOrchestrator.executeProject('DEMO_MODE', 'Q1');

    const log = testOrchestrator.getExecutionLog();
    expect(log.length).toBeGreaterThan(0);
    expect(log[0].timestamp).toBeDefined();
    expect(log[0].taskId).toBeDefined();
    expect(log[0].status).toBeDefined();
  }, 60000);

  it('should print progress report without throwing', async () => {
    await testOrchestrator.executeProject('DEMO_MODE', 'Q1');
    expect(() => testOrchestrator.report()).not.toThrow();
  }, 60000);
});
