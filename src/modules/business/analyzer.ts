import type { BusinessProfile, CustomerPersona, FourPs, FourAs } from '../../types/index.js';
import { saveProject } from '../../core/state.js';
import { logger } from '../../core/logger.js';
import type { Project } from '../../types/index.js';

export function createBusinessProfile(
  project: Project,
  name: string,
  industry: string,
  location: string,
  description: string,
  website?: string
): BusinessProfile {
  const profile: BusinessProfile = {
    id: crypto.randomUUID(),
    name,
    industry,
    location,
    website,
    description,
    targetMarket: [],
    customerPersonas: [],
    fourPs: { product: '', price: '', place: '', promotion: '' },
    fourAs: { acceptability: '', affordability: '', accessibility: '', awareness: '' },
    usp: '',
    offers: [],
  };

  project.business = profile;
  saveProject(project, 'create_business');
  logger.info('BusinessAnalyzer', `Created business profile: ${name}`);
  return profile;
}

export function updateBusinessProfile(
  project: Project,
  updates: Partial<Omit<BusinessProfile, 'id' | 'createdAt'>>
): BusinessProfile | null {
  if (!project.business) {
    logger.error('BusinessAnalyzer', 'No business profile exists');
    return null;
  }

  Object.assign(project.business, updates);
  saveProject(project, 'update_business');
  logger.info('BusinessAnalyzer', `Updated business profile: ${project.business.name}`);
  return project.business;
}

export function addCustomerPersona(
  project: Project,
  persona: Omit<CustomerPersona, 'id'>
): CustomerPersona | null {
  if (!project.business) {
    logger.error('BusinessAnalyzer', 'No business profile exists');
    return null;
  }

  const newPersona: CustomerPersona = {
    id: crypto.randomUUID(),
    ...persona,
  };

  project.business.customerPersonas.push(newPersona);
  saveProject(project, 'add_persona');
  logger.info('BusinessAnalyzer', `Added persona: ${newPersona.name}`);
  return newPersona;
}

export function updateFourPs(
  project: Project,
  fourPs: Partial<FourPs>
): FourPs | null {
  if (!project.business) {
    logger.error('BusinessAnalyzer', 'No business profile exists');
    return null;
  }

  Object.assign(project.business.fourPs, fourPs);
  saveProject(project, 'update_4ps');
  logger.info('BusinessAnalyzer', 'Updated 4Ps');
  return project.business.fourPs;
}

export function updateFourAs(
  project: Project,
  fourAs: Partial<FourAs>
): FourAs | null {
  if (!project.business) {
    logger.error('BusinessAnalyzer', 'No business profile exists');
    return null;
  }

  Object.assign(project.business.fourAs, fourAs);
  saveProject(project, 'update_4as');
  logger.info('BusinessAnalyzer', 'Updated 4As');
  return project.business.fourAs;
}

export function generateBusinessAnalysisReport(project: Project): string {
  if (!project.business) {
    return 'No business profile available.';
  }

  const b = project.business;
  const lines: string[] = [
    '# Business Analysis Report',
    '',
    `## ${b.name}`,
    `- Industry: ${b.industry}`,
    `- Location: ${b.location}`,
    `- Website: ${b.website || 'N/A'}`,
    '',
    '### Description',
    b.description,
    '',
    '### Target Market',
    ...b.targetMarket.map(t => `- ${t}`),
    '',
    '### Customer Personas',
    ...b.customerPersonas.map(p => [
      `#### ${p.name}`,
      `- Age: ${p.age}`,
      `- Gender: ${p.gender}`,
      `- Location: ${p.location}`,
      `- Interests: ${p.interests.join(', ')}`,
      `- Pain Points: ${p.painPoints.join(', ')}`,
      `- Goals: ${p.goals.join(', ')}`,
    ].join('\n')),
    '',
    '### 4Ps Marketing Mix',
    `- Product: ${b.fourPs.product}`,
    `- Price: ${b.fourPs.price}`,
    `- Place: ${b.fourPs.place}`,
    `- Promotion: ${b.fourPs.promotion}`,
    '',
    '### 4As Framework',
    `- Acceptability: ${b.fourAs.acceptability}`,
    `- Affordability: ${b.fourAs.affordability}`,
    `- Accessibility: ${b.fourAs.accessibility}`,
    `- Awareness: ${b.fourAs.awareness}`,
    '',
    '### USP',
    b.usp,
    '',
    '### Offers',
    ...b.offers.map(o => `- ${o}`),
  ];

  return lines.join('\n');
}
