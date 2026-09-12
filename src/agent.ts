#!/usr/bin/env node
import { runCLI } from './cli/index.js';

runCLI(process.argv).catch((error) => {
  console.error('Agent failed:', error.message);
  process.exit(1);
});
