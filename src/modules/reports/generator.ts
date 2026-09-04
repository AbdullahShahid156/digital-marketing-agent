import type { Project, EvidenceItem } from '../../types/index.js';

export interface ReportSection {
  title: string;
  content: string;
  evidence: EvidenceItem[];
}

export interface FinalReport {
  projectName: string;
  generatedAt: Date;
  sections: ReportSection[];
  completionPercentage: number;
  totalTasks: number;
  completedTasks: number;
}

export function generateFinalReport(project: Project): FinalReport {
  const sections: ReportSection[] = [];

  sections.push({
    title: 'Executive Summary',
    content: `This report covers the Digital Marketing project for ${project.business?.name || 'TBD'}.`,
    evidence: [],
  });

  if (project.business) {
    sections.push({
      title: 'Business Analysis',
      content: `Business: ${project.business.name}\nIndustry: ${project.business.industry}\nLocation: ${project.business.location}`,
      evidence: project.evidence.filter(e => e.requirementId.includes('Q1')),
    });
  }

  sections.push({
    title: 'Facebook/Meta Marketing',
    content: `Campaigns: ${project.campaigns.filter(c => c.platform === 'meta').length}`,
    evidence: project.evidence.filter(e => e.title.includes('Facebook')),
  });

  sections.push({
    title: 'LinkedIn Marketing',
    content: `Profile optimization and company page setup completed.`,
    evidence: project.evidence.filter(e => e.title.includes('LinkedIn')),
  });

  const totalTasks = project.tasks.length;
  const completedTasks = project.tasks.filter(
    t => t.state === 'COMPLETED' || t.state === 'VERIFIED'
  ).length;

  return {
    projectName: project.name,
    generatedAt: new Date(),
    sections,
    completionPercentage: totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0,
    totalTasks,
    completedTasks,
  };
}

export function exportReportToMarkdown(report: FinalReport): string {
  const lines: string[] = [
    `# ${report.projectName}`,
    '',
    `Generated: ${report.generatedAt.toISOString()}`,
    `Completion: ${report.completionPercentage.toFixed(1)}%`,
    '',
  ];

  for (const section of report.sections) {
    lines.push(`## ${section.title}`);
    lines.push('');
    lines.push(section.content);
    lines.push('');

    if (section.evidence.length > 0) {
      lines.push('### Evidence');
      for (const ev of section.evidence) {
        lines.push(`- [${ev.status}] ${ev.title}`);
      }
      lines.push('');
    }
  }

  return lines.join('\n');
}
