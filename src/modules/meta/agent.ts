import type { Project, Campaign, AdSet, Ad } from '../../types/index.js';
import { saveProject } from '../../core/state.js';
import { logger } from '../../core/logger.js';

export interface FacebookPageOptimization {
  profilePhoto: string;
  coverPhoto: string;
  aboutSection: string;
  contactInfo: string;
  ctaButton: string;
  pageVisibility: string;
}

export interface LeadGenForm {
  id: string;
  name: string;
  headline: string;
  offer: string;
  fields: string[];
  cta: string;
  thankYouMessage: string;
  followUpMessage: string;
}

export interface ABTest {
  id: string;
  name: string;
  type: 'creative' | 'headline' | 'audience' | 'cta';
  variantA: string;
  variantB: string;
  status: 'PLANNING' | 'RUNNING' | 'COMPLETED';
}

export interface MetaBusinessSuite {
  inboxAutoReplies: boolean;
  autoReplyMessage: string;
  contentScheduler: boolean;
  weeklyContentPlan: string[];
}

export interface ContentCalendarItem {
  id: string;
  date: string;
  platform: string;
  contentType: string;
  topic: string;
  copy: string;
  hashtags: string[];
  status: 'PLANNED' | 'DRAFTED' | 'SCHEDULED' | 'PUBLISHED';
}

export function createFacebookCampaign(
  project: Project,
  name: string,
  objective: string,
  budget: string
): Campaign {
  const campaign: Campaign = {
    id: crypto.randomUUID(),
    platform: 'meta',
    name,
    objective,
    audience: { demographics: [], interests: [], behaviors: [], locations: [] },
    budget,
    schedule: '',
    adSets: [],
    status: 'PLANNING',
  };

  project.campaigns.push(campaign);
  saveProject(project, 'create_fb_campaign');
  logger.info('FacebookAgent', `Created Facebook campaign: ${name}`);
  return campaign;
}

export function createAdSet(
  project: Project,
  campaignId: string,
  name: string,
  budget: string
): AdSet | null {
  const campaign = project.campaigns.find(c => c.id === campaignId);
  if (!campaign) {
    logger.error('FacebookAgent', `Campaign not found: ${campaignId}`);
    return null;
  }

  const adSet: AdSet = {
    id: crypto.randomUUID(),
    name,
    audience: { demographics: [], interests: [], behaviors: [], locations: [] },
    budget,
    ads: [],
  };

  campaign.adSets.push(adSet);
  saveProject(project, 'create_adset');
  logger.info('FacebookAgent', `Created ad set: ${name}`);
  return adSet;
}

export function createAd(
  project: Project,
  campaignId: string,
  adSetId: string,
  ad: Omit<Ad, 'id'>
): Ad | null {
  const campaign = project.campaigns.find(c => c.id === campaignId);
  if (!campaign) return null;

  const adSet = campaign.adSets.find(a => a.id === adSetId);
  if (!adSet) return null;

  const newAd: Ad = {
    id: crypto.randomUUID(),
    ...ad,
  };

  adSet.ads.push(newAd);
  saveProject(project, 'create_ad');
  logger.info('FacebookAgent', `Created ad: ${ad.headline}`);
  return newAd;
}

export function createLeadGenForm(
  name: string,
  headline: string,
  offer: string,
  fields: string[],
  cta: string
): LeadGenForm {
  const form: LeadGenForm = {
    id: crypto.randomUUID(),
    name,
    headline,
    offer,
    fields,
    cta,
    thankYouMessage: `Thank you for your interest! We'll contact you shortly.`,
    followUpMessage: `Hi! Thanks for signing up for ${offer}. Would you like to know more?`,
  };

  logger.info('FacebookAgent', `Created Lead Gen Form: ${name}`);
  return form;
}

export function createABTest(
  name: string,
  type: ABTest['type'],
  variantA: string,
  variantB: string
): ABTest {
  const test: ABTest = {
    id: crypto.randomUUID(),
    name,
    type,
    variantA,
    variantB,
    status: 'PLANNING',
  };

  logger.info('FacebookAgent', `Created A/B Test: ${name} (${type})`);
  return test;
}

