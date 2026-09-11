import type { Project, EvidenceItem } from '../../types/index.js';
import { saveProject } from '../../core/state.js';
import { logger } from '../../core/logger.js';
import { existsSync } from 'node:fs';

export interface VerificationResult {
  evidenceId: string;
  verified: boolean;
  reason: string;
  timestamp: Date;
}

export function verifyEvidence(
  project: Project,
  evidenceId: string,
  verified: boolean,
  reason: string
): VerificationResult | null {
  const evidence = project.evidence.find(e => e.id === evidenceId);
  if (!evidence) {
    logger.error('EvidenceVerification', `Evidence not found: ${evidenceId}`);
    return null;
  }

  evidence.verificationStatus = verified ? 'VERIFIED' : 'FAILED';
  evidence.notes = reason;
  saveProject(project);

  const result: VerificationResult = {
    evidenceId,
    verified,
    reason,
    timestamp: new Date(),
  };

  logger.info(
    'EvidenceVerification',
    `Evidence "${evidence.title}" ${verified ? 'verified' : 'failed'}: ${reason}`
  );
  return result;
}

export function batchVerifyEvidence(
  project: Project,
  evidenceIds: string[],
  verified: boolean,
  reason: string
): VerificationResult[] {
  const results: VerificationResult[] = [];

  for (const id of evidenceIds) {
    const result = verifyEvidence(project, id, verified, reason);
    if (result) {
      results.push(result);
    }
  }

  logger.info(
    'EvidenceVerification',
    `Batch verification: ${results.length}/${evidenceIds.length} items processed`
  );
  return results;
}

export function getVerificationReport(project: Project): {
  total: number;
  verified: number;
  failed: number;
  pending: number;
  byRequirement: Record<string, { verified: number; total: number }>;
} {
  const total = project.evidence.length;
  const verified = project.evidence.filter(e => e.verificationStatus === 'VERIFIED').length;
  const failed = project.evidence.filter(e => e.verificationStatus === 'FAILED').length;
  const pending = project.evidence.filter(e => e.verificationStatus === 'PENDING').length;

  const byRequirement: Record<string, { verified: number; total: number }> = {};

  for (const evidence of project.evidence) {
    if (!byRequirement[evidence.requirementId]) {
      byRequirement[evidence.requirementId] = { verified: 0, total: 0 };
    }
    byRequirement[evidence.requirementId].total++;
    if (evidence.verificationStatus === 'VERIFIED') {
      byRequirement[evidence.requirementId].verified++;
    }
  }

  return { total, verified, failed, pending, byRequirement };
}
