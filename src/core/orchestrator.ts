import type { Project } from '../types/index.js';
import { loadProject, createNewProject } from './state.js';
import { getNextRunnableTasks } from './task-manager.js';
import { logger } from './logger.js';

export class Orchestrator {
  private project: Project | null = null;

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

  async executeStep(stepName: string, executor: () => Promise<void>): Promise<void> {
    logger.info('Orchestrator', `Starting step: ${stepName}`);
    try {
      await executor();
      logger.info('Orchestrator', `Completed step: ${stepName}`);
    } catch (error) {
      logger.error('Orchestrator', `Failed step: ${stepName}`, error as Error);
      throw error;
    }
  }

  getStatus(): {
    projectName: string;
    projectStatus: string;
    totalTasks: number;
    tasksByState: Record<string, number>;
    nextRunnable: number;
  } {
    const project = this.getProject();
    const tasksByState: Record<string, number> = {};

    for (const task of project.tasks) {
      tasksByState[task.state] = (tasksByState[task.state] || 0) + 1;
    }

    return {
      projectName: project.name,
      projectStatus: project.status,
      totalTasks: project.tasks.length,
      tasksByState,
      nextRunnable: getNextRunnableTasks(project).length,
    };
  }

  reportStep(
    step: string,
    files: string[],
    testResult: 'PASS' | 'FAIL' | 'SKIP',
    commitHash?: string,
    pushed: boolean = false
  ): void {
    console.log('\n' + '='.repeat(60));
    console.log(`STEP: ${step}`);
    console.log('FILES:');
    files.forEach(f => console.log(`  - ${f}`));
    console.log(`TEST: ${testResult}`);
    console.log(`GIT: ${commitHash || 'NOT COMMITTED'}`);
    console.log(`GITHUB: ${pushed ? 'PUSHED' : 'NOT PUSHED'}`);
    console.log('='.repeat(60) + '\n');
  }
}

export const orchestrator = new Orchestrator();
