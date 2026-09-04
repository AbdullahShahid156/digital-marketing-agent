import type { Project, Task, TaskState } from '../types/index.js';
import { loadProject, createNewProject } from './state.js';
import {
  createTask,
  updateTaskState,
  getNextRunnableTasks,
} from './task-manager.js';
import { logger } from './logger.js';

export interface StepResult {
  stepName: string;
  status: 'SUCCESS' | 'FAILED' | 'SKIPPED';
  duration: number;
  error?: Error;
  files: string[];
  testsPassed?: number;
  testsFailed?: number;
  commitHash?: string;
  pushed: boolean;
}

export interface ProgressReport {
  projectName: string;
  projectStatus: string;
  totalTasks: number;
  completedTasks: number;
  failedTasks: number;
  pendingTasks: number;
  blockedTasks: number;
  percentComplete: number;
  stepsCompleted: StepResult[];
  nextSteps: string[];
}

export class Orchestrator {
  private project: Project | null = null;
  private stepHistory: StepResult[] = [];

  async initialize(): Promise<Project> {
    logger.info('Orchestrator', 'Initializing system...');
    this.project = loadProject();

    if (!this.project) {
      logger.info('Orchestrator', 'Creating new project');
      this.project = createNewProject(
        'Hunarmand Punjab Digital Marketing Project',
        'AI-powered Digital Marketing Project Agent for Hunarmand Punjab Batch-3'
      );
    }

    logger.info('Orchestrator', `Project loaded: ${this.project.name}`);
    return this.project;
  }

  getProject(): Project {
    if (!this.project) {
      throw new Error('Project not initialized. Call initialize() first.');
    }
    return this.project;
  }

  async executeStep(
    stepName: string,
    executor: () => Promise<string[]>
  ): Promise<StepResult> {
    const startTime = Date.now();
    logger.info('Orchestrator', `Starting step: ${stepName}`);

    try {
      const files = await executor();
      const duration = Date.now() - startTime;

      const result: StepResult = {
        stepName,
        status: 'SUCCESS',
        duration,
        files,
        pushed: false,
      };

      this.stepHistory.push(result);
      logger.info('Orchestrator', `Completed step: ${stepName} in ${duration}ms`);
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      const result: StepResult = {
        stepName,
        status: 'FAILED',
        duration,
        error: error as Error,
        files: [],
        pushed: false,
      };

      this.stepHistory.push(result);
      logger.error('Orchestrator', `Failed step: ${stepName}`, error as Error);
      return result;
    }
  }

  createTaskForRequirement(
    requirementId: string,
    title: string,
    description: string,
    dependencies: string[] = []
  ): Task {
    const project = this.getProject();
    return createTask(project, requirementId, title, description, dependencies);
  }

  updateTask(taskId: string, newState: TaskState): Task | null {
    const project = this.getProject();
    return updateTaskState(project, taskId, newState);
  }

  getProgress(): ProgressReport {
    const project = this.getProject();
    const tasks = project.tasks;
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(t => t.state === 'COMPLETED' || t.state === 'VERIFIED').length;
    const failedTasks = tasks.filter(t => t.state === 'FAILED').length;
    const pendingTasks = tasks.filter(t => t.state === 'PENDING').length;
    const blockedTasks = tasks.filter(t => t.state === 'BLOCKED').length;

    const percentComplete = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

    const nextRunnable = getNextRunnableTasks(project);

    return {
      projectName: project.name,
      projectStatus: project.status,
      totalTasks,
      completedTasks,
      failedTasks,
      pendingTasks,
      blockedTasks,
      percentComplete,
      stepsCompleted: this.stepHistory.filter(s => s.status === 'SUCCESS'),
      nextSteps: nextRunnable.map(t => t.title),
    };
  }

  report(): void {
    const progress = this.getProgress();

    console.log('\n' + '='.repeat(60));
    console.log('PROJECT PROGRESS REPORT');
    console.log('='.repeat(60));
    console.log(`Project: ${progress.projectName}`);
    console.log(`Status: ${progress.projectStatus}`);
    console.log(`Progress: ${progress.percentComplete.toFixed(1)}%`);
    console.log('\nTasks:');
    console.log(`  Total: ${progress.totalTasks}`);
    console.log(`  Completed: ${progress.completedTasks}`);
    console.log(`  Failed: ${progress.failedTasks}`);
    console.log(`  Pending: ${progress.pendingTasks}`);
    console.log(`  Blocked: ${progress.blockedTasks}`);

    if (progress.stepsCompleted.length > 0) {
      console.log('\nSteps Completed:');
      for (const step of progress.stepsCompleted) {
        console.log(`  [OK] ${step.stepName} (${step.duration}ms)`);
      }
    }

    if (progress.nextSteps.length > 0) {
      console.log('\nNext Steps:');
      for (const step of progress.nextSteps) {
        console.log(`  [ ] ${step}`);
      }
    }

    console.log('='.repeat(60) + '\n');
  }

  stepReport(result: StepResult): void {
    console.log('\n' + '-'.repeat(60));
    console.log(`STEP: ${result.stepName}`);
    console.log(`STATUS: ${result.status}`);
    console.log(`DURATION: ${result.duration}ms`);
    console.log('FILES:');
    result.files.forEach(f => console.log(`  - ${f}`));
    if (result.error) {
      console.log(`ERROR: ${result.error.message}`);
    }
    console.log(`GIT: ${result.commitHash || 'NOT COMMITTED'}`);
    console.log(`GITHUB: ${result.pushed ? 'PUSHED' : 'NOT PUSHED'}`);
    console.log('-'.repeat(60) + '\n');
  }
}

export const orchestrator = new Orchestrator();
