import type { EvidenceItem, Project, EvidenceCapture } from '../types/index.js';
import { saveProject } from './state.js';
import { logger } from './logger.js';
import { getBrowserManager } from './browser-manager.js';
import { join } from 'node:path';
import { mkdirSync, existsSync } from 'node:fs';

const EVIDENCE_BASE = join(process.cwd(), 'evidence');

export async function captureEvidence(
  project: Project,
  requirementId: string,
  taskId: string,
  actionId: string,
  title: string,
  description: string,
  section: 'q1' | 'q2' = 'q1',
): Promise<EvidenceCapture | null> {
  const dir = join(EVIDENCE_BASE, section);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

  const filename = `${section}-${taskId}-${Date.now()}.png`;
  let screenshotPath: string | null = null;

  try {
    const browser = getBrowserManager();
    if (browser.isLaunched()) {
      screenshotPath = await browser.screenshot(filename);
    }
  } catch {
    logger.warn('EvidenceManager', 'Could not capture screenshot - browser not available');
  }

  const state = project.evidence.find(e => e.taskId === taskId && e.requirementId === requirementId);
  if (state) {
    state.status = 'CAPTURED';
    state.screenshotPath = screenshotPath || join(dir, filename);
    saveProject(project);
  }

  const capture: EvidenceCapture = {
    id: `ECAP-${Date.now()}`,
    requirementId,
    taskId,
    actionId,
    screenshotPath: screenshotPath || join(dir, filename),
    pageUrl: '',
    pageTitle: '',
    description,
    verificationStatus: 'PENDING',
    capturedAt: new Date(),
  };

  try {
    const browser = getBrowserManager();
    if (browser.isLaunched()) {
      const s = await browser.getCurrentState();
      capture.pageUrl = s.url;
      capture.pageTitle = s.title;
    }
  } catch {
    // ignore
  }

  logger.info('EvidenceManager', `Captured evidence: ${title} -> ${capture.screenshotPath}`);
  return capture;
}

export function createEvidence(
  project: Project,
  requirementId: string,
  taskId: string,
  title: string,
  description: string,
  expectedScreen: string
): EvidenceItem {
  const evidence: EvidenceItem = {
    id: `EVD-${project.evidence.length + 1}`,
    requirementId,
    taskId,
    title,
    description,
    expectedScreen,
    status: 'ACTION_REQUIRED',
    verificationStatus: 'PENDING',
    createdAt: new Date(),
  };
  project.evidence.push(evidence);
  saveProject(project);
  logger.info('EvidenceManager', `Created evidence: ${title} (${evidence.id})`);
  return evidence;
}

export function updateEvidenceStatus(
  project: Project,
  evidenceId: string,
  status: EvidenceItem['status'],
  screenshotPath?: string
): EvidenceItem | null {
  const evidence = project.evidence.find(e => e.id === evidenceId);
  if (!evidence) {
    logger.error('EvidenceManager', `Evidence not found: ${evidenceId}`);
    return null;
  }

  evidence.status = status;
  if (screenshotPath) {
    evidence.screenshotPath = screenshotPath;
  }
  if (status === 'CAPTURED') {
    evidence.verificationStatus = 'PENDING';
  }

  saveProject(project);
  logger.info('EvidenceManager', `Evidence "${evidence.title}" status: ${status}`);
  return evidence;
}

export function getEvidenceByRequirement(
  project: Project,
  requirementId: string
): EvidenceItem[] {
  return project.evidence.filter(e => e.requirementId === requirementId);
}

export function getMissingEvidence(project: Project): EvidenceItem[] {
  return project.evidence.filter(
    e => e.status === 'ACTION_REQUIRED' || e.status === 'MISSING'
  );
}

export function getEvidenceSummary(project: Project): {
  total: number;
  captured: number;
  verified: number;
  actionRequired: number;
  missing: number;
} {
  const total = project.evidence.length;
  const captured = project.evidence.filter(e => e.status === 'CAPTURED').length;
  const verified = project.evidence.filter(e => e.verificationStatus === 'VERIFIED').length;
  const actionRequired = project.evidence.filter(e => e.status === 'ACTION_REQUIRED').length;
  const missing = project.evidence.filter(e => e.status === 'MISSING').length;

  return { total, captured, verified, actionRequired, missing };
}
