import { orchestrator } from '../core/orchestrator.js';
import { parseNaturalLanguage, formatDetectedPlan } from '../core/nlp.js';
import {
  printBanner,
  printAgentHeader,
  printRequirementPlan,
  printActionRequired,
  printFinalReport,
  formatTaskState,
} from '../core/display.js';
import { logger, setLogLevel, LogLevel } from '../core/logger.js';
import type { AgentMode } from '../types/index.js';

export interface CLIOptions {
  mode?: AgentMode;
  section?: string;
  resume?: boolean;
  dryRun?: boolean;
  verbose?: boolean;
  quiet?: boolean;
  json?: boolean;
}

export type CLICommand = 'run' | 'status' | 'report' | 'tasks' | 'help' | 'version';

export interface ParsedCLI {
  command: CLICommand;
  options: CLIOptions;
  args: string[];
}

const COMMANDS: Record<CLICommand, string> = {
  run: 'Execute assignment tasks',
  status: 'Show current project progress',
  report: 'Generate assignment report',
  tasks: 'List all tasks with status',
  help: 'Show help message',
  version: 'Show version info',
};

export function parseCLIArgs(argv: string[]): ParsedCLI {
  const args = argv.slice(2);
  let command: CLICommand = 'run';
  const options: CLIOptions = {};
  const extraArgs: string[] = [];

  if (args.length === 0) {
    return { command: 'help', options: {}, args: [] };
  }

  const firstArg = args[0].toLowerCase();

  if (firstArg in COMMANDS && firstArg !== 'run') {
    command = firstArg as CLICommand;
    args.shift();
  } else if (firstArg.startsWith('-')) {
    command = 'run';
  } else if (!firstArg.startsWith('-')) {
    if (firstArg in COMMANDS) {
      command = firstArg as CLICommand;
      args.shift();
    } else {
      extraArgs.push(args.shift()!);
    }
  }

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    switch (arg) {
      case '--mode':
      case '-m':
        if (args[i + 1]) {
          const val = args[i + 1].toUpperCase() as AgentMode;
          if (val === 'DEMO_MODE' || val === 'LIVE_MODE') {
            options.mode = val;
          }
          i++;
        }
        break;
      case '--section':
      case '-s':
        if (args[i + 1]) {
          options.section = args[i + 1].toUpperCase();
          i++;
        }
        break;
      case '--resume':
      case '-r':
        options.resume = true;
        break;
      case '--dry-run':
      case '-d':
        options.dryRun = true;
        break;
      case '--verbose':
      case '-v':
        options.verbose = true;
        break;
      case '--quiet':
      case '-q':
        options.quiet = true;
        break;
      case '--json':
      case '-j':
        options.json = true;
        break;
      case '--help':
      case '-h':
        command = 'help';
        break;
      case '--version':
        command = 'version';
        break;
      default:
        extraArgs.push(arg);
        break;
    }
  }

  return { command, options, args: extraArgs };
}

export function printCLIBanner(): void {
  console.log('');
  console.log('\x1b[36m' + '='.repeat(60) + '\x1b[0m');
  console.log('\x1b[36m  HUNARMAND PUNJAB - AI DIGITAL MARKETING AGENT\x1b[0m');
  console.log('\x1b[36m  Batch-3 | Facebook/Meta + LinkedIn Assignment\x1b[0m');
  console.log('\x1b[36m' + '='.repeat(60) + '\x1b[0m');
  console.log('');
}

