import type { Task, Requirement, AgentMode } from '../types/index.js';
import type { ExecutionReport } from './orchestrator.js';

export function printBanner(): void {
  console.log('');
  console.log('='.repeat(60));
  console.log('  HUNARMAND PUNJAB - AI DIGITAL MARKETING AGENT');
  console.log('  Batch-3 | Facebook/Meta + LinkedIn Assignment');
  console.log('='.repeat(60));
  console.log('');
}

export function printAgentHeader(mode: AgentMode, section: string): void {
  console.log('');
  console.log('='.repeat(60));
  console.log('DIGITAL MARKETING AGENT');
  console.log('='.repeat(60));
  console.log(`Mode: ${mode}`);
  console.log(`Section: ${section === 'ALL' ? 'Q1 + Q2 (Full Assignment)' : section}`);
  console.log('='.repeat(60));
  console.log('');
}

export function printRequirementPlan(requirements: Requirement[], tasks: Task[]): void {
  console.log('REQUIREMENTS:');
  for (const req of requirements) {
    const reqTasks = tasks.filter(t => t.requirementId === req.id);
    console.log(`  ${req.id} - ${req.title} (${reqTasks.length} tasks)`);
  }
  console.log('');
  console.log(`Total: ${requirements.length} requirements, ${tasks.length} tasks`);
  console.log('');
}

export function printTaskQueue(tasks: Task[]): void {
  console.log('EXECUTION QUEUE:');
  console.log('-'.repeat(60));
  for (let i = 0; i < tasks.length; i++) {
    const task = tasks[i];
    const status = formatTaskState(task.state);
    console.log(`  [${i + 1}/${tasks.length}] ${task.title} ${status}`);
  }
  console.log('-'.repeat(60));
  console.log('');
}

export function printTaskStart(index: number, total: number, title: string): void {
  console.log(`[${index}/${total}] ${title} → RUNNING`);
}

export function printTaskComplete(title: string): void {
  console.log(`  ✓ ${title} → COMPLETED`);
}

export function printTaskSimulated(title: string): void {
  console.log(`  ~ ${title} → SIMULATED`);
}

export function printTaskFailed(title: string, error: string): void {
  console.log(`  ✗ ${title} → FAILED: ${error}`);
}

export function printActionRequired(title: string, instruction: string): void {
  console.log('');
  console.log('ACTION REQUIRED');
  console.log('-'.repeat(60));
  console.log(`Task: ${title}`);
  console.log(`Reason: ${instruction.split('\n')[0]}`);
  console.log('');
  console.log('What you need to do:');
  console.log('  1. Complete the action in the opened browser.');
  console.log('  2. Return to this terminal.');
  console.log('  3. Run:');
  console.log('');
  console.log('    npm run agent -- --resume');
  console.log('');
  console.log('-'.repeat(60));
  console.log('');
}

export function printApprovalRequired(title: string, details: Record<string, unknown>): void {
  console.log('');
  console.log('APPROVAL REQUIRED');
  console.log('-'.repeat(60));
  console.log(`Action: ${title}`);
  for (const [key, value] of Object.entries(details)) {
    if (key !== 'simulated' && key !== 'status') {
      console.log(`  ${key}: ${String(value).substring(0, 100)}`);
    }
  }
  console.log('-'.repeat(60));
  console.log('');
}

export function printExecutionSummary(report: ExecutionReport): void {
  console.log('');
  console.log('='.repeat(60));
  console.log('EXECUTION COMPLETE');
  console.log('='.repeat(60));
  console.log(`Project: ${report.projectName}`);
  console.log(`Mode: ${report.mode}`);
  console.log(`Duration: ${(report.duration / 1000).toFixed(1)}s`);
  console.log('');
  console.log('Results:');
  console.log(`  Total: ${report.totalTasks}`);
  console.log(`  Completed: ${report.completedTasks}`);
  console.log(`  Failed: ${report.failedTasks}`);
  console.log(`  Action Required: ${report.actionRequiredTasks}`);
  console.log(`  Blocked: ${report.blockedTasks}`);
  if (report.evidenceCaptured.length > 0) {
    console.log(`  Evidence: ${report.evidenceCaptured.length} screenshots`);
  }
  console.log('='.repeat(60));
  console.log('');
}

export function printFinalReport(report: ExecutionReport, tasks: Task[]): void {
  console.log('');
  console.log('='.repeat(60));
  console.log('FINAL ASSIGNMENT REPORT');
  console.log('='.repeat(60));
  console.log('');

  const completed = tasks.filter(t => t.state === 'COMPLETED' || t.state === 'VERIFIED');
  const simulated = tasks.filter(t => t.state === 'COMPLETED');
  const actionRequired = tasks.filter(t => t.state === 'ACTION_REQUIRED');
  const failed = tasks.filter(t => t.state === 'FAILED');
  const blocked = tasks.filter(t => t.state === 'BLOCKED');

  console.log('Summary:');
  console.log(`  Mode: ${report.mode}`);
  console.log(`  Duration: ${(report.duration / 1000).toFixed(1)}s`);
  console.log('');

  console.log('Tasks:');
  console.log(`  Total: ${tasks.length}`);
  console.log(`  Completed: ${completed.length}`);
  console.log(`  Action Required: ${actionRequired.length}`);
  console.log(`  Failed: ${failed.length}`);
  console.log(`  Blocked: ${blocked.length}`);
  console.log('');

  if (report.evidenceCaptured.length > 0) {
    console.log('Evidence Captured:');
    for (const e of report.evidenceCaptured) {
      console.log(`  ✓ ${e}`);
    }
    console.log('');
  }

  if (actionRequired.length > 0) {
    console.log('Tasks Requiring User Action:');
    for (const t of actionRequired) {
      console.log(`  ⚠ ${t.title}`);
    }
    console.log('');
    console.log('Run with --resume after completing these tasks.');
    console.log('');
  }

  console.log('='.repeat(60));
  console.log('');
}

export function formatTaskState(state: string): string {
  switch (state) {
    case 'COMPLETED':
    case 'VERIFIED':
      return '\x1b[32m✓\x1b[0m';
    case 'RUNNING':
    case 'IN_PROGRESS':
      return '\x1b[34m→\x1b[0m';
    case 'ACTION_REQUIRED':
      return '\x1b[35m⚠\x1b[0m';
    case 'APPROVAL_REQUIRED':
      return '\x1b[33m🔒\x1b[0m';
    case 'FAILED':
      return '\x1b[31m✗\x1b[0m';
    case 'BLOCKED':
      return '\x1b[90m⊘\x1b[0m';
    default:
      return '\x1b[37m○\x1b[0m';
  }
}
