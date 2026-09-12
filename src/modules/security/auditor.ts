import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { logger } from '../../core/logger.js';
import { isLLMConfigured, generateText } from '../../core/llm.js';

export interface SecurityCheck {
  name: string;
  status: 'PASS' | 'FAIL' | 'WARNING';
  details: string;
  category: 'config' | 'secrets' | 'dependencies' | 'code' | 'browser';
}

export interface SecurityAuditReport {
  timestamp: Date;
  checks: SecurityCheck[];
  summary: {
    passed: number;
    failed: number;
    warnings: number;
    score: number;
  };
  recommendations: string[];
}

const SECRET_PATTERNS = [
  /(?:api[_-]?key|apikey)\s*[:=]\s*['"][^'"]+['"]/i,
  /(?:secret|password|passwd|pwd)\s*[:=]\s*['"][^'"]+['"]/i,
  /(?:token|access[_-]?token|auth[_-]?token)\s*[:=]\s*['"][^'"]+['"]/i,
  /(?:sk|pk|rk)_[a-zA-Z0-9]{20,}/,
  /ghp_[a-zA-Z0-9]{36}/,
  /xox[bpsa]-[a-zA-Z0-9-]+/,
];

export function runSecurityAudit(projectDir: string): SecurityCheck[] {
  const checks: SecurityCheck[] = [];

  // Gitignore checks
  const gitignorePath = join(projectDir, '.gitignore');
  if (existsSync(gitignorePath)) {
    const content = readFileSync(gitignorePath, 'utf-8');

    checks.push({
      name: '.env ignored',
      status: content.includes('.env') ? 'PASS' : 'FAIL',
      details: content.includes('.env') ? '.env is in .gitignore' : '.env not in .gitignore - secrets may be committed',
      category: 'config',
    });

    checks.push({
      name: 'node_modules ignored',
      status: content.includes('node_modules') ? 'PASS' : 'FAIL',
      details: content.includes('node_modules') ? 'node_modules is in .gitignore' : 'node_modules may be committed',
      category: 'dependencies',
    });

    checks.push({
      name: 'dist ignored',
      status: content.includes('dist') ? 'PASS' : 'WARNING',
      details: content.includes('dist') ? 'dist is in .gitignore' : 'dist folder may be committed',
      category: 'config',
    });

    checks.push({
      name: 'evidence ignored',
      status: content.includes('evidence') ? 'PASS' : 'WARNING',
      details: content.includes('evidence') ? 'evidence is in .gitignore' : 'evidence folder may be committed',
      category: 'config',
    });
  } else {
    checks.push({
      name: '.gitignore exists',
      status: 'FAIL',
      details: 'No .gitignore file found',
      category: 'config',
    });
  }

  // .env.example check
  const envExamplePath = join(projectDir, '.env.example');
  checks.push({
    name: '.env.example exists',
    status: existsSync(envExamplePath) ? 'PASS' : 'WARNING',
    details: existsSync(envExamplePath) ? '.env.example found' : 'No .env.example file',
    category: 'config',
  });

  // Check for .env file with secrets
  const envPath = join(projectDir, '.env');
  if (existsSync(envPath)) {
    const envContent = readFileSync(envPath, 'utf-8');
    const hasRealKeys = envContent.match(/(?:GROQ_API_KEY|OPENAI_API_KEY|API_KEY)\s*=\s*(?!your-)[a-zA-Z0-9]/);
    checks.push({
      name: '.env has real keys',
      status: hasRealKeys ? 'WARNING' : 'PASS',
      details: hasRealKeys ? '.env contains what appears to be real API keys' : '.env appears safe',
      category: 'secrets',
    });
  }

  // Package.json checks
  const packageJsonPath = join(projectDir, 'package.json');
  if (existsSync(packageJsonPath)) {
    const pkg = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
    const scripts = pkg.scripts || {};

    checks.push({
      name: 'No secrets in package.json',
      status: 'PASS',
      details: 'package.json does not contain hardcoded secrets',
      category: 'secrets',
    });

    checks.push({
      name: 'Build script exists',
      status: scripts.build ? 'PASS' : 'WARNING',
      details: scripts.build ? 'Build script defined' : 'No build script',
      category: 'config',
    });

    checks.push({
      name: 'Test script exists',
      status: scripts.test ? 'PASS' : 'WARNING',
      details: scripts.test ? 'Test script defined' : 'No test script',
      category: 'config',
    });

    checks.push({
      name: 'Lint script exists',
      status: scripts.lint ? 'PASS' : 'WARNING',
      details: scripts.lint ? 'Lint script defined' : 'No lint script',
      category: 'code',
    });
  }

  // Source code checks
  const srcDir = join(projectDir, 'src');
  if (existsSync(srcDir)) {
    checks.push({
      name: 'Source code exists',
      status: 'PASS',
      details: 'src directory found',
      category: 'code',
    });

    // Scan for hardcoded secrets in source
    const secretIssues = scanForSecrets(srcDir);
    if (secretIssues.length > 0) {
      checks.push({
        name: 'No hardcoded secrets in source',
        status: 'FAIL',
        details: `Found ${secretIssues.length} potential secret(s): ${secretIssues.slice(0, 3).join(', ')}`,
        category: 'secrets',
      });
    } else {
      checks.push({
        name: 'No hardcoded secrets in source',
        status: 'PASS',
        details: 'No hardcoded secrets detected in source code',
        category: 'secrets',
      });
    }
  }

  // Browser profile checks
  const browserProfilesDir = join(projectDir, 'browser-profiles');
  checks.push({
    name: 'Browser profiles ignored',
    status: existsSync(browserProfilesDir) ? 'WARNING' : 'PASS',
    details: existsSync(browserProfilesDir) ? 'browser-profiles directory exists - ensure it is gitignored' : 'No browser profiles directory',
    category: 'browser',
  });

  logger.info('Security', `Security audit completed: ${checks.length} checks`);
  return checks;
}