export function printCLIHelp(): void {
  printCLIBanner();
  console.log('\x1b[1mUsage:\x1b[0m');
  console.log('  agent <command> [options]');
  console.log('');
  console.log('\x1b[1mCommands:\x1b[0m');
  for (const [cmd, desc] of Object.entries(COMMANDS)) {
    console.log(`  \x1b[33m${cmd.padEnd(12)}\x1b[0m ${desc}`);
  }
  console.log('');
  console.log('\x1b[1mOptions:\x1b[0m');
  console.log('  \x1b[33m--mode, -m\x1b[0m <mode>    Execution mode: DEMO_MODE (default) or LIVE_MODE');
  console.log('  \x1b[33m--section, -s\x1b[0m <sec>  Section to run: ALL (default), Q1, or Q2');
  console.log('  \x1b[33m--resume, -r\x1b[0m         Resume from last execution state');
  console.log('  \x1b[33m--dry-run, -d\x1b[0m        Print plan only, do not execute');
  console.log('  \x1b[33m--verbose, -v\x1b[0m        Enable debug logging');
  console.log('  \x1b[33m--quiet, -q\x1b[0m          Suppress non-essential output');
  console.log('  \x1b[33m--json, -j\x1b[0m           Output in JSON format');
  console.log('  \x1b[33m--help, -h\x1b[0m           Show this help message');
  console.log('  \x1b[33m--version\x1b[0m            Show version info');
  console.log('');
  console.log('\x1b[1mExamples:\x1b[0m');
  console.log('  agent run                          Run all tasks in DEMO_MODE');
  console.log('  agent run --mode LIVE_MODE         Run all tasks in LIVE_MODE');
  console.log('  agent run --section Q1             Run only Facebook/Meta tasks');
  console.log('  agent run --section Q2             Run only LinkedIn tasks');
  console.log('  agent run --resume                 Resume from previous state');
  console.log('  agent run --dry-run                Print plan without executing');
  console.log('  agent status                       Show current progress');
  console.log('  agent report                       Generate assignment report');
  console.log('  agent tasks                        List all tasks');
  console.log('  agent tasks --section Q2           List Q2 tasks only');
  console.log('');
  console.log('\x1b[1mNatural Language:\x1b[0m');
  console.log('  You can also type natural language commands:');
  console.log('  "Complete my LinkedIn assignment"');
  console.log('  "Do Q1 Facebook tasks"');
  console.log('  "Run everything in live mode"');
  console.log('  "Resume where I left off"');
  console.log('');
}

export function printVersion(): void {
  console.log('hunarmand-punjab-marketing-agent v1.0.0');
  console.log('AI-powered Digital Marketing Project Agent');
}

export async function executeStatus(options: CLIOptions): Promise<void> {
  await orchestrator.initialize();
  const project = orchestrator.getProject();
  const progress = orchestrator.getProgress();

  if (options.json) {
    console.log(JSON.stringify(progress, null, 2));
    return;
  }

  printCLIBanner();
  console.log('\x1b[1mProject Status:\x1b[0m');
  console.log(`  Name: ${project.name}`);
  console.log(`  Status: ${project.status}`);
  console.log('');
  console.log('\x1b[1mProgress:\x1b[0m');
  console.log(`  Total Tasks: ${progress.totalTasks}`);
  console.log(`  Completed: \x1b[32m${progress.completedTasks}\x1b[0m`);
  console.log(`  Failed: \x1b[31m${progress.failedTasks}\x1b[0m`);
  console.log(`  Pending: \x1b[33m${progress.pendingTasks}\x1b[0m`);
  console.log(`  Blocked: \x1b[90m${progress.blockedTasks}\x1b[0m`);
  console.log(`  Action Required: \x1b[35m${progress.actionRequiredTasks}\x1b[0m`);
  console.log('');
  console.log(`  Progress: ${progress.percentComplete.toFixed(1)}%`);
  console.log('');

  if (progress.nextSteps.length > 0) {
    console.log('\x1b[1mNext Steps:\x1b[0m');
    for (const step of progress.nextSteps) {
      console.log(`  → ${step}`);
    }
    console.log('');
  }
}

export async function executeTasks(options: CLIOptions): Promise<void> {
  await orchestrator.initialize();
  const project = orchestrator.getProject();
  let tasks = project.tasks;

  const section = options.section || 'ALL';
  if (section !== 'ALL') {
    tasks = tasks.filter(t => t.requirementId.startsWith(section));
  }

  if (options.json) {
    console.log(JSON.stringify(tasks, null, 2));
    return;
  }

  printCLIBanner();
  console.log(`\x1b[1mTasks (${section}):\x1b[0m`);
  console.log('');

  const grouped = new Map<string, typeof tasks>();
  for (const task of tasks) {
    const reqId = task.requirementId;
    if (!grouped.has(reqId)) {
      grouped.set(reqId, []);
    }
    grouped.get(reqId)!.push(task);
  }

  for (const [reqId, reqTasks] of grouped) {
    console.log(`\x1b[33m${reqId}\x1b[0m`);
    for (const task of reqTasks) {
      const state = formatTaskState(task.state);
      const deps = task.dependencies.length > 0 ? ` (deps: ${task.dependencies.join(', ')})` : '';
      console.log(`  ${state} ${task.title}${deps}`);
    }
    console.log('');
  }
}

