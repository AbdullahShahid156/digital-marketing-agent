import { orchestrator } from './core/orchestrator.js';
import { logger, setLogLevel, LogLevel } from './core/logger.js';
import { validateProject, printValidationResults } from './core/validation.js';

async function main(): Promise<void> {
  setLogLevel(LogLevel.INFO);
  logger.info('Main', 'Hunarmand Punjab AI Digital Marketing Agent starting...');

  const project = await orchestrator.initialize();

  console.log('\n' + '='.repeat(60));
  console.log('HUNARMAND PUNJAB AI DIGITAL MARKETING AGENT');
  console.log('='.repeat(60));
  console.log(`Project: ${project.name}`);
  console.log(`Status: ${project.status}`);
  console.log(`Created: ${project.createdAt}`);
  console.log('='.repeat(60));

  const status = orchestrator.getStatus();
  console.log('\nProject Status:');
  console.log(`  Total Tasks: ${status.totalTasks}`);
  console.log(`  Next Runnable: ${status.nextRunnable}`);
  console.log('  Tasks by State:');
  for (const [state, count] of Object.entries(status.tasksByState)) {
    console.log(`    ${state}: ${count}`);
  }

  const results = validateProject(project);
  printValidationResults(results);

  logger.info('Main', 'Agent initialization complete');
}

main().catch(error => {
  logger.error('Main', 'Fatal error', error as Error);
  process.exit(1);
});