export function generateMetaBusinessSuite(): MetaBusinessSuite {
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const contentTypes = ['Industry Tips', 'Customer Story', 'Product Feature', 'Behind the Scenes', 'Engagement Post', 'Promotional', 'Community Highlight'];

  const weeklyPlan = days.map((day, i) => `${day}: ${contentTypes[i]}`);

  logger.info('FacebookAgent', 'Generated Meta Business Suite config');
  return {
    inboxAutoReplies: true,
    autoReplyMessage: 'Thanks for reaching out! We typically respond within 2 hours during business hours.',
    contentScheduler: true,
    weeklyContentPlan: weeklyPlan,
  };
}

export function generateContentCalendar(project: Project, days: number = 30): ContentCalendarItem[] {
  if (!project.business) {
    return [];
  }

  const calendar: ContentCalendarItem[] = [];
  const today = new Date();

  for (let i = 0; i < days; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() + i);

    const contentTypes = ['Image Post', 'Video Post', 'Carousel', 'Story', 'Reel'];
    const topics = ['Tips', 'Industry News', 'Case Study', 'Behind the Scenes', 'Customer Testimonial'];

    calendar.push({
      id: crypto.randomUUID(),
      date: date.toISOString().split('T')[0],
      platform: 'Facebook',
      contentType: contentTypes[i % contentTypes.length],
      topic: topics[i % topics.length],
      copy: `Sample content for ${topics[i % topics.length]} post`,
      hashtags: ['#DigitalMarketing', '#Pakistan', '#Business'],
      status: 'PLANNED',
    });
  }

  logger.info('FacebookAgent', `Generated ${days}-day content calendar`);
  return calendar;
}

export function generateFacebookPageChecklist(): string[] {
  return [
    'Profile photo uploaded (professional, clear)',
    'Cover photo uploaded (branded, relevant)',
    'About section completed',
    'Contact information added',
    'CTA button configured',
    'Page visibility set to Public',
    'Business hours added',
    'Location/pin added',
    'Page templates selected',
    'Messaging settings configured',
    'Auto-reply messages set up',
    'Page roles assigned',
  ];
}

export function generateAdvancedPageSetup(): string[] {
  return [
    'Professional Dashboard accessed',
    'Page access roles configured (Admin, Editor, Moderator)',
    'Linked Instagram account',
    'Linked WhatsApp Business',
    'Page preferences configured',
    'Audience controls set',
    'Content moderation enabled',
    'Profanity filter activated',
    'Event creation feature enabled',
    'Collaboration features configured',
  ];
}

export function generateAdCopyVariations(headline: string, primaryText: string): Ad[] {
  return [
    {
      id: crypto.randomUUID(),
      name: `${headline} - Version A`,
      headline,
      primaryText,
      callToAction: 'Learn More',
      creativeType: 'Image',
    },
    {
      id: crypto.randomUUID(),
      name: `${headline} - Version B`,
      headline: headline + ' - Limited Time',
      primaryText: primaryText + ' Contact us today!',
      callToAction: 'Sign Up',
      creativeType: 'Video',
    },
    {
      id: crypto.randomUUID(),
      name: `${headline} - Version C`,
      headline: headline + ' - Special Offer',
      primaryText: primaryText + ' Get started now!',
      callToAction: 'Contact Us',
      creativeType: 'Carousel',
    },
  ];
}

export function generateCampaignStructure(campaignName: string, objective: string): string[] {
  return [
    `Campaign: ${campaignName}`,
    `  Objective: ${objective}`,
    '  Ad Set 1: Interest-Based Audience',
    '    Ad 1A: Image Ad - Learn More CTA',
    '    Ad 1B: Video Ad - Sign Up CTA',
    '  Ad Set 2: Lookalike Audience',
    '    Ad 2A: Carousel Ad - Shop Now CTA',
    '    Ad 2B: Single Image Ad - Contact Us CTA',
  ];
}
