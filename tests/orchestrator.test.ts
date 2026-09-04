import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { existsSync, rmSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { orchestrator } from '../src/core/orchestrator.js';
import type { Project } from '../src/types/index.js';

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

describe('Orchestrator', () => {
  let project: Project;

  beforeEach(async () => {
    if (!existsSync(TEST_DATA_DIR)) {
      mkdirSync(TEST_DATA_DIR, { recursive: true });
    }
    project = await orchestrator.initialize();
  });

  afterEach(() => {
    safeRmSync(join(TEST_DATA_DIR, 'project.json'));
    safeRmSync(join(TEST_DATA_DIR, 'project.json.tmp'));
  });

  it('should initialize project', () => {
    expect(project).toBeDefined();
    expect(project.name).toBe('Hunarmand Punjab Digital Marketing Project');
  });

  it('should execute a step successfully', async () => {
    const result = await orchestrator.executeStep('Test Step', async () => {
      return ['file1.ts', 'file2.ts'];
    });

    expect(result.status).toBe('SUCCESS');
    expect(result.files).toHaveLength(2);
    expect(result.duration).toBeGreaterThanOrEqual(0);
  });

  it('should handle step failure', async () => {
    const result = await orchestrator.executeStep('Failing Step', async () => {
      throw new Error('Test error');
    });

    expect(result.status).toBe('FAILED');
    expect(result.error).toBeDefined();
  });

  it('should track progress', () => {
    const progress = orchestrator.getProgress();
    expect(progress).toBeDefined();
    expect(progress.totalTasks).toBe(0);
    expect(progress.percentComplete).toBe(0);
  });

  it('should create tasks', () => {
    const task = orchestrator.createTaskForRequirement('REQ-1', 'Test Task', 'Description');
    expect(task).toBeDefined();
    expect(task.title).toBe('Test Task');
  });

  it('should update tasks', () => {
    const task = orchestrator.createTaskForRequirement('REQ-1', 'Test Task', 'Description');
    const updated = orchestrator.updateTask(task.id, 'IN_PROGRESS');
    expect(updated).toBeDefined();
    expect(updated!.state).toBe('IN_PROGRESS');
  });
});
