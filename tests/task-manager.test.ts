import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { existsSync, rmSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import {
  createNewProject,
  loadProject,
  saveProject,
} from '../src/core/state.js';
import {
  createTask,
  updateTaskState,
  getTasksByState,
  getTasksByRequirement,
  areDependenciesMet,
  getNextRunnableTasks,
  createRequirement,
} from '../src/core/task-manager.js';
import type { Project } from '../src/types/index.js';

const TEST_DATA_DIR = join(process.cwd(), 'data');

describe('Task Manager', () => {
  let project: Project;

  beforeEach(() => {
    if (!existsSync(TEST_DATA_DIR)) {
      mkdirSync(TEST_DATA_DIR, { recursive: true });
    }
    project = createNewProject('Test Project', 'Test Description');
  });

  afterEach(() => {
    const projectFile = join(TEST_DATA_DIR, 'project.json');
    if (existsSync(projectFile)) {
      rmSync(projectFile);
    }
  });

  it('should create a task', () => {
    const task = createTask(project, 'REQ-1', 'Test Task', 'Test Description');
    expect(task).toBeDefined();
    expect(task.title).toBe('Test Task');
    expect(task.state).toBe('PENDING');
    expect(project.tasks).toHaveLength(1);
  });

  it('should update task state', () => {
    const task = createTask(project, 'REQ-1', 'Test Task', 'Test Description');
    const updated = updateTaskState(project, task.id, 'IN_PROGRESS');
    expect(updated).toBeDefined();
    expect(updated!.state).toBe('IN_PROGRESS');
  });

  it('should get tasks by state', () => {
    createTask(project, 'REQ-1', 'Task 1', 'Desc 1');
    createTask(project, 'REQ-1', 'Task 2', 'Desc 2');
    const pendingTasks = getTasksByState(project, 'PENDING');
    expect(pendingTasks).toHaveLength(2);
  });

  it('should check dependencies', () => {
    const task1 = createTask(project, 'REQ-1', 'Task 1', 'Desc 1');
    const task2 = createTask(project, 'REQ-1', 'Task 2', 'Desc 2', [task1.id]);

    expect(areDependenciesMet(project, task2)).toBe(false);

    updateTaskState(project, task1.id, 'COMPLETED');
    expect(areDependenciesMet(project, task2)).toBe(true);
  });

  it('should get next runnable tasks', () => {
    const task1 = createTask(project, 'REQ-1', 'Task 1', 'Desc 1');
    const task2 = createTask(project, 'REQ-1', 'Task 2', 'Desc 2', [task1.id]);

    let runnable = getNextRunnableTasks(project);
    expect(runnable).toHaveLength(1);
    expect(runnable[0].id).toBe(task1.id);

    updateTaskState(project, task1.id, 'COMPLETED');
    runnable = getNextRunnableTasks(project);
    expect(runnable).toHaveLength(1);
    expect(runnable[0].id).toBe(task2.id);
  });

  it('should create a requirement', () => {
    const req = createRequirement(project, 'Q1', 'Test Requirement', 'Description');
    expect(req).toBeDefined();
    expect(req.id).toBe('REQ-1');
    expect(project.requirements).toHaveLength(1);
  });
});
