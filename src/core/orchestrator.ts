import type { Project, Task, TaskState, Requirement, AgentMode } from '../types/index.js';
import { loadProject, createNewProject, saveProject } from './state.js';
import {
  createTask,
  updateTaskState,
  getNextRunnableTasks,
  areDependenciesMet,
  createRequirement,
} from './task-manager.js';
import { TaskExecutor, type TaskExecutionResult } from './task-executor.js';
import { ALL_REQUIREMENTS } from '../modules/requirements/assignment.js';
import { getBrowserManager, setBrowserManager } from './browser-manager.js';
import { registerBrowserTools } from '../tools/browser-tools.js';
import { logger } from './logger.js';
import { runSecurityAudit, hasCriticalSecurityIssues, getSecurityScore } from '../modules/security/auditor.js';

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
  actionRequiredTasks: number;
  percentComplete: number;
  stepsCompleted: StepResult[];
  nextSteps: string[];
}

export interface ExecutionLogEntry {
  timestamp: Date;
  taskId: string;
  taskTitle: string;
  action: string;
  status: 'EXECUTING' | 'SUCCESS' | 'FAILED' | 'ACTION_REQUIRED' | 'BLOCKED' | 'SKIPPED';
  details?: string;
}

export interface ExecutionReport {
  projectName: string;
  mode: AgentMode;
  startedAt: Date;
  finishedAt: Date;
  duration: number;
  totalTasks: number;
  completedTasks: number;
  failedTasks: number;
  actionRequiredTasks: number;
  blockedTasks: number;
  evidenceCaptured: string[];
  log: ExecutionLogEntry[];
}

export class Orchestrator {
  private project: Project | null = null;
  private stepHistory: StepResult[] = [];
  private executionLog: ExecutionLogEntry[] = [];
  private taskExecutor: TaskExecutor | null = null;

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
    const actionRequiredTasks = tasks.filter(t => t.state === 'ACTION_REQUIRED').length;

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
      actionRequiredTasks,
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
    console.log(`  Action Required: ${progress.actionRequiredTasks}`);

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

  loadRequirements(section?: 'Q1' | 'Q2' | 'ALL'): Requirement[] {
    const project = this.getProject();
    const existingIds = new Set(project.requirements.map(r => r.id));

    let requirements = ALL_REQUIREMENTS;
    if (section === 'Q1') {
      requirements = ALL_REQUIREMENTS.filter(r => r.id.startsWith('Q1'));
    } else if (section === 'Q2') {
      requirements = ALL_REQUIREMENTS.filter(r => r.id.startsWith('Q2'));
    }

    const loaded: Requirement[] = [];
    for (const req of requirements) {
      if (!existingIds.has(req.id)) {
        const created = createRequirement(
          project,
          req.section,
          req.title,
          req.description,
          req.priority,
          req.automatable,
          req.id,
        );
        loaded.push(created);
      } else {
        loaded.push(project.requirements.find(r => r.id === req.id)!);
      }
    }

    logger.info('Orchestrator', `Loaded ${loaded.length} requirements`);
    return loaded;
  }

