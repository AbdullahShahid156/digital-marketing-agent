import type { Project, ContentCalendarItem } from '../../types/index.js';
import { saveProject } from '../../core/state.js';
import { logger } from '../../core/logger.js';

export function generateContentCalendar(
  project: Project,
  platform: string,
  days: number
): ContentCalendarItem[] {
  const calendar: ContentCalendarItem[] = [];
  const today = new Date();

  const contentTypes = ['Image', 'Video', 'Carousel', 'Story', 'Text Post'];
  const topics = ['Tips', 'Industry News', 'Case Study', 'Behind the Scenes', 'Testimonial'];

  for (let i = 0; i < days; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() + i);

    calendar.push({
      id: crypto.randomUUID(),
      date,
      platform,
      contentType: contentTypes[i % contentTypes.length],
      topic: topics[i % topics.length],
      copy: `Sample ${platform} content for ${topics[i % topics.length]}`,
      hashtags: ['#DigitalMarketing', '#Business'],
      status: 'PLANNED',
    });
  }

  project.content.push(...calendar);
  saveProject(project, 'create_content_calendar');
  logger.info('ContentAgent', `Generated ${days}-day ${platform} content calendar`);
  return calendar;
}

export function generateContentPillars(industry: string): string[] {
  const pillars: Record<string, string[]> = {
    Technology: ['Tech Innovation', 'Industry Trends', 'How-To Guides', 'Product Updates'],
    Healthcare: ['Health Tips', 'Industry News', 'Patient Stories', 'Medical Advances'],
    Education: ['Learning Tips', 'Student Success', 'Industry Insights', 'Course Updates'],
    Retail: ['Product Features', 'Customer Stories', 'Promotions', 'Lifestyle'],
  };

  return pillars[industry] || ['Industry Insights', 'Tips & Tricks', 'Case Studies', 'Company News'];
}

export function generateHashtags(industry: string, location: string): string[] {
  const base = ['#DigitalMarketing', '#Business', '#Marketing'];
  const industryTags: Record<string, string[]> = {
    Technology: ['#Tech', '#Innovation', '#Digital'],
    Healthcare: ['#Healthcare', '#Medical', '#Wellness'],
    Education: ['#Education', '#Learning', '#Training'],
    Retail: ['#Retail', '#Shopping', '#Ecommerce'],
  };

  return [...base, ...(industryTags[industry] || []), `#${location}`];
}