export async function executeReport(options: CLIOptions): Promise<void> {
  await orchestrator.initialize();
  const project = orchestrator.getProject();
  const progress = orchestrator.getProgress();

  if (options.json) {
    const report = {
      project: project.name,
      status: project.status,
      progress: progress.percentComplete,
      tasks: {
        total: progress.totalTasks,
        completed: progress.completedTasks,
        failed: progress.failedTasks,
        pending: progress.pendingTasks,
        blocked: progress.blockedTasks,
        actionRequired: progress.actionRequiredTasks,
      },
    };
    console.log(JSON.stringify(report, null, 2));
    return;
  }

  printCLIBanner();
  console.log('\x1b[1mAssignment Report:\x1b[0m');
  console.log('');
  console.log(`Project: ${project.name}`);
  console.log(`Status: ${project.status}`);
  console.log(`Progress: ${progress.percentComplete.toFixed(1)}%`);
  console.log('');
  console.log('Task Summary:');
  console.log(`  Total: ${progress.totalTasks}`);
  console.log(`  Completed: \x1b[32m${progress.completedTasks}\x1b[0m`);
  console.log(`  Failed: \x1b[31m${progress.failedTasks}\x1b[0m`);
  console.log(`  Pending: \x1b[33m${progress.pendingTasks}\x1b[0m`);
  console.log(`  Blocked: \x1b[90m${progress.blockedTasks}\x1b[0m`);
  console.log(`  Action Required: \x1b[35m${progress.actionRequiredTasks}\x1b[0m`);
  console.log('');

  if (progress.completedTasks === progress.totalTasks) {
    console.log('\x1b[32m✓ All tasks completed!\x1b[0m');
  } else {
    console.log(`\x1b[33m${progress.totalTasks - progress.completedTasks} tasks remaining\x1b[0m`);
  }
  console.log('');
}

export async function executeRun(options: CLIOptions, input?: string): Promise<void> {
  if (options.verbose) {
    setLogLevel(LogLevel.DEBUG);
  } else if (options.quiet) {
    setLogLevel(LogLevel.WARN);
  }

  let mode = options.mode || 'DEMO_MODE';
  let section = options.section || 'ALL';
  let resume = options.resume || false;

  if (input) {
    const parsed = parseNaturalLanguage(input);
    mode = parsed.mode;
    section = parsed.section;
    resume = parsed.resume;

    if (!options.quiet) {
      printCLIBanner();
      console.log(formatDetectedPlan(parsed));
      console.log('');
    }
  }

  await orchestrator.initialize();

  const progress = orchestrator.getProgress();
  if (progress.completedTasks > 0 && !options.quiet) {
    console.log(`Previous progress: ${progress.percentComplete.toFixed(1)}% (${progress.completedTasks}/${progress.totalTasks} tasks completed)`);
    if (resume) {
      console.log('Resuming execution...');
    }
    console.log('');
  }

  if (!options.quiet) {
    printAgentHeader(mode, section);
  }

  const requirements = orchestrator.loadRequirements(section as 'Q1' | 'Q2' | 'ALL');
  const tasks = orchestrator.buildTaskGraph(requirements);

  if (!options.quiet) {
    printRequirementPlan(requirements, tasks);
  }

  if (options.dryRun) {
    if (!options.quiet) {
      console.log('');
      console.log('DRY RUN MODE — Planning only. No actions will be executed.');
      console.log('');
      console.log('Planned tasks:');
      for (const task of tasks) {
        const detail = task.actionPlan?.length
          ? task.actionPlan.map(s => `${s.tool}: ${s.action}`).join('; ')
          : task.description;
        console.log(`  - [${task.id}] ${task.title} — ${detail}`);
      }
      console.log('');
      console.log('Dry run complete. Use without --dry-run to execute.');
    }
    return;
  }

  const report = resume
    ? await orchestrator.resumeExecution(mode)
    : await orchestrator.executeProject(mode, section as 'Q1' | 'Q2' | 'ALL');

  const allTasks = orchestrator.getProject().tasks;

  if (options.json) {
    console.log(JSON.stringify(report, null, 2));
    return;
  }

  printFinalReport(report, allTasks);

  if (report.actionRequiredTasks > 0) {
    const actionTasks = allTasks.filter(t => t.state === 'ACTION_REQUIRED');
    for (const task of actionTasks) {
      printActionRequired(task.title, task.description);
    }
  }
}

export async function runCLI(argv: string[]): Promise<void> {
  const parsed = parseCLIArgs(argv);

  switch (parsed.command) {
    case 'help':
      printCLIHelp();
      break;
    case 'version':
      printVersion();
      break;
    case 'status':
      await executeStatus(parsed.options);
      break;
    case 'tasks':
      await executeTasks(parsed.options);
      break;
    case 'report':
      await executeReport(parsed.options);
      break;
    case 'run':
      await executeRun(parsed.options, parsed.args.join(' '));
      break;
  }
}
