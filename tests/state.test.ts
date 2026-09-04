import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { existsSync, rmSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import {
  createNewProject,
  loadProject,
  saveProject,
  getHistoryFiles,
} from '../src/core/state.js';

const TEST_DATA_DIR = join(process.cwd(), 'data');

function safeRmSync(path: string): void {
  try {
    if (existsSync(path)) {
      rmSync(path, { recursive: true, force: true });
    }
  } catch {
    // Ignore cleanup errors
  }
}

describe('State Management', () => {
  beforeEach(() => {
    if (!existsSync(TEST_DATA_DIR)) {
      mkdirSync(TEST_DATA_DIR, { recursive: true });
    }
  });

  afterEach(() => {
    safeRmSync(join(TEST_DATA_DIR, 'project.json'));
    safeRmSync(join(TEST_DATA_DIR, 'project.json.tmp'));
    const historyDir = join(TEST_DATA_DIR, 'history');
    if (existsSync(historyDir)) {
      const { readdirSync } = require('node:fs');
      const files = readdirSync(historyDir);
      for (const file of files) {
        safeRmSync(join(historyDir, file));
      }
      safeRmSync(historyDir);
    }
  });

  it('should create and load a project', () => {
    const project = createNewProject('Test', 'Description');
    expect(project).toBeDefined();
    expect(project.name).toBe('Test');

    const loaded = loadProject();
    expect(loaded).toBeDefined();
    expect(loaded!.name).toBe('Test');
  });

  it('should create backups on save', () => {
    const project = createNewProject('Test', 'Description');
    saveProject(project, 'action1');
    saveProject(project, 'action2');

    const history = getHistoryFiles();
    expect(history.length).toBeGreaterThanOrEqual(1);
  });

  it('should handle missing project gracefully', () => {
    const loaded = loadProject();
    expect(loaded).toBeNull();
  });
});
