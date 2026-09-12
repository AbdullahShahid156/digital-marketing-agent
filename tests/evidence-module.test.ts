import { describe, it, expect, beforeEach } from 'vitest';
import type { Project, EvidenceItem } from '../src/types/index.js';
import {
  createEvidence,
  updateEvidenceStatus,
  getEvidenceByRequirement,
  getMissingEvidence,
  getEvidenceSummary,
} from '../src/core/evidence-manager.js';
import {
  verifyEvidence,
  batchVerifyEvidence,
  getVerificationReport,
} from '../src/modules/evidence/verification.js';
import {
  exportEvidencePackage,
  generateEvidenceIndex,
} from '../src/modules/evidence/export.js';

function createTestProject(): Project {
  return {
    id: 'test-project',
    name: 'Test Project',
    description: 'Test',
    business: null,
    requirements: [],
    tasks: [],
    evidence: [],
    marketingStrategy: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

describe('Evidence Module', () => {
  let project: Project;

  beforeEach(() => {
    project = createTestProject();
  });

  describe('createEvidence', () => {
    it('should create evidence item', () => {
      const evidence = createEvidence(
        project,
        'REQ-1',
        'TASK-1',
        'Test Evidence',
        'Test description',
        'Login Page'
      );

      expect(evidence.id).toMatch(/^EVD-/);
      expect(evidence.title).toBe('Test Evidence');
      expect(evidence.status).toBe('ACTION_REQUIRED');
      expect(evidence.verificationStatus).toBe('PENDING');
      expect(project.evidence).toHaveLength(1);
    });
  });

  describe('updateEvidenceStatus', () => {
    it('should update evidence status', () => {
      const evidence = createEvidence(
        project,
        'REQ-1',
        'TASK-1',
        'Test Evidence',
        'Description',
        'Screen'
      );

      const updated = updateEvidenceStatus(project, evidence.id, 'CAPTURED', '/path/to/screenshot.png');

      expect(updated).not.toBeNull();
      expect(updated!.status).toBe('CAPTURED');
      expect(updated!.screenshotPath).toBe('/path/to/screenshot.png');
    });
  });

  describe('getEvidenceByRequirement', () => {
    it('should filter evidence by requirement', () => {
      createEvidence(project, 'REQ-1', 'TASK-1', 'Evidence 1', 'Desc', 'Screen');
      createEvidence(project, 'REQ-2', 'TASK-2', 'Evidence 2', 'Desc', 'Screen');
      createEvidence(project, 'REQ-1', 'TASK-3', 'Evidence 3', 'Desc', 'Screen');

      const filtered = getEvidenceByRequirement(project, 'REQ-1');
      expect(filtered).toHaveLength(2);
    });
  });

  describe('getMissingEvidence', () => {
    it('should return evidence with ACTION_REQUIRED or MISSING status', () => {
      const ev1 = createEvidence(project, 'REQ-1', 'TASK-1', 'Evidence 1', 'Desc', 'Screen');
      const ev2 = createEvidence(project, 'REQ-1', 'TASK-2', 'Evidence 2', 'Desc', 'Screen');
      createEvidence(project, 'REQ-1', 'TASK-3', 'Evidence 3', 'Desc', 'Screen');

      updateEvidenceStatus(project, ev1.id, 'CAPTURED');

      const missing = getMissingEvidence(project);
      expect(missing).toHaveLength(2);
    });
  });

  describe('getEvidenceSummary', () => {
    it('should return correct summary counts', () => {
      const ev1 = createEvidence(project, 'REQ-1', 'TASK-1', 'Evidence 1', 'Desc', 'Screen');
      const ev2 = createEvidence(project, 'REQ-1', 'TASK-2', 'Evidence 2', 'Desc', 'Screen');
      const ev3 = createEvidence(project, 'REQ-1', 'TASK-3', 'Evidence 3', 'Desc', 'Screen');

      updateEvidenceStatus(project, ev1.id, 'CAPTURED');
      updateEvidenceStatus(project, ev2.id, 'CAPTURED');
      updateEvidenceStatus(project, ev3.id, 'MISSING');

      const summary = getEvidenceSummary(project);
      expect(summary.total).toBe(3);
      expect(summary.captured).toBe(2);
      expect(summary.actionRequired).toBe(0);
      expect(summary.missing).toBe(1);
    });
  });
});

describe('Evidence Verification', () => {
  let project: Project;

  beforeEach(() => {
    project = createTestProject();
  });

  describe('verifyEvidence', () => {
    it('should verify evidence item', () => {
      const evidence = createEvidence(
        project,
        'REQ-1',
        'TASK-1',
        'Test Evidence',
        'Description',
        'Screen'
      );

      const result = verifyEvidence(project, evidence.id, true, 'Screenshot matches expected');

      expect(result).not.toBeNull();
      expect(result!.verified).toBe(true);
      expect(result!.reason).toBe('Screenshot matches expected');
      expect(evidence.verificationStatus).toBe('VERIFIED');
    });

    it('should fail evidence verification', () => {
      const evidence = createEvidence(
        project,
        'REQ-1',
        'TASK-1',
        'Test Evidence',
        'Description',
        'Screen'
      );

      const result = verifyEvidence(project, evidence.id, false, 'Wrong screen captured');

      expect(result).not.toBeNull();
      expect(result!.verified).toBe(false);
      expect(evidence.verificationStatus).toBe('FAILED');
    });

    it('should return null for non-existent evidence', () => {
      const result = verifyEvidence(project, 'NON-EXISTENT', true, 'test');
      expect(result).toBeNull();
    });
  });

  describe('batchVerifyEvidence', () => {
    it('should batch verify multiple evidence items', () => {
      const ev1 = createEvidence(project, 'REQ-1', 'TASK-1', 'Evidence 1', 'Desc', 'Screen');
      const ev2 = createEvidence(project, 'REQ-1', 'TASK-2', 'Evidence 2', 'Desc', 'Screen');
      const ev3 = createEvidence(project, 'REQ-1', 'TASK-3', 'Evidence 3', 'Desc', 'Screen');

      const results = batchVerifyEvidence(
        project,
        [ev1.id, ev2.id, ev3.id],
        true,
        'All verified'
      );

      expect(results).toHaveLength(3);
      expect(ev1.verificationStatus).toBe('VERIFIED');
      expect(ev2.verificationStatus).toBe('VERIFIED');
      expect(ev3.verificationStatus).toBe('VERIFIED');
    });
  });

  describe('getVerificationReport', () => {
    it('should generate verification report', () => {
      const ev1 = createEvidence(project, 'Q1-R1', 'TASK-1', 'Evidence 1', 'Desc', 'Screen');
      const ev2 = createEvidence(project, 'Q1-R1', 'TASK-2', 'Evidence 2', 'Desc', 'Screen');
      const ev3 = createEvidence(project, 'Q2-R1', 'TASK-3', 'Evidence 3', 'Desc', 'Screen');

      verifyEvidence(project, ev1.id, true, 'Verified');
      verifyEvidence(project, ev2.id, false, 'Failed');

      const report = getVerificationReport(project);

      expect(report.total).toBe(3);
      expect(report.verified).toBe(1);
      expect(report.failed).toBe(1);
      expect(report.pending).toBe(1);
      expect(report.byRequirement['Q1-R1']).toEqual({ verified: 1, total: 2 });
      expect(report.byRequirement['Q2-R1']).toEqual({ verified: 0, total: 1 });
    });
  });
});

describe('Evidence Export', () => {
  let project: Project;

  beforeEach(() => {
    project = createTestProject();
  });

  describe('exportEvidencePackage', () => {
    it('should export evidence package', () => {
      createEvidence(project, 'Q1-R1', 'TASK-1', 'Q1 Evidence', 'Desc', 'Screen');
      createEvidence(project, 'Q2-R1', 'TASK-2', 'Q2 Evidence', 'Desc', 'Screen');

      const pkg = exportEvidencePackage(project);

      expect(pkg.projectName).toBe('Test Project');
      expect(pkg.sections.q1).toHaveLength(1);
      expect(pkg.sections.q2).toHaveLength(1);
      expect(pkg.summary.total).toBe(2);
      expect(pkg.indexMarkdown).toContain('Q1 - Facebook/Meta Assignment');
      expect(pkg.indexMarkdown).toContain('Q2 - LinkedIn Assignment');
    });
  });

  describe('generateEvidenceIndex', () => {
    it('should generate markdown index', () => {
      createEvidence(project, 'Q1-R1', 'TASK-1', 'Evidence 1', 'Description', 'Screen');

      const index = generateEvidenceIndex(project);

      expect(index).toContain('# Evidence Index: Test Project');
      expect(index).toContain('Evidence 1');
      expect(index).toContain('Q1 - Facebook/Meta Assignment');
    });
  });
});
