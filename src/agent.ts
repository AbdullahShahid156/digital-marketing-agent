#!/usr/bin/env node
import { runCLI } from './cli/index.js';
import { getBrowserManager } from './core/browser-manager.js';
import { logger } from './core/logger.js';

let isShuttingDown = false;

async function gracefulShutdown(signal: string, exitCode: number = 0): Promise<void> {
  if (isShuttingDown) return;
  isShuttingDown = true;

  logger.info('Agent', `Received ${signal}, shutting down gracefully...`);

  try {
    const browser = getBrowserManager();
    if (browser.isLaunched()) {
      await browser.close();
      logger.info('Agent', 'Browser closed');
    }
  } catch {
    // browser may not be initialized
  }

  process.exit(exitCode);
}

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('uncaughtException', (error) => {
  logger.error('Agent', 'Uncaught exception', error);
  gracefulShutdown('uncaughtException', 1);
});

runCLI(process.argv).catch((error) => {
  console.error('Agent failed:', error.message);
  process.exit(1);
});
