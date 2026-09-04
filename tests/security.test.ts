import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { existsSync, rmSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { runSecurityAudit, generateSecurityReport } from '../src/modules/security/auditor.js';

const TEST_DIR = join(process.cwd(), 'test-security');

function safeRmSync(path: string): void {
  try {
    if (existsSync(path)) {
      rmSync(path, { recursive: true, force: true });
    }
  } catch {}
}

describe('Security Auditor', () => {
  beforeEach(() => {
    if (!existsSync(TEST_DIR)) mkdirSync(TEST_DIR, { recursive: true });
  });

  afterEach(() => {
    safeRmSync(TEST_DIR);
  });

  it('should run security audit', () => {
    const checks = runSecurityAudit(TEST_DIR);
    expect(checks).toBeDefined();
    expect(checks.length).toBeGreaterThan(0);
  });

  it('should generate security report', () => {
    const checks = runSecurityAudit(TEST_DIR);
    const report = generateSecurityReport(checks);
    expect(report).toContain('# Security Audit Report');
  });

  it('should detect missing .gitignore', () => {
    const checks = runSecurityAudit(TEST_DIR);
    const gitignoreCheck = checks.find(c => c.name.includes('.gitignore'));
    expect(gitignoreCheck).toBeDefined();
    expect(gitignoreCheck!.status).toBe('FAIL');
  });
});
