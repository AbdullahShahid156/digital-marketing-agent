#!/usr/bin/env node
import { orchestrator } from './core/orchestrator.js';
import { logger } from './core/logger.js';
import type { AgentMode } from './types/index.js';

const VALID_MODES: AgentMode[] = ['DEMO_MODE', 'LIVE_MODE'];
const VALID_SECTIONS = ['ALL', 'Q1', 'Q2'];

function printBanner(): void {
  console.log('='.repeat(60));
  console.log('  HUNARMAND PUNJAB - AI DIGITAL MARKETING AGENT');
  console.log('  Batch-3 | Facebook/Meta + LinkedIn Assignment');
  console.log('='.repeat(60));
  console.log('');
}

function parseArgs(argv: string[]): { mode: AgentMode; section: string; resume: boolean } {
  let mode: AgentMode = 'DEMO_MODE';
  let section = 'ALL';
  let resume = false;

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
      i++;
    } else if (arg === '--section' && argv[i + 1]) {
      const val = argv[i + 1].toUpperCase();
      if (VALID_SECTIONS.includes(val)) {
        section = val;
      } else {
        console.error(`Invalid section: ${argv[i + 1]}. Use: ${VALID_SECTIONS.join(', ')}`);
        process.exit(1);
      }
      i++;
    } else if (arg === '--resume') {
      resume = true;
    } else if (arg === '--help' || arg === '-h') {
      console.log('Usage: npm run agent [options]');
      console.log('');
      console.log('Options:');
      console.log('  --mode <mode>     Execution mode: DEMO_MODE (default) or LIVE_MODE');
      console.log('  --section <sec>   Section to run: ALL (default), Q1, or Q2');
      console.log('  --resume          Resume from last execution state');
      console.log('  --help, -h        Show this help message');
      console.log('');
      console.log('Examples:');
      console.log('  npm run agent                          Run all tasks in DEMO_MODE');
      console.log('  npm run agent -- --mode LIVE_MODE      Run all tasks in LIVE_MODE');
      console.log('  npm run agent -- --section Q1          Run only Facebook/Meta tasks');
      console.log('  npm run agent -- --resume              Resume from previous state');
      process.exit(0);
    }
  }

  return { mode, section, resume };
}

async function main(): Promise<void> {
  printBanner();

  const args = parseArgs(process.argv);

  logger.info('Agent', `Mode: ${args.mode} | Section: ${args.section} | Resume: ${args.resume}`);

  await orchestrator.initialize();

  const progress = orchestrator.getProgress();
  if (progress.completedTasks > 0 && args.resume) {
    console.log(`Resuming execution. ${progress.completedTasks} tasks already completed.`);
  }

  console.log(`\nProject: ${progress.projectName}`);
  console.log(`Current Progress: ${progress.percentComplete.toFixed(1)}% (${progress.completedTasks}/${progress.totalTasks} tasks)`);
  console.log('');

  const report = args.resume
    ? await orchestrator.resumeExecution(args.mode)
    : await orchestrator.executeProject(args.mode, args.section as 'Q1' | 'Q2' | 'ALL');

  orchestrator.report();

  console.log('Execution finished.');
  if (report.actionRequiredTasks > 0) {
    console.log(`${report.actionRequiredTasks} tasks require user action. Run with --resume after completing them.`);
  }
}

main().catch((error) => {
  logger.error('Agent', 'Fatal error', error as Error);
  console.error('Agent failed:', (error as Error).message);
  process.exit(1);
});
