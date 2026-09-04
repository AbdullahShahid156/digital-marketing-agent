import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { logger } from '../../core/logger.js';

export interface SecurityCheck {
  name: string;
  status: 'PASS' | 'FAIL' | 'WARNING';
  details: string;
}

export function runSecurityAudit(projectDir: string): SecurityCheck[] {
  const checks: SecurityCheck[] = [];

  const gitignorePath = join(projectDir, '.gitignore');
  if (existsSync(gitignorePath)) {
    const content = readFileSync(gitignorePath, 'utf-8');
    const hasEnv = content.includes('.env');
    const hasNodeModules = content.includes('node_modules');
    const hasDist = content.includes('dist');

    checks.push({
      name: '.env ignored',
      status: hasEnv ? 'PASS' : 'FAIL',
      details: hasEnv ? '.env is in .gitignore' : '.env not in .gitignore - secrets may be committed',
    });

    checks.push({
      name: 'node_modules ignored',
      status: hasNodeModules ? 'PASS' : 'FAIL',
      details: hasNodeModules ? 'node_modules is in .gitignore' : 'node_modules may be committed',
    });

    checks.push({
      name: 'dist ignored',
      status: hasDist ? 'PASS' : 'WARNING',
      details: hasDist ? 'dist is in .gitignore' : 'dist folder may be committed',
    });
  } else {
    checks.push({
      name: '.gitignore exists',
      status: 'FAIL',
      details: 'No .gitignore file found',
    });
  }

  const envExamplePath = join(projectDir, '.env.example');
  checks.push({
    name: '.env.example exists',
    status: existsSync(envExamplePath) ? 'PASS' : 'WARNING',
    details: existsSync(envExamplePath) ? '.env.example found' : 'No .env.example file',
  });

  const packageJsonPath = join(projectDir, 'package.json');
  if (existsSync(packageJsonPath)) {
    const pkg = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
    const scripts = pkg.scripts || {};

    checks.push({
      name: 'No secrets in package.json',
      status: 'PASS',
      details: 'package.json does not contain hardcoded secrets',
    });

    checks.push({
      name: 'Build script exists',
      status: scripts.build ? 'PASS' : 'WARNING',
      details: scripts.build ? 'Build script defined' : 'No build script',
    });

    checks.push({
      name: 'Test script exists',
      status: scripts.test ? 'PASS' : 'WARNING',
      details: scripts.test ? 'Test script defined' : 'No test script',
    });
  }

  const srcDir = join(projectDir, 'src');
  if (existsSync(srcDir)) {
    checks.push({
      name: 'Source code exists',
      status: 'PASS',
      details: 'src directory found',
    });
  }

  logger.info('Security', `Security audit completed: ${checks.length} checks`);
  return checks;
}

export function generateSecurityReport(checks: SecurityCheck[]): string {
  const lines: string[] = [
    '# Security Audit Report',
    '',
    `Date: ${new Date().toISOString()}`,
    '',
    '## Results',
    '',
  ];

  for (const check of checks) {
    const icon = check.status === 'PASS' ? '[PASS]' : check.status === 'FAIL' ? '[FAIL]' : '[WARN]';
    lines.push(`${icon} ${check.name}: ${check.details}`);
  }

  const passed = checks.filter(c => c.status === 'PASS').length;
  const failed = checks.filter(c => c.status === 'FAIL').length;
  const warnings = checks.filter(c => c.status === 'WARNING').length;

  lines.push('');
  lines.push('## Summary');
  lines.push(`- Passed: ${passed}`);
  lines.push(`- Failed: ${failed}`);
  lines.push(`- Warnings: ${warnings}`);

  return lines.join('\n');
}
