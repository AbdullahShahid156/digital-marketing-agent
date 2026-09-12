import type { Project, EvidenceItem, Task } from '../../types/index.js';
import { runQAAudit, isProjectVerified } from '../qa/validator.js';
import { logger } from '../../core/logger.js';
import { generateText, isLLMConfigured } from '../../core/llm.js';
import { join } from 'node:path';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';

const REPORTS_DIR = join(process.cwd(), 'reports');

export interface ReportSection {
  title: string;
  content: string;
  evidence: EvidenceItem[];
}

export interface AssignmentReport {
  projectName: string;
  generatedAt: Date;
  qaVerified: boolean;
  completionPercentage: number;
  totalTasks: number;
  completedTasks: number;
  sections: ReportSection[];
  evidenceSummary: {
    total: number;
    captured: number;
    verified: number;
    missing: number;
  };
  q1Summary: {
    totalTasks: number;
    completedTasks: number;
    blockedTasks: number;
  };
  q2Summary: {
    totalTasks: number;
    completedTasks: number;
    blockedTasks: number;
  };
}

export async function generateAssignmentReport(project: Project): Promise<AssignmentReport> {
  const sections: ReportSection[] = [];
  const qaReport = runQAAudit(project);

  const totalTasks = project.tasks.length;
  const completedTasks = project.tasks.filter(
    t => t.state === 'COMPLETED' || t.state === 'VERIFIED'
  ).length;

  const q1Tasks = project.tasks.filter(t => t.requirementId.startsWith('Q1'));
  const q2Tasks = project.tasks.filter(t => t.requirementId.startsWith('Q2'));

  const q1Completed = q1Tasks.filter(
    t => t.state === 'COMPLETED' || t.state === 'VERIFIED'
  ).length;
  const q1Blocked = q1Tasks.filter(t => t.state === 'BLOCKED').length;

  const q2Completed = q2Tasks.filter(
    t => t.state === 'COMPLETED' || t.state === 'VERIFIED'
  ).length;
  const q2Blocked = q2Tasks.filter(t => t.state === 'BLOCKED').length;

  sections.push({
    title: 'Executive Summary',
    content: await generateExecutiveSummary(project, completedTasks, totalTasks),
    evidence: [],
  });

  if (project.business) {
    sections.push({
      title: 'Business Profile',
      content: generateBusinessSection(project),
      evidence: project.evidence.filter(e => e.requirementId.includes('Q1-R1')),
    });
  }

  sections.push({
    title: 'Q1 - Facebook/Meta Assignment',
    content: generateQ1Section(q1Tasks, q1Completed, q1Blocked),
    evidence: project.evidence.filter(e => e.requirementId.startsWith('Q1')),
  });

  sections.push({
    title: 'Q2 - LinkedIn Assignment',
    content: generateQ2Section(q2Tasks, q2Completed, q2Blocked),
    evidence: project.evidence.filter(e => e.requirementId.startsWith('Q2')),
  });

  sections.push({
    title: 'Evidence Collection',
    content: generateEvidenceSection(project),
    evidence: project.evidence,
  });

  const captured = project.evidence.filter(e => e.status === 'CAPTURED').length;
  const verified = project.evidence.filter(e => e.verificationStatus === 'VERIFIED').length;
  const missing = project.evidence.filter(
    e => e.status === 'ACTION_REQUIRED' || e.status === 'MISSING'
  ).length;

  logger.info(
    'Reports',
    `Generated assignment report: ${completedTasks}/${totalTasks} tasks completed`
  );

  return {
    projectName: project.name,
    generatedAt: new Date(),
    qaVerified: isProjectVerified(qaReport),
    completionPercentage: totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0,
    totalTasks,
    completedTasks,
    sections,
    evidenceSummary: {
      total: project.evidence.length,
      captured,
      verified,
      missing,
    },
    q1Summary: {
      totalTasks: q1Tasks.length,
      completedTasks: q1Completed,
      blockedTasks: q1Blocked,
    },
    q2Summary: {
      totalTasks: q2Tasks.length,
      completedTasks: q2Completed,
      blockedTasks: q2Blocked,
    },
  };
}

