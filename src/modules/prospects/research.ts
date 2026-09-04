import type { Project, Prospect } from '../../types/index.js';
import { saveProject } from '../../core/state.js';
import { logger } from '../../core/logger.js';

export function addProspect(
  project: Project,
  prospect: Omit<Prospect, 'id'>
): Prospect {
  const newProspect: Prospect = {
    id: crypto.randomUUID(),
    ...prospect,
  };

  project.prospects.push(newProspect);
  saveProject(project, 'add_prospect');
  logger.info('ProspectResearch', `Added prospect: ${prospect.businessName}`);
  return newProspect;
}

export function qualifyProspect(
  project: Project,
  prospectId: string,
  qualified: boolean
): Prospect | null {
  const prospect = project.prospects.find(p => p.id === prospectId);
  if (!prospect) return null;

  prospect.verificationStatus = qualified ? 'VERIFIED' : 'DISQUALIFIED';
  saveProject(project, 'qualify_prospect');
  logger.info('ProspectResearch', `Prospect ${prospect.businessName}: ${qualified ? 'QUALIFIED' : 'DISQUALIFIED'}`);
  return prospect;
}

export function generateProspectReport(project: Project): string {
  const prospects = project.prospects;
  const qualified = prospects.filter(p => p.verificationStatus === 'VERIFIED').length;
  const contacted = prospects.filter(p => p.outreachStatus !== 'NOT_CONTACTED').length;

  return `# Prospect Report\n\nTotal: ${prospects.length}\nQualified: ${qualified}\nContacted: ${contacted}`;
}
