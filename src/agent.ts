#!/usr/bin/env node
import * as readline from 'node:readline';
import { orchestrator } from './core/orchestrator.js';
import { parseNaturalLanguage, formatDetectedPlan } from './core/nlp.js';
import {
  printBanner,
  printAgentHeader,
  printRequirementPlan,
  printActionRequired,
  printFinalReport,
} from './core/display.js';
import { logger } from './core/logger.js';
import type { AgentMode } from './types/index.js';

const VALID_MODES: AgentMode[] = ['DEMO_MODE', 'LIVE_MODE'];
const VALID_SECTIONS = ['ALL', 'Q1', 'Q2'];

function parseArgs(argv: string[]): { mode: AgentMode; section: string; resume: boolean; interactive: boolean; dryRun: boolean } {
  let mode: AgentMode = 'DEMO_MODE';
  let section = 'ALL';
  let resume = false;
  let interactive = true;
  let dryRun = false;

  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--mode' && argv[i + 1]) {
      const val = argv[i + 1].toUpperCase() as AgentMode;
      if (VALID_MODES.includes(val)) {
        mode = val;
      } else {
        console.error(`Invalid mode: ${argv[i + 1]}. Use: ${VALID_MODES.join(', ')}`);
        process.exit(1);
      }
      interactive = false;
      i++;
    } else if (arg === '--section' && argv[i + 1]) {
      const val = argv[i + 1].toUpperCase();
      if (VALID_SECTIONS.includes(val)) {
        section = val;
      } else {
        console.error(`Invalid section: ${argv[i + 1]}. Use: ${VALID_SECTIONS.join(', ')}`);
        process.exit(1);
      }
      interactive = false;
      i++;
    } else if (arg === '--resume') {
      resume = true;
      interactive = false;
    } else if (arg === '--dry-run') {
      dryRun = true;
      interactive = false;
    } else if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    }
  }

  return { mode, section, resume, interactive, dryRun };
}

function printHelp(): void {
  console.log('Usage: npm run agent [options]');
  console.log('');
  console.log('Options:');
  console.log('  --mode <mode>     Execution mode: DEMO_MODE (default) or LIVE_MODE');
  console.log('  --section <sec>   Section to run: ALL (default), Q1, or Q2');
  console.log('  --resume          Resume from last execution state');
  console.log('  --dry-run         Print plan only, do not execute');
  console.log('  --help, -h        Show this help message');
  console.log('');
  console.log('Interactive mode:');
  console.log('  npm run agent                     Start interactive agent');
  console.log('');
  console.log('Examples:');
  console.log('  npm run agent                     Start interactive agent');
  console.log('  npm run agent -- --mode LIVE_MODE Run all tasks in LIVE_MODE');
  console.log('  npm run agent -- --section Q1    Run only Facebook/Meta tasks');
  console.log('  npm run agent -- --resume         Resume from previous state');
  console.log('  npm run agent -- --dry-run        Print plan without executing');
  console.log('');
  console.log('Natural language examples:');
  console.log('  "Complete my LinkedIn assignment"');
  console.log('  "Do Q1 Facebook tasks"');
  console.log('  "Run everything in live mode"');
  console.log('  "Resume where I left off"');
}

async function promptUser(rl: readline.Interface, question: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer.trim());
    });
  });
}

async function runAgent(mode: AgentMode, section: string, resume: boolean, dryRun: boolean): Promise<void> {
  printBanner();

  await orchestrator.initialize();

  const progress = orchestrator.getProgress();
  if (progress.completedTasks > 0) {
    console.log(`Previous progress: ${progress.percentComplete.toFixed(1)}% (${progress.completedTasks}/${progress.totalTasks} tasks completed)`);
    if (resume) {
      console.log('Resuming execution...');
    }
    console.log('');
  }

  printAgentHeader(mode, section);

  const requirements = orchestrator.loadRequirements(section as 'Q1' | 'Q2' | 'ALL');
  const tasks = orchestrator.buildTaskGraph(requirements);

  printRequirementPlan(requirements, tasks);

  if (dryRun) {
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
    return;
  }

  const report = resume
    ? await orchestrator.resumeExecution(mode)
    : await orchestrator.executeProject(mode, section as 'Q1' | 'Q2' | 'ALL');

  const allTasks = orchestrator.getProject().tasks;
  printFinalReport(report, allTasks);

  if (report.actionRequiredTasks > 0) {
    const actionTasks = allTasks.filter(t => t.state === 'ACTION_REQUIRED');
    for (const task of actionTasks) {
      printActionRequired(task.title, task.description);
    }
  }
}

async function runInteractive(): Promise<void> {
  printBanner();

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  try {
    console.log('What do you want me to do?');
    console.log('');
    console.log('Examples:');
    console.log('  "Complete my LinkedIn assignment"');
    console.log('  "Do Q1 Facebook tasks"');
    console.log('  "Run everything in live mode"');
    console.log('  "Resume where I left off"');
    console.log('');

    const input = await promptUser(rl, '> ');

    if (!input) {
      console.log('No input provided. Running full assignment in DEMO_MODE.');
    }

    const parsed = parseNaturalLanguage(input);

    if (parsed.intent === 'help') {
      printHelp();
      return;
    }

    console.log('');
    console.log(formatDetectedPlan(parsed));
    console.log('');

    await runAgent(parsed.mode, parsed.section, parsed.resume, false);
  } finally {
    rl.close();
  }
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv);

  if (args.interactive) {
    await runInteractive();
  } else {
    logger.info('Agent', `Mode: ${args.mode} | Section: ${args.section} | Resume: ${args.resume} | DryRun: ${args.dryRun}`);
    await runAgent(args.mode, args.section, args.resume, args.dryRun);
  }
}

main().catch((error) => {
  logger.error('Agent', 'Fatal error', error as Error);
  console.error('Agent failed:', (error as Error).message);
  process.exit(1);
});