async function generateExecutiveSummary(
  project: Project,
  completedTasks: number,
  totalTasks: number
): Promise<string> {
  const completionPct = totalTasks > 0 ? ((completedTasks / totalTasks) * 100).toFixed(1) : '0';

  if (isLLMConfigured()) {
    try {
      const prompt = `Write an executive summary for a digital marketing assignment report:
Project: ${project.name}
Business: ${project.business?.name || 'N/A'}
Industry: ${project.business?.industry || 'N/A'}
Total Tasks: ${totalTasks}
Completed: ${completedTasks}
Completion: ${completionPct}%

Include:
1. Brief project overview
2. Assignment sections (Q1: Facebook/Meta, Q2: LinkedIn)
3. Current progress summary
4. Key accomplishments

Keep it professional, 200-300 words, markdown format.`;

      const response = await generateText(
        prompt,
        'You are a professional report writer creating an executive summary.',
        { temperature: 0.7, maxTokens: 800 }
      );

      return response.content;
    } catch (err) {
      logger.warn('Reports', `LLM summary generation failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  }

  const lines: string[] = [];
  lines.push(`Project: ${project.name}`);
  lines.push('');
  lines.push(`This report documents the Digital Marketing assignment completion for Hunarmand Punjab Batch-3.`);
  lines.push('');
  lines.push('## Assignment Overview');
  lines.push('- **Q1**: Facebook/Meta Business Page Setup, Marketing Strategy, and Ads Campaign');
  lines.push('- **Q2**: LinkedIn Profile Optimization, Company Page, and Lead Generation');
  lines.push('');
  lines.push('## Progress');
  lines.push(`- Total Tasks: ${totalTasks}`);
  lines.push(`- Completed: ${completedTasks}`);
  lines.push(`- Completion: ${completionPct}%`);
  return lines.join('\n');
}

function generateBusinessSection(project: Project): string {
  const biz = project.business;
  if (!biz) return 'No business profile defined.';

  const lines: string[] = [];
  lines.push(`**Business Name**: ${biz.name}`);
  lines.push(`**Industry**: ${biz.industry}`);
  lines.push(`**Location**: ${biz.location}`);
  if (biz.website) lines.push(`**Website**: ${biz.website}`);
  lines.push('');
  lines.push('**Description**:');
  lines.push(biz.description);
  lines.push('');

  if (biz.fourPs) {
    lines.push('### 4Ps Marketing Mix');
    lines.push(`- **Product**: ${biz.fourPs.product}`);
    lines.push(`- **Price**: ${biz.fourPs.price}`);
    lines.push(`- **Place**: ${biz.fourPs.place}`);
    lines.push(`- **Promotion**: ${biz.fourPs.promotion}`);
    lines.push('');
  }

  if (biz.fourAs) {
    lines.push('### 4As Framework');
    lines.push(`- **Acceptability**: ${biz.fourAs.acceptability}`);
    lines.push(`- **Affordability**: ${biz.fourAs.affordability}`);
    lines.push(`- **Accessibility**: ${biz.fourAs.accessibility}`);
    lines.push(`- **Awareness**: ${biz.fourAs.awareness}`);
  }

  return lines.join('\n');
}

function generateQ1Section(
  tasks: Task[],
  completed: number,
  blocked: number
): string {
  const lines: string[] = [];
  lines.push('## Facebook/Meta Assignment Progress');
  lines.push('');
  lines.push(`- **Total Tasks**: ${tasks.length}`);
  lines.push(`- **Completed**: ${completed}`);
  lines.push(`- **Blocked**: ${blocked}`);
  lines.push('');

  lines.push('### Key Milestones');
  const completedTasks = tasks.filter(t => t.state === 'COMPLETED' || t.state === 'VERIFIED');
  for (const task of completedTasks) {
    lines.push(`- [x] ${task.title}`);
  }

  const blockedTasks = tasks.filter(t => t.state === 'BLOCKED');
  if (blockedTasks.length > 0) {
    lines.push('');
    lines.push('### Pending Tasks (Blocked on Login)');
    for (const task of blockedTasks.slice(0, 5)) {
      lines.push(`- [ ] ${task.title}`);
    }
    if (blockedTasks.length > 5) {
      lines.push(`- ... and ${blockedTasks.length - 5} more`);
    }
  }

  return lines.join('\n');
}

function generateQ2Section(
  tasks: Task[],
  completed: number,
  blocked: number
): string {
  const lines: string[] = [];
  lines.push('## LinkedIn Assignment Progress');
  lines.push('');
  lines.push(`- **Total Tasks**: ${tasks.length}`);
  lines.push(`- **Completed**: ${completed}`);
  lines.push(`- **Blocked**: ${blocked}`);
  lines.push('');

  lines.push('### Key Milestones');
  const completedTasks = tasks.filter(t => t.state === 'COMPLETED' || t.state === 'VERIFIED');
  for (const task of completedTasks) {
    lines.push(`- [x] ${task.title}`);
  }

  const blockedTasks = tasks.filter(t => t.state === 'BLOCKED');
  if (blockedTasks.length > 0) {
    lines.push('');
    lines.push('### Pending Tasks (Blocked on Login)');
    for (const task of blockedTasks.slice(0, 5)) {
      lines.push(`- [ ] ${task.title}`);
    }
    if (blockedTasks.length > 5) {
      lines.push(`- ... and ${blockedTasks.length - 5} more`);
    }
  }

  return lines.join('\n');
}

function generateEvidenceSection(project: Project): string {
  const lines: string[] = [];
  lines.push('## Evidence Collection Summary');
  lines.push('');

  const captured = project.evidence.filter(e => e.status === 'CAPTURED').length;
  const verified = project.evidence.filter(e => e.verificationStatus === 'VERIFIED').length;
  const pending = project.evidence.filter(e => e.verificationStatus === 'PENDING').length;
  const missing = project.evidence.filter(
    e => e.status === 'ACTION_REQUIRED' || e.status === 'MISSING'
  ).length;

  lines.push(`| Status | Count |`);
  lines.push(`|--------|-------|`);
  lines.push(`| Total | ${project.evidence.length} |`);
  lines.push(`| Captured | ${captured} |`);
  lines.push(`| Verified | ${verified} |`);
  lines.push(`| Pending | ${pending} |`);
  lines.push(`| Missing | ${missing} |`);
  lines.push('');

  const q1Evidence = project.evidence.filter(e => e.requirementId.startsWith('Q1'));
  const q2Evidence = project.evidence.filter(e => e.requirementId.startsWith('Q2'));

  if (q1Evidence.length > 0) {
    lines.push('### Q1 Evidence');
    for (const ev of q1Evidence) {
      const status = ev.verificationStatus === 'VERIFIED' ? '[VERIFIED]' : `[${ev.status}]`;
      lines.push(`- ${status} ${ev.title}`);
      if (ev.screenshotPath) {
        lines.push(`  - Screenshot: ${ev.screenshotPath}`);
      }
    }
    lines.push('');
  }

  if (q2Evidence.length > 0) {
    lines.push('### Q2 Evidence');
    for (const ev of q2Evidence) {
      const status = ev.verificationStatus === 'VERIFIED' ? '[VERIFIED]' : `[${ev.status}]`;
      lines.push(`- ${status} ${ev.title}`);
      if (ev.screenshotPath) {
        lines.push(`  - Screenshot: ${ev.screenshotPath}`);
      }
    }
  }

  return lines.join('\n');
}

export async function generateFinalReport(project: Project): Promise<AssignmentReport> {
  return generateAssignmentReport(project);
}

export function exportReportToMarkdown(report: AssignmentReport): string {
  return exportAssignmentToMarkdown(report);
}

export function exportAssignmentToMarkdown(report: AssignmentReport): string {
  const lines: string[] = [
    `# ${report.projectName}`,
    '',
    `Generated: ${report.generatedAt.toISOString()}`,
    `QA Verified: ${report.qaVerified ? 'Yes' : 'No'}`,
    `Completion: ${report.completionPercentage.toFixed(1)}%`,
    '',
    '---',
    '',
  ];

  for (const section of report.sections) {
    lines.push(`## ${section.title}`);
    lines.push('');
    lines.push(section.content);
    lines.push('');

    if (section.evidence.length > 0) {
      lines.push('### Evidence Items');
      for (const ev of section.evidence) {
        const status = ev.verificationStatus === 'VERIFIED' ? '[VERIFIED]' : `[${ev.status}]`;
        lines.push(`- ${status} ${ev.title}`);
      }
      lines.push('');
    }
  }

  lines.push('---');
  lines.push('');
  lines.push('## Appendix: Task Details');
  lines.push('');

  lines.push('### Q1 Tasks');
  lines.push('| Task | Status |');
  lines.push('|------|--------|');
  for (const section of report.sections) {
    if (section.title.includes('Q1')) {
      lines.push(`| ${section.title} | - |`);
    }
  }
  lines.push('');

  return lines.join('\n');
}

export function saveAssignmentReport(
  project: Project,
  report: AssignmentReport
): string | null {
  if (!existsSync(REPORTS_DIR)) {
    mkdirSync(REPORTS_DIR, { recursive: true });
  }

  const markdown = exportAssignmentToMarkdown(report);
  const filename = `${project.name.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()}-report.md`;
  const filepath = join(REPORTS_DIR, filename);

  try {
    writeFileSync(filepath, markdown, 'utf-8');
    logger.info('Reports', `Saved assignment report to: ${filepath}`);
    return filepath;
  } catch (err) {
    logger.error('Reports', `Failed to save report: ${err}`);
    return null;
  }
}
