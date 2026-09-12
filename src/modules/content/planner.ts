import type { Project, ContentCalendarItem } from '../../types/index.js';
import { saveProject } from '../../core/state.js';
import { logger } from '../../core/logger.js';
import { generateText, generatePostCaption, isLLMConfigured } from '../../core/llm.js';

export async function generateContentCalendar(
  project: Project,
  platform: string,
  days: number
): Promise<ContentCalendarItem[]> {
  const calendar: ContentCalendarItem[] = [];
  const today = new Date();

  const contentTypes = ['Image', 'Video', 'Carousel', 'Story', 'Text Post'];
  const topics = ['Tips', 'Industry News', 'Case Study', 'Behind the Scenes', 'Testimonial'];

  const useLLM = isLLMConfigured();
  const businessName = project.business?.name || project.name || 'Digital Marketing Business';
  const industry = project.business?.industry || 'Digital Marketing';

  for (let i = 0; i < days; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() + i);

    let copy: string;
    let hashtags: string[];

    if (useLLM) {
      try {
        const topic = topics[i % topics.length];
        const response = await generatePostCaption(businessName, `${topic} for ${industry}`, platform as 'facebook' | 'linkedin');
        copy = response;

        const hashtagMatch = copy.match(/#[\w]+/g);
        hashtags = hashtagMatch || ['#DigitalMarketing', '#Business'];
      } catch (err) {
        logger.warn('ContentAgent', `LLM generation failed, using fallback: ${err instanceof Error ? err.message : 'Unknown error'}`);
        copy = `Sample ${platform} content for ${topics[i % topics.length]}`;
        hashtags = ['#DigitalMarketing', '#Business'];
      }
    } else {
      copy = `Sample ${platform} content for ${topics[i % topics.length]}`;
      hashtags = ['#DigitalMarketing', '#Business'];
    }

    calendar.push({
      id: crypto.randomUUID(),
      date,
      platform,
      contentType: contentTypes[i % contentTypes.length],
      topic: topics[i % topics.length],
      copy,
      hashtags,
      status: 'PLANNED',
    });
  }

  project.content.push(...calendar);
  saveProject(project, 'create_content_calendar');
  logger.info('ContentAgent', `Generated ${days}-day ${platform} content calendar`);
  return calendar;
}

export async function generateContentPillars(industry: string): Promise<string[]> {
  if (isLLMConfigured()) {
    try {
      const response = await generateText(
        `Generate 4 content pillars for a ${industry} business. These are main themes/categories for social media content. Return only the 4 pillar names, one per line.`,
        'You are a social media content strategist. Return concise pillar names only.',
        { temperature: 0.7, maxTokens: 256 }
      );
      const pillars = response.content.split('\n').filter(l => l.trim().length > 0).slice(0, 4);
      if (pillars.length >= 3) return pillars;
    } catch (err) {
      logger.warn('ContentAgent', `LLM pillar generation failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  }

  const pillars: Record<string, string[]> = {
    Technology: ['Tech Innovation', 'Industry Trends', 'How-To Guides', 'Product Updates'],
    Healthcare: ['Health Tips', 'Industry News', 'Patient Stories', 'Medical Advances'],
    Education: ['Learning Tips', 'Student Success', 'Industry Insights', 'Course Updates'],
    Retail: ['Product Features', 'Customer Stories', 'Promotions', 'Lifestyle'],
  };

  return pillars[industry] || ['Industry Insights', 'Tips & Tricks', 'Case Studies', 'Company News'];
}

export async function generateHashtags(industry: string, location: string): Promise<string[]> {
  if (isLLMConfigured()) {
    try {
      const response = await generateText(
        `Generate 8 relevant social media hashtags for a ${industry} business in ${location}. Return only hashtags, one per line, including the # symbol.`,
        'You are a social media hashtag expert. Return only hashtags.',
        { temperature: 0.7, maxTokens: 256 }
      );
      const tags = response.content.split('\n').filter(l => l.trim().startsWith('#')).slice(0, 8);
      if (tags.length >= 5) return tags;
    } catch (err) {
      logger.warn('ContentAgent', `LLM hashtag generation failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  }

  const base = ['#DigitalMarketing', '#Business', '#Marketing'];
  const industryTags: Record<string, string[]> = {
    Technology: ['#Tech', '#Innovation', '#Digital'],
    Healthcare: ['#Healthcare', '#Medical', '#Wellness'],
    Education: ['#Education', '#Learning', '#Training'],
    Retail: ['#Retail', '#Shopping', '#Ecommerce'],
  };

  return [...base, ...(industryTags[industry] || []), `#${location}`];
}
