import type { Project, EvidenceItem } from '../../types/index.js';
import { join } from 'node:path';
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { logger } from '../../core/logger.js';

const EVIDENCE_BASE = join(process.cwd(), 'evidence');

export interface EvidencePackage {
  projectName: string;
  generatedAt: Date;
  sections: {
    q1: EvidenceItem[];
    q2: EvidenceItem[];
  };
  summary: {
    total: number;
    captured: number;
    verified: number;
    missing: number;
  };
  indexMarkdown: string;
}

export function exportEvidencePackage(project: Project): EvidencePackage {
  const q1Evidence = project.evidence.filter(e => e.requirementId.startsWith('Q1'));
  const q2Evidence = project.evidence.filter(e => e.requirementId.startsWith('Q2'));

  const total = project.evidence.length;
  const captured = project.evidence.filter(e => e.status === 'CAPTURED').length;
  const verified = project.evidence.filter(e => e.verificationStatus === 'VERIFIED').length;
  const missing = project.evidence.filter(
    e => e.status === 'ACTION_REQUIRED' || e.status === 'MISSING'
  ).length;

  const indexMarkdown = generateIndexMarkdown(project, q1Evidence, q2Evidence);

  const pkg: EvidencePackage = {
    projectName: project.name,
    generatedAt: new Date(),
    sections: { q1: q1Evidence, q2: q2Evidence },
    summary: { total, captured, verified, missing },
    indexMarkdown,
  };

  logger.info(
    'EvidenceExport',
    `Exported evidence package: ${total} items (${captured} captured, ${verified} verified)`
  );

  return pkg;
}

export function generateEvidenceIndex(project: Project): string {
  const q1Evidence = project.evidence.filter(e => e.requirementId.startsWith('Q1'));
  const q2Evidence = project.evidence.filter(e => e.requirementId.startsWith('Q2'));
  return generateIndexMarkdown(project, q1Evidence, q2Evidence);
}

function generateIndexMarkdown(
  project: Project,
  q1Evidence: EvidenceItem[],
  q2Evidence: EvidenceItem[]
): string {
  const lines: string[] = [];

  lines.push(`# Evidence Index: ${project.name}`);
  lines.push('');
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push('');

  lines.push('## Summary');
  lines.push(`- Total Evidence Items: ${project.evidence.length}`);
  lines.push(`- Captured: ${project.evidence.filter(e => e.status === 'CAPTURED').length}`);
  lines.push(`- Verified: ${project.evidence.filter(e => e.verificationStatus === 'VERIFIED').length}`);
  lines.push(`- Pending: ${project.evidence.filter(e => e.verificationStatus === 'PENDING').length}`);
  lines.push('');

  if (q1Evidence.length > 0) {
    lines.push('## Q1 - Facebook/Meta Assignment');
    lines.push('');
    for (const e of q1Evidence) {
      lines.push(`### ${e.title}`);
      lines.push(`- **ID**: ${e.id}`);
      lines.push(`- **Status**: ${e.status}`);
      lines.push(`- **Verification**: ${e.verificationStatus}`);
      lines.push(`- **Description**: ${e.description}`);
      if (e.screenshotPath) {
        lines.push(`- **Screenshot**: ${e.screenshotPath}`);
      }
      lines.push('');
    }
  }

  if (q2Evidence.length > 0) {
    lines.push('## Q2 - LinkedIn Assignment');
    lines.push('');
    for (const e of q2Evidence) {
      lines.push(`### ${e.title}`);
      lines.push(`- **ID**: ${e.id}`);
      lines.push(`- **Status**: ${e.status}`);
      lines.push(`- **Verification**: ${e.verificationStatus}`);
      lines.push(`- **Description**: ${e.description}`);
      if (e.screenshotPath) {
        lines.push(`- **Screenshot**: ${e.screenshotPath}`);
      }
      lines.push('');
    }
  }

  return lines.join('\n');
}

export function saveEvidenceIndex(project: Project): string | null {
  const indexDir = join(EVIDENCE_BASE, 'exports');
  if (!existsSync(indexDir)) {
    mkdirSync(indexDir, { recursive: true });
  }

  const indexContent = generateEvidenceIndex(project);
  const indexPath = join(indexDir, 'evidence-index.md');

  try {
    writeFileSync(indexPath, indexContent, 'utf-8');
    logger.info('EvidenceExport', `Saved evidence index to: ${indexPath}`);
    return indexPath;
  } catch (err) {
    logger.error('EvidenceExport', `Failed to save evidence index: ${err}`);
    return null;
  }
}
