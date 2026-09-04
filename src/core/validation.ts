import type { Project, QACheckResult } from '../types/index.js';
import { logger } from './logger.js';

export function validateProject(project: Project): QACheckResult[] {
  const results: QACheckResult[] = [];

  results.push({
    category: 'Functional',
    item: 'Project has a name',
    status: project.name ? 'PASS' : 'FAIL',
    details: project.name ? `Project: ${project.name}` : 'No project name',
  });

  results.push({
    category: 'Functional',
    item: 'Project has requirements',
    status: project.requirements.length > 0 ? 'PASS' : 'FAIL',
    details: `${project.requirements.length} requirements defined`,
  });

  results.push({
    category: 'Functional',
    item: 'Project has tasks',
    status: project.tasks.length > 0 ? 'PASS' : 'FAIL',
    details: `${project.tasks.length} tasks defined`,
  });

  const completedTasks = project.tasks.filter(
    t => t.state === 'COMPLETED' || t.state === 'VERIFIED'
  ).length;
  results.push({
    category: 'Functional',
    item: 'Tasks are being completed',
    status: completedTasks > 0 ? 'PASS' : 'WARNING',
    details: `${completedTasks} of ${project.tasks.length} tasks completed`,
  });

  const hasBusiness = project.business !== null;
  results.push({
    category: 'Assignment',
    item: 'Business profile exists',
    status: hasBusiness ? 'PASS' : 'WARNING',
    details: hasBusiness ? 'Business defined' : 'No business profile yet',
  });

  results.push({
    category: 'Evidence',
    item: 'Evidence items exist',
    status: project.evidence.length > 0 ? 'PASS' : 'WARNING',
    details: `${project.evidence.length} evidence items tracked`,
  });

  const unverified = project.evidence.filter(
    e => e.verificationStatus !== 'VERIFIED'
  ).length;
  results.push({
    category: 'Evidence',
    item: 'Evidence is verified',
    status: unverified === 0 ? 'PASS' : 'WARNING',
    details: `${project.evidence.length - unverified} verified, ${unverified} pending`,
  });

  logger.info('Validation', `Completed ${results.length} checks`);
  return results;
}

export function printValidationResults(results: QACheckResult[]): void {
  console.log('\n' + '='.repeat(60));
  console.log('QUALITY ASSURANCE REPORT');
  console.log('='.repeat(60));

  const categories = [...new Set(results.map(r => r.category))];
  for (const category of categories) {
    console.log(`\n--- ${category} ---`);
    const items = results.filter(r => r.category === category);
    for (const item of items) {
      const icon =
        item.status === 'PASS' ? '[PASS]' :
        item.status === 'FAIL' ? '[FAIL]' :
        item.status === 'WARNING' ? '[WARN]' : '[SKIP]';
      console.log(`  ${icon} ${item.item}: ${item.details}`);
    }
  }

  const passCount = results.filter(r => r.status === 'PASS').length;
  const failCount = results.filter(r => r.status === 'FAIL').length;
  const warnCount = results.filter(r => r.status === 'WARNING').length;

  console.log('\n' + '-'.repeat(60));
  console.log(`TOTAL: ${results.length} | PASS: ${passCount} | FAIL: ${failCount} | WARN: ${warnCount}`);
  console.log('='.repeat(60) + '\n');
}