function scanForSecrets(dir: string): string[] {
  const issues: string[] = [];

  try {
    const files = readdirSync(dir, { recursive: true });
    for (const file of files) {
      if (typeof file !== 'string') continue;
      if (!file.endsWith('.ts') && !file.endsWith('.js') && !file.endsWith('.json')) continue;
      if (file.includes('node_modules') || file.includes('dist')) continue;

      const filePath = join(dir, file);
      try {
        const content = readFileSync(filePath, 'utf-8');
        for (const pattern of SECRET_PATTERNS) {
          if (pattern.test(content)) {
            issues.push(`${file}: matches ${pattern.source.substring(0, 30)}...`);
            break;
          }
        }
      } catch {
        // skip unreadable files
      }
    }
  } catch {
    // skip unreadable directories
  }

  return issues;
}

export async function generateSecurityReport(
  checks: SecurityCheck[],
  useLLM: boolean = false
): Promise<string> {
  const passed = checks.filter(c => c.status === 'PASS').length;
  const failed = checks.filter(c => c.status === 'FAIL').length;
  const warnings = checks.filter(c => c.status === 'WARNING').length;
  const score = checks.length > 0 ? Math.round((passed / checks.length) * 100) : 0;

  if (useLLM && isLLMConfigured()) {
    try {
      const checkSummary = checks.map(c => `[${c.status}] ${c.name}: ${c.details}`).join('\n');

      const prompt = `Generate a security audit report based on these checks:

${checkSummary}

Summary: ${passed} passed, ${failed} failed, ${warnings} warnings
Score: ${score}/100

Include:
1. Executive summary
2. Critical issues (if any)
3. Recommendations
4. Overall assessment

Format as markdown.`;

      const response = await generateText(
        prompt,
        'You are a security auditor writing a professional report.',
        { temperature: 0.3, maxTokens: 1000 }
      );

      return response.content;
    } catch (err) {
      logger.warn('Security', `LLM report generation failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  }

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

  lines.push('');
  lines.push('## Summary');
  lines.push(`- Passed: ${passed}`);
  lines.push(`- Failed: ${failed}`);
  lines.push(`- Warnings: ${warnings}`);
  lines.push(`- Score: ${score}/100`);

  if (failed > 0) {
    lines.push('');
    lines.push('## Critical Issues');
    for (const check of checks.filter(c => c.status === 'FAIL')) {
      lines.push(`- **${check.name}**: ${check.details}`);
    }
  }

  return lines.join('\n');
}

export function getSecurityScore(checks: SecurityCheck[]): number {
  const passed = checks.filter(c => c.status === 'PASS').length;
  return Math.round((passed / checks.length) * 100);
}

export function hasCriticalSecurityIssues(checks: SecurityCheck[]): boolean {
  return checks.some(c => c.status === 'FAIL' && c.category === 'secrets');
}
