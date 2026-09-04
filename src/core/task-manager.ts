import type { Task, TaskState, Requirement, Project } from '../types/index.js';
import { saveProject } from './state.js';
import { logger } from './logger.js';

export function createTask(
  project: Project,
  requirementId: string,
  title: string,
  description: string,
  dependencies: string[] = []
): Task {
  const task: Task = {
    id: crypto.randomUUID(),
    requirementId,
    title,
    description,
    state: 'PENDING',
    dependencies,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  project.tasks.push(task);
  saveProject(project);
  logger.info('TaskManager', `Created task: ${title} (${task.id})`);
  return task;
}

export function updateTaskState(
  project: Project,
  taskId: string,
  newState: TaskState
): Task | null {
  const task = project.tasks.find(t => t.id === taskId);
  if (!task) {
    logger.error('TaskManager', `Task not found: ${taskId}`);
    return null;
  }

  const oldState = task.state;
  task.state = newState;
  task.updatedAt = new Date();

  if (newState === 'COMPLETED' || newState === 'VERIFIED') {
    task.completedAt = new Date();
  }

  saveProject(project);
  logger.info('TaskManager', `Task "${task.title}" state: ${oldState} -> ${newState}`);
  return task;
}

export function getTasksByState(project: Project, state: TaskState): Task[] {
  return project.tasks.filter(t => t.state === state);
}

export function getTasksByRequirement(project: Project, requirementId: string): Task[] {
  return project.tasks.filter(t => t.requirementId === requirementId);
}

export function areDependenciesMet(project: Project, task: Task): boolean {
  return task.dependencies.every(depId => {
    const dep = project.tasks.find(t => t.id === depId);
    return dep && (dep.state === 'COMPLETED' || dep.state === 'VERIFIED');
  });
}

export function getNextRunnableTasks(project: Project): Task[] {
  return project.tasks.filter(
    t => t.state === 'PENDING' && areDependenciesMet(project, t)
  );
}

export function createRequirement(
  project: Project,
  section: string,
  title: string,
  description: string,
  priority: 'high' | 'medium' | 'low' = 'medium',
  automatable: boolean = true,
  id?: string,
): Requirement {
  const requirement: Requirement = {
    id: id || `REQ-${project.requirements.length + 1}`,
    section,
    title,
    description,
    priority,
    automatable,
    tasks: [],
  };
  project.requirements.push(requirement);
  saveProject(project);
  logger.info('TaskManager', `Created requirement: ${title} (${requirement.id})`);
  return requirement;
}