  buildTaskGraph(requirements: Requirement[]): Task[] {
    const project = this.getProject();
    const tasks: Task[] = [];

    const taskDefinitions: Array<{
      reqId: string;
      title: string;
      description: string;
      depTitles: string[];
    }> = [];

    for (const req of requirements) {
      switch (req.id) {
        case 'Q1-R1':
          taskDefinitions.push(
            { reqId: req.id, title: 'Create Business Profile', description: 'Define business name, industry, location, target market', depTitles: [] },
            { reqId: req.id, title: 'Define 4Ps Marketing Mix', description: 'Set product, price, place, promotion', depTitles: ['Create Business Profile'] },
            { reqId: req.id, title: 'Define 4As Framework', description: 'Set acceptability, affordability, accessibility, awareness', depTitles: ['Create Business Profile'] },
            { reqId: req.id, title: 'Create Customer Persona', description: 'Define target customer demographics, interests, pain points', depTitles: ['Create Business Profile'] },
          );
          break;

        case 'Q1-R2':
          taskDefinitions.push(
            { reqId: req.id, title: 'Facebook Login', description: 'Log into Facebook account for page management', depTitles: [] },
            { reqId: req.id, title: 'Create Facebook Business Page', description: 'Create page with name, category, and basic info', depTitles: ['Facebook Login'] },
            { reqId: req.id, title: 'Configure Page Profile', description: 'Set profile photo, cover photo, about section, contact info', depTitles: ['Create Facebook Business Page'] },
            { reqId: req.id, title: 'Set Page CTA Button', description: 'Configure call-to-action button', depTitles: ['Configure Page Profile'] },
            { reqId: req.id, title: 'Configure Page Settings', description: 'Set visibility, messaging, roles, featured section', depTitles: ['Configure Page Profile'] },
          );
          break;

        case 'Q1-R3':
          taskDefinitions.push(
            { reqId: req.id, title: 'Access Professional Dashboard', description: 'Navigate to and configure professional dashboard', depTitles: ['Facebook Login'] },
            { reqId: req.id, title: 'Configure Page Access Roles', description: 'Set up admin, editor, moderator roles', depTitles: ['Access Professional Dashboard'] },
            { reqId: req.id, title: 'Link Instagram and WhatsApp', description: 'Connect linked accounts', depTitles: ['Access Professional Dashboard'] },
            { reqId: req.id, title: 'Set Audience Controls', description: 'Configure moderation, profanity filter, audience restrictions', depTitles: ['Access Professional Dashboard'] },
          );
          break;

        case 'Q1-R4':
          taskDefinitions.push(
            { reqId: req.id, title: 'Access Meta Business Suite', description: 'Navigate to Meta Business Suite', depTitles: ['Facebook Login'] },
            { reqId: req.id, title: 'Configure Inbox Automation', description: 'Set up auto-replies and messaging rules', depTitles: ['Access Meta Business Suite'] },
            { reqId: req.id, title: 'Set Up Content Planner', description: 'Configure content scheduling with weekly plan', depTitles: ['Access Meta Business Suite'] },
          );
          break;

        case 'Q1-R5':
          taskDefinitions.push(
            { reqId: req.id, title: 'Create Facebook Ads Campaign', description: 'Create campaign with objective, budget, audience', depTitles: ['Facebook Login'] },
            { reqId: req.id, title: 'Create Ad Set 1 - Interest Based', description: 'First ad set with interest-based targeting', depTitles: ['Create Facebook Ads Campaign'] },
            { reqId: req.id, title: 'Create Ad Set 2 - Lookalike', description: 'Second ad set with lookalike audience', depTitles: ['Create Facebook Ads Campaign'] },
            { reqId: req.id, title: 'Create Ads for Each Ad Set', description: 'Create ads with headlines, primary text, CTA', depTitles: ['Create Ad Set 1 - Interest Based', 'Create Ad Set 2 - Lookalike'] },
          );
          break;

        case 'Q1-R6':
          taskDefinitions.push(
            { reqId: req.id, title: 'Create Lead Generation Form', description: 'Set up instant form with fields, offer, CTA', depTitles: ['Create Facebook Ads Campaign'] },
            { reqId: req.id, title: 'Configure Follow-up Message', description: 'Set thank you and follow-up messages', depTitles: ['Create Lead Generation Form'] },
          );
          break;

        case 'Q1-R7':
          taskDefinitions.push(
            { reqId: req.id, title: 'Create A/B Test', description: 'Set up test with version A/B, KPI, evaluation criteria', depTitles: ['Create Facebook Ads Campaign'] },
          );
          break;

        case 'Q1-R8':
          taskDefinitions.push(
            { reqId: req.id, title: 'Collect Facebook Evidence', description: 'Capture screenshots of Page, Suite, Campaign, Ads, Form', depTitles: ['Configure Page Settings', 'Set Audience Controls', 'Set Up Content Planner', 'Create Ads for Each Ad Set', 'Configure Follow-up Message', 'Create A/B Test'] },
          );
          break;

        case 'Q2-R1':
          taskDefinitions.push(
            { reqId: req.id, title: 'LinkedIn Login', description: 'Log into LinkedIn account', depTitles: [] },
            { reqId: req.id, title: 'Optimize LinkedIn Profile Headline', description: 'Set professional headline with keywords', depTitles: ['LinkedIn Login'] },
            { reqId: req.id, title: 'Write LinkedIn About Section', description: 'Complete About section with service positioning', depTitles: ['Optimize LinkedIn Profile Headline'] },
            { reqId: req.id, title: 'Add Skills and Experience', description: 'Add relevant skills and work experience', depTitles: ['Write LinkedIn About Section'] },
          );
          break;

        case 'Q2-R2':
          taskDefinitions.push(
            { reqId: req.id, title: 'Create LinkedIn Company Page', description: 'Set up company/agency page with branding', depTitles: ['LinkedIn Login'] },
            { reqId: req.id, title: 'Configure Company Description', description: 'Add description, services, CTA', depTitles: ['Create LinkedIn Company Page'] },
          );
          break;

        case 'Q2-R3':
          taskDefinitions.push(
            { reqId: req.id, title: 'Create LinkedIn Lead Gen Campaign', description: 'Design campaign with objective, audience, budget', depTitles: ['Create LinkedIn Company Page'] },
            { reqId: req.id, title: 'Create LinkedIn Ad Creative', description: 'Set up ad copy and creative', depTitles: ['Create LinkedIn Lead Gen Campaign'] },
            { reqId: req.id, title: 'Create LinkedIn Lead Gen Form', description: 'Set up form with fields and offer', depTitles: ['Create LinkedIn Ad Creative'] },
          );
          break;

        case 'Q2-R4':
          taskDefinitions.push(
            { reqId: req.id, title: 'Define Audience Segment 1', description: 'Small business owners in Pakistan', depTitles: [] },
            { reqId: req.id, title: 'Define Audience Segment 2', description: 'Marketing managers in target industries', depTitles: [] },
          );
          break;

        case 'Q2-R5':
          taskDefinitions.push(
            { reqId: req.id, title: 'Generate AI Client Persona', description: 'Use AI to create client persona', depTitles: [] },
            { reqId: req.id, title: 'Generate 7-Day Content Plan', description: 'Create weekly content/outreach plan', depTitles: ['Generate AI Client Persona'] },
            { reqId: req.id, title: 'Generate Campaign Angle', description: 'Develop campaign messaging angle', depTitles: ['Generate AI Client Persona'] },
          );
          break;

        case 'Q2-R6':
          taskDefinitions.push(
            { reqId: req.id, title: 'Research Client Prospects', description: 'Find 10+ potential clients via LinkedIn, Facebook, directories', depTitles: ['Generate AI Client Persona'] },
            { reqId: req.id, title: 'Qualify Prospects', description: 'Evaluate and rank prospects by fit', depTitles: ['Research Client Prospects'] },
          );
          break;

        case 'Q2-R7':
          taskDefinitions.push(
            { reqId: req.id, title: 'Write Connection Message', description: 'Draft LinkedIn connection request', depTitles: ['Qualify Prospects'] },
            { reqId: req.id, title: 'Write First Outreach Message', description: 'Draft professional first outreach', depTitles: ['Qualify Prospects'] },
            { reqId: req.id, title: 'Write Follow-up Message', description: 'Draft follow-up message', depTitles: ['Write First Outreach Message'] },
          );
          break;

        case 'Q2-R8':
          taskDefinitions.push(
            { reqId: req.id, title: 'Define Campaign Metrics', description: 'Set KPIs for LinkedIn campaign', depTitles: ['Create LinkedIn Lead Gen Form'] },
            { reqId: req.id, title: 'Define Outreach Metrics', description: 'Set KPIs for outreach performance', depTitles: ['Write First Outreach Message'] },
            { reqId: req.id, title: 'Create Improvement Strategy', description: 'Document improvement approach', depTitles: ['Define Campaign Metrics', 'Define Outreach Metrics'] },
          );
          break;

        case 'Q2-R9':
          taskDefinitions.push(
            { reqId: req.id, title: 'Collect LinkedIn Evidence', description: 'Capture screenshots of profile, page, campaign, form', depTitles: ['Add Skills and Experience', 'Configure Company Description', 'Create LinkedIn Lead Gen Form', 'Write Follow-up Message', 'Create Improvement Strategy'] },
          );
          break;
      }
    }

    for (const def of taskDefinitions) {
      const task = this.createTaskForRequirement(def.reqId, def.title, def.description, []);
      tasks.push(task);
    }

    for (const def of taskDefinitions) {
      const task = tasks.find(t => t.title === def.title);
      if (!task) continue;

      const depIds: string[] = [];
      for (const depTitle of def.depTitles) {
        const depTask = tasks.find(t => t.title === depTitle);
        if (depTask) {
          depIds.push(depTask.id);
        }
      }

      if (depIds.length > 0) {
        task.dependencies = depIds;
        task.updatedAt = new Date();
      }
    }

    saveProject(project, 'build_task_graph');
    logger.info('Orchestrator', `Built task graph: ${tasks.length} tasks from ${requirements.length} requirements`);
    return tasks;
  }

