import type { Project, OutreachMessage } from '../../types/index.js';
import { saveProject } from '../../core/state.js';
import { logger } from '../../core/logger.js';
import { generateText, isLLMConfigured } from '../../core/llm.js';

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

export async function generatePersonalizedMessage(
  prospectName: string,
  companyName: string,
  industry: string,
  type: 'connection' | 'initial' | 'followup',
  channel: 'linkedin' | 'email'
): Promise<string> {
  if (!isLLMConfigured()) {
    return getFallbackMessage(type, channel);
  }

  try {
    const systemPrompt = `You are a professional outreach specialist. Generate personalized, concise ${channel} messages that feel genuine and build rapport. Keep messages under 150 words.`;

    const typeDescriptions: Record<string, string> = {
      connection: 'a LinkedIn connection request (very short, 2-3 sentences)',
      initial: 'an initial outreach message introducing yourself and your services',
      followup: 'a follow-up message referencing previous contact',
    };

    const prompt = `Generate ${typeDescriptions[type]} for:
- Recipient: ${prospectName}
- Company: ${companyName}
- Industry: ${industry}
- Channel: ${channel}

Make it personal, professional, and action-oriented. Do not use placeholders like [Name].`;

    const response = await generateText(prompt, systemPrompt, { temperature: 0.7, maxTokens: 300 });
    return response.content;
  } catch (err) {
    logger.warn('OutreachAgent', `LLM generation failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    return getFallbackMessage(type, channel);
  }
}

function getFallbackMessage(type: string, channel: string): string {
  const templates: Record<string, string> = {
    linkedin_connection: `Hi, I'd love to connect and learn more about your work in the industry.`,
    linkedin_initial: `Hi, I noticed your company is doing great work. I'd love to connect and discuss how we might collaborate.`,
    linkedin_followup: `Hi, I wanted to follow up on my previous message. Would you be available for a quick chat?`,
    email_initial: `Subject: Partnership Opportunity\n\nHi,\n\nI came across your company and was impressed. I'd like to explore collaboration opportunities.`,
    email_followup: `Subject: Following Up\n\nHi,\n\nI wanted to circle back on my previous email. Are you available for a brief call?`,
  };

  return templates[`${channel}_${type}`] || `Hi, I'd like to connect with you.`;
}

export async function generateOutreachTemplates(): Promise<Record<string, string>> {
  if (isLLMConfigured()) {
    try {
      const { content: linkedinConn } = await generateText(
        'Write a LinkedIn connection request template for digital marketing outreach. Use [Name] and [Company] as placeholders. Keep it under 30 words.',
        'You are a LinkedIn outreach expert.',
        { temperature: 0.7, maxTokens: 150 }
      );
      const { content: linkedinInit } = await generateText(
        'Write a LinkedIn initial outreach message template for digital marketing services. Use [Name], [Company], [Industry] as placeholders. Under 50 words.',
        'You are a LinkedIn outreach expert.',
        { temperature: 0.7, maxTokens: 200 }
      );
      const { content: emailInit } = await generateText(
        'Write an email outreach template for digital marketing partnership. Use [Name], [Company], [Industry] as placeholders. Include subject line.',
        'You are an email marketing expert.',
        { temperature: 0.7, maxTokens: 250 }
      );

      return {
        linkedin_initial: linkedinInit,
        linkedin_followup: `Hi [Name], I wanted to follow up on my previous message. Would you be available for a quick chat this week?`,
        email_initial: emailInit,
        email_followup: `Subject: Following Up\n\nHi [Name],\n\nI wanted to circle back on my previous email. Are you available for a brief call?`,
      };
    } catch (err) {
      logger.warn('OutreachAgent', `LLM template generation failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  }

  return {
    linkedin_initial: `Hi [Name], I noticed your company [Company] is doing great work in [Industry]. I'd love to connect and discuss how we might collaborate.`,
    linkedin_followup: `Hi [Name], I wanted to follow up on my previous message. Would you be available for a quick chat this week?`,
    email_initial: `Subject: Partnership Opportunity\n\nDear [Name],\n\nI came across [Company] and was impressed by your work. I'd like to explore potential collaboration opportunities.`,
    email_followup: `Subject: Following Up\n\nHi [Name],\n\nI wanted to circle back on my previous email. Are you available for a brief call?`,
  };
}
