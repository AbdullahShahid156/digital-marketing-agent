import type { Project, QACheckResult } from '../../types/index.js';
import { validateProject } from '../../core/validation.js';
import { logger } from '../../core/logger.js';

export interface QAReport {
  timestamp: Date;
  projectName: string;
  checks: QACheckResult[];
  passed: number;
  failed: number;
  warnings: number;
}

export function runQAAudit(project: Project): QAReport {
  const checks = validateProject(project);
  const passed = checks.filter(c => c.status === 'PASS').length;
  const failed = checks.filter(c => c.status === 'FAIL').length;
  const warnings = checks.filter(c => c.status === 'WARNING').length;

  logger.info('QA', `QA Audit: ${passed} passed, ${failed} failed, ${warnings} warnings`);

  return {
    timestamp: new Date(),
    projectName: project.name,
    checks,
    passed,
    failed,
    warnings,
  };
}

export function generateQAReport(report: QAReport): string {
  const lines: string[] = [
    '# Quality Assurance Report',
    '',
    `Date: ${report.timestamp.toISOString()}`,
    `Project: ${report.projectName}`,
    '',
    '## Summary',
    `- Passed: ${report.passed}`,
    `- Failed: ${report.failed}`,
    `- Warnings: ${report.warnings}`,
    '',
    '## Details',
    '',
  ];

  const categories = [...new Set(report.checks.map(c => c.category))];
  for (const category of categories) {
    lines.push(`### ${category}`);
    const items = report.checks.filter(c => c.category === category);
    for (const item of items) {
      const icon = item.status === 'PASS' ? '[PASS]' : item.status === 'FAIL' ? '[FAIL]' : '[WARN]';
      lines.push(`${icon} ${item.item}: ${item.details}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

export function isProjectVerified(report: QAReport): boolean {
  return report.failed === 0 && report.passed > 0;
}