  async executeProject(mode: AgentMode = 'DEMO_MODE', section?: 'Q1' | 'Q2' | 'ALL'): Promise<ExecutionReport> {
    const startTime = new Date();
    const allEvidence: string[] = [];

    this.taskExecutor = new TaskExecutor({ mode });
    const project = this.getProject();

    logger.info('Orchestrator', `Starting project execution in ${mode} mode`);

    // Run security audit before execution
    const securityChecks = runSecurityAudit(process.cwd());
    const securityScore = getSecurityScore(securityChecks);
    const hasCritical = hasCriticalSecurityIssues(securityChecks);

    if (hasCritical) {
      logger.warn('Orchestrator', 'Critical security issues detected - review recommended');
      this.printLog(`Security Score: ${securityScore}/100 - Critical issues found`);
    } else {
      logger.info('Orchestrator', `Security audit passed: ${securityScore}/100`);
    }

    if (mode === 'LIVE_MODE') {
      this.printLog('LIVE_MODE: Initializing browser...');
      try {
        registerBrowserTools();
        const browser = getBrowserManager({
          headless: false,
          profileName: 'linkedin-session',
        });
        await browser.launch();
        setBrowserManager(browser);
        this.printLog('Browser launched successfully');
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        logger.error('Orchestrator', `Browser launch failed: ${errorMsg}`);
        this.printLog(`Browser launch failed: ${errorMsg}`);
        this.printLog('LIVE_MODE requires a working browser. Cannot continue.');
        return {
          projectName: project.name,
          mode,
          startedAt: startTime,
          finishedAt: new Date(),
          duration: Date.now() - startTime.getTime(),
          totalTasks: 0,
          completedTasks: 0,
          failedTasks: 0,
          actionRequiredTasks: 0,
          blockedTasks: 0,
          evidenceCaptured: [],
          log: [],
        };
      }
    }

    this.printLog('Loading requirements...');
    const requirements = this.loadRequirements(section);
    this.printLog(`Loaded ${requirements.length} requirements`);

    this.printLog('Building task graph...');
    const tasks = this.buildTaskGraph(requirements);
    this.printLog(`Created ${tasks.length} tasks`);

    this.printExecutionBanner(tasks.length);

    let completedCount = 0;
    let failedCount = 0;
    let actionRequiredCount = 0;
    let blockedCount = 0;

    const maxIterations = tasks.length * 5;
    let iteration = 0;

    while (iteration < maxIterations) {
      iteration++;
      const runnableTasks = getNextRunnableTasks(project);

      if (runnableTasks.length === 0) {
        const pendingTasks = project.tasks.filter(t => t.state === 'PENDING');
        const inProgressTasks = project.tasks.filter(t => t.state === 'IN_PROGRESS');

        if (pendingTasks.length === 0 && inProgressTasks.length === 0) {
          break;
        }

        if (inProgressTasks.length > 0) {
          logger.warn('Orchestrator', `${inProgressTasks.length} tasks stuck in IN_PROGRESS`);
          for (const t of inProgressTasks) {
            updateTaskState(project, t.id, 'FAILED');
            failedCount++;
          }
          continue;
        }

        for (const t of pendingTasks) {
          if (!areDependenciesMet(project, t)) {
            updateTaskState(project, t.id, 'BLOCKED');
            blockedCount++;
          }
        }
        break;
      }

      for (const task of runnableTasks) {
        const taskIndex = project.tasks.indexOf(task) + 1;
        this.printTaskStart(taskIndex, tasks.length, task.title);

        const logEntry: ExecutionLogEntry = {
          timestamp: new Date(),
          taskId: task.id,
          taskTitle: task.title,
          action: 'EXECUTING',
          status: 'EXECUTING',
        };
        this.executionLog.push(logEntry);

        try {
          const result = await this.taskExecutor.executeTask(project, task);

          if (result.state === 'ACTION_REQUIRED') {
            actionRequiredCount++;
            logEntry.status = 'ACTION_REQUIRED';
            logEntry.details = result.error;
            this.printTaskActionRequired(task.title, result.error || 'User action needed');
          } else if (result.success) {
            completedCount++;
            logEntry.status = 'SUCCESS';
            allEvidence.push(...result.evidenceCaptured);
            this.printTaskSuccess(task.title);
          } else {
            failedCount++;
            logEntry.status = 'FAILED';
            logEntry.details = result.error;
            this.printTaskFailed(task.title, result.error || 'Unknown error');
          }
        } catch (err) {
          failedCount++;
          logEntry.status = 'FAILED';
          logEntry.details = err instanceof Error ? err.message : String(err);
          this.printTaskFailed(task.title, logEntry.details);
        }

        saveProject(project, `execute_task_${task.id}`);
      }
    }

    const finishedAt = new Date();
    const report: ExecutionReport = {
      projectName: project.name,
      mode,
      startedAt: startTime,
      finishedAt,
      duration: finishedAt.getTime() - startTime.getTime(),
      totalTasks: tasks.length,
      completedTasks: completedCount,
      failedTasks: failedCount,
      actionRequiredTasks: actionRequiredCount,
      blockedTasks: blockedCount,
      evidenceCaptured: allEvidence,
      log: this.executionLog,
    };

    if (mode === 'LIVE_MODE') {
      try {
        const browser = getBrowserManager();
        if (browser.isLaunched()) {
          await browser.close();
          this.printLog('Browser closed');
        }
      } catch {
        // ignore close errors
      }
    }

    return report;
  }

