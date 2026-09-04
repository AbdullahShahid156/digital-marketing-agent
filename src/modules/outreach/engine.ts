import type { Project, OutreachMessage } from '../../types/index.js';
import { saveProject } from '../../core/state.js';
import { logger } from '../../core/logger.js';

export function createOutreachMessage(
  project: Project,
  prospectId: string,
  type: OutreachMessage['type'],
  channel: OutreachMessage['channel'],
  subject: string | undefined,
  content: string
): OutreachMessage {
  const message: OutreachMessage = {
    id: crypto.randomUUID(),
    prospectId,
    type,
    channel,
    subject,
    content,
    status: 'DRAFT',
  };

  project.outreach.push(message);
  saveProject(project, 'create_outreach');
  logger.info('OutreachAgent', `Created ${type} ${channel} message for prospect ${prospectId}`);
  return message;
}

export function generateOutreachTemplates(): Record<string, string> {
  return {
    linkedin_initial: `Hi [Name], I noticed your company [Company] is doing great work in [Industry]. I'd love to connect and discuss how we might collaborate.`,
    linkedin_followup: `Hi [Name], I wanted to follow up on my previous message. Would you be available for a quick chat this week?`,
    email_initial: `Subject: Partnership Opportunity\n\nDear [Name],\n\nI came across [Company] and was impressed by your work. I'd like to explore potential collaboration opportunities.`,
    email_followup: `Subject: Following Up\n\nHi [Name],\n\nI wanted to circle back on my previous email. Are you available for a brief call?`,
  };
}
