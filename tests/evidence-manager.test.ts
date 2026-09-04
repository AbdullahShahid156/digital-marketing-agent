import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { existsSync, rmSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { createNewProject } from '../src/core/state.js';
import {
  createEvidence,
  updateEvidenceStatus,
  getEvidenceByRequirement,
  getMissingEvidence,
  getEvidenceSummary,
} from '../src/core/evidence-manager.js';
import type { Project } from '../src/types/index.js';

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

describe('Evidence Manager', () => {
  let project: Project;

  beforeEach(() => {
    if (!existsSync(TEST_DATA_DIR)) {
      mkdirSync(TEST_DATA_DIR, { recursive: true });
    }
    project = createNewProject('Test Project', 'Test Description');
  });

  afterEach(() => {
    safeRmSync(join(TEST_DATA_DIR, 'project.json'));
    safeRmSync(join(TEST_DATA_DIR, 'project.json.tmp'));
  });

  it('should create evidence', () => {
    const evidence = createEvidence(
      project,
      'REQ-1',
      'TASK-1',
      'Test Evidence',
      'Description',
      'Expected Screen'
    );
    expect(evidence).toBeDefined();
    expect(evidence.title).toBe('Test Evidence');
    expect(evidence.status).toBe('ACTION_REQUIRED');
    expect(project.evidence).toHaveLength(1);
  });

  it('should update evidence status', () => {
    const evidence = createEvidence(
      project,
      'REQ-1',
      'TASK-1',
      'Test Evidence',
      'Description',
      'Expected Screen'
    );
    const updated = updateEvidenceStatus(project, evidence.id, 'CAPTURED', '/path/screenshot.png');
    expect(updated).toBeDefined();
    expect(updated!.status).toBe('CAPTURED');
    expect(updated!.screenshotPath).toBe('/path/screenshot.png');
  });

  it('should get evidence by requirement', () => {
    createEvidence(project, 'REQ-1', 'TASK-1', 'Evidence 1', 'Desc', 'Screen');
    createEvidence(project, 'REQ-1', 'TASK-2', 'Evidence 2', 'Desc', 'Screen');
    createEvidence(project, 'REQ-2', 'TASK-3', 'Evidence 3', 'Desc', 'Screen');

    const req1Evidence = getEvidenceByRequirement(project, 'REQ-1');
    expect(req1Evidence).toHaveLength(2);
  });

  it('should get missing evidence', () => {
    createEvidence(project, 'REQ-1', 'TASK-1', 'Evidence 1', 'Desc', 'Screen');
    const evd = createEvidence(project, 'REQ-1', 'TASK-2', 'Evidence 2', 'Desc', 'Screen');
    updateEvidenceStatus(project, evd.id, 'MISSING');

    const missing = getMissingEvidence(project);
    expect(missing).toHaveLength(2);
  });

  it('should get evidence summary', () => {
    createEvidence(project, 'REQ-1', 'TASK-1', 'Evidence 1', 'Desc', 'Screen');
    const evd2 = createEvidence(project, 'REQ-1', 'TASK-2', 'Evidence 2', 'Desc', 'Screen');
    updateEvidenceStatus(project, evd2.id, 'CAPTURED');

    const summary = getEvidenceSummary(project);
    expect(summary.total).toBe(2);
    expect(summary.captured).toBe(1);
    expect(summary.actionRequired).toBe(1);
  });
});