  approveTask(taskId: string): boolean {
    const project = this.getProject();
    const task = project.tasks.find(t => t.id === taskId);
    if (!task || task.state !== 'ACTION_REQUIRED') return false;

    updateTaskState(project, task.id, 'PENDING');
    logger.info('Orchestrator', `Task ${task.title} approved, resuming`);
    return true;
  }

  resumeExecution(mode: AgentMode = 'DEMO_MODE'): Promise<ExecutionReport> {
    logger.info('Orchestrator', 'Resuming execution from last state');
    const project = this.getProject();
    const actionRequiredTasks = project.tasks.filter(t => t.state === 'ACTION_REQUIRED');
    for (const task of actionRequiredTasks) {
      updateTaskState(project, task.id, 'PENDING');
      logger.info('Orchestrator', `Reset task "${task.title}" from ACTION_REQUIRED to PENDING for resume`);
    }
    return this.executeProject(mode);
  }

  getExecutionLog(): ExecutionLogEntry[] {
    return [...this.executionLog];
  }

  private printLog(message: string): void {
    console.log(`[AGENT] ${message}`);
  }

  private printExecutionBanner(totalTasks: number): void {
    console.log('\n' + '='.repeat(60));
    console.log('HUNARMAND PUNJAB AI AGENT');
    console.log('='.repeat(60));
    console.log(`Starting execution of ${totalTasks} tasks`);
    console.log('='.repeat(60) + '\n');
  }

  private printTaskStart(index: number, total: number, title: string): void {
    console.log(`[${index}/${total}] ${title} → EXECUTING`);
  }

  private printTaskSuccess(title: string): void {
    console.log(`  ✓ ${title} → SUCCESS`);
  }

  private printTaskFailed(title: string, error: string): void {
    console.log(`  ✗ ${title} → FAILED: ${error}`);
  }

  private printTaskActionRequired(title: string, instruction: string): void {
    console.log(`  ⚠ ${title} → ACTION_REQUIRED`);
    console.log(`    ${instruction.split('\n')[0]}`);
  }

}

export const orchestrator = new Orchestrator();
