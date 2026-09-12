import { describe, it, expect, beforeEach, vi } from 'vitest';
import { parseCLIArgs, printCLIHelp, printVersion } from '../src/cli/index.js';

describe('CLI Module', () => {
  describe('parseCLIArgs', () => {
    it('should parse run command with default options', () => {
      const result = parseCLIArgs(['node', 'agent.ts']);
      expect(result.command).toBe('help');
    });

    it('should parse run command explicitly', () => {
      const result = parseCLIArgs(['node', 'agent.ts', 'run']);
      expect(result.command).toBe('run');
    });

    it('should parse status command', () => {
      const result = parseCLIArgs(['node', 'agent.ts', 'status']);
      expect(result.command).toBe('status');
    });

    it('should parse report command', () => {
      const result = parseCLIArgs(['node', 'agent.ts', 'report']);
      expect(result.command).toBe('report');
    });

    it('should parse tasks command', () => {
      const result = parseCLIArgs(['node', 'agent.ts', 'tasks']);
      expect(result.command).toBe('tasks');
    });

    it('should parse help command', () => {
      const result = parseCLIArgs(['node', 'agent.ts', 'help']);
      expect(result.command).toBe('help');
    });

    it('should parse version command', () => {
      const result = parseCLIArgs(['node', 'agent.ts', 'version']);
      expect(result.command).toBe('version');
    });

    it('should parse --help flag', () => {
      const result = parseCLIArgs(['node', 'agent.ts', '--help']);
      expect(result.command).toBe('help');
    });

    it('should parse -h flag', () => {
      const result = parseCLIArgs(['node', 'agent.ts', '-h']);
      expect(result.command).toBe('help');
    });

    it('should parse --version flag', () => {
      const result = parseCLIArgs(['node', 'agent.ts', '--version']);
      expect(result.command).toBe('version');
    });

    it('should parse --mode option', () => {
      const result = parseCLIArgs(['node', 'agent.ts', 'run', '--mode', 'LIVE_MODE']);
      expect(result.command).toBe('run');
      expect(result.options.mode).toBe('LIVE_MODE');
    });

    it('should parse -m shorthand', () => {
      const result = parseCLIArgs(['node', 'agent.ts', 'run', '-m', 'DEMO_MODE']);
      expect(result.command).toBe('run');
      expect(result.options.mode).toBe('DEMO_MODE');
    });

    it('should parse --section option', () => {
      const result = parseCLIArgs(['node', 'agent.ts', 'run', '--section', 'Q1']);
      expect(result.command).toBe('run');
      expect(result.options.section).toBe('Q1');
    });

    it('should parse -s shorthand', () => {
      const result = parseCLIArgs(['node', 'agent.ts', 'run', '-s', 'Q2']);
      expect(result.command).toBe('run');
      expect(result.options.section).toBe('Q2');
    });

    it('should parse --resume flag', () => {
      const result = parseCLIArgs(['node', 'agent.ts', 'run', '--resume']);
      expect(result.command).toBe('run');
      expect(result.options.resume).toBe(true);
    });

    it('should parse -r shorthand', () => {
      const result = parseCLIArgs(['node', 'agent.ts', 'run', '-r']);
      expect(result.command).toBe('run');
      expect(result.options.resume).toBe(true);
    });

    it('should parse --dry-run flag', () => {
      const result = parseCLIArgs(['node', 'agent.ts', 'run', '--dry-run']);
      expect(result.command).toBe('run');
      expect(result.options.dryRun).toBe(true);
    });

    it('should parse -d shorthand', () => {
      const result = parseCLIArgs(['node', 'agent.ts', 'run', '-d']);
      expect(result.command).toBe('run');
      expect(result.options.dryRun).toBe(true);
    });

    it('should parse --verbose flag', () => {
      const result = parseCLIArgs(['node', 'agent.ts', 'run', '--verbose']);
      expect(result.command).toBe('run');
      expect(result.options.verbose).toBe(true);
    });

    it('should parse -v shorthand', () => {
      const result = parseCLIArgs(['node', 'agent.ts', 'run', '-v']);
      expect(result.command).toBe('run');
      expect(result.options.verbose).toBe(true);
    });

    it('should parse --quiet flag', () => {
      const result = parseCLIArgs(['node', 'agent.ts', 'run', '--quiet']);
      expect(result.command).toBe('run');
      expect(result.options.quiet).toBe(true);
    });

    it('should parse -q shorthand', () => {
      const result = parseCLIArgs(['node', 'agent.ts', 'run', '-q']);
      expect(result.command).toBe('run');
      expect(result.options.quiet).toBe(true);
    });

    it('should parse --json flag', () => {
      const result = parseCLIArgs(['node', 'agent.ts', 'status', '--json']);
      expect(result.command).toBe('status');
      expect(result.options.json).toBe(true);
    });

    it('should parse -j shorthand', () => {
      const result = parseCLIArgs(['node', 'agent.ts', 'tasks', '-j']);
      expect(result.command).toBe('tasks');
      expect(result.options.json).toBe(true);
    });

    it('should parse multiple options together', () => {
      const result = parseCLIArgs(['node', 'agent.ts', 'run', '--mode', 'LIVE_MODE', '--section', 'Q2', '--resume', '--verbose']);
      expect(result.command).toBe('run');
      expect(result.options.mode).toBe('LIVE_MODE');
      expect(result.options.section).toBe('Q2');
      expect(result.options.resume).toBe(true);
      expect(result.options.verbose).toBe(true);
    });

    it('should parse natural language input as args', () => {
      const result = parseCLIArgs(['node', 'agent.ts', 'run', 'Complete my LinkedIn assignment']);
      expect(result.command).toBe('run');
      expect(result.args).toContain('Complete my LinkedIn assignment');
    });

    it('should default to DEMO_MODE when no mode specified', () => {
      const result = parseCLIArgs(['node', 'agent.ts', 'run']);
      expect(result.command).toBe('run');
      expect(result.options.mode).toBeUndefined();
    });

    it('should handle invalid mode gracefully', () => {
      const result = parseCLIArgs(['node', 'agent.ts', 'run', '--mode', 'INVALID']);
      expect(result.command).toBe('run');
      expect(result.options.mode).toBeUndefined();
    });

    it('should parse tasks with section filter', () => {
      const result = parseCLIArgs(['node', 'agent.ts', 'tasks', '--section', 'Q1']);
      expect(result.command).toBe('tasks');
      expect(result.options.section).toBe('Q1');
    });

    it('should parse report with json output', () => {
      const result = parseCLIArgs(['node', 'agent.ts', 'report', '--json']);
      expect(result.command).toBe('report');
      expect(result.options.json).toBe(true);
    });
  });
});
