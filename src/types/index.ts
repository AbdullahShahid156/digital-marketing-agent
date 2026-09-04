export type TaskState =
  | 'PENDING'
  | 'IN_PROGRESS'
  | 'BLOCKED'
  | 'ACTION_REQUIRED'
  | 'TESTING'
  | 'FAILED'
  | 'COMPLETED'
  | 'VERIFIED';

export type RequirementPriority = 'high' | 'medium' | 'low';

export interface Requirement {
  id: string;
  section: string;
  title: string;
  description: string;
  priority: RequirementPriority;
  automatable: boolean;
  tasks: Task[];
}

export interface Task {
  id: string;
  requirementId: string;
  title: string;
  description: string;
  state: TaskState;
  assignee?: string;
  dependencies: string[];
  evidence?: EvidenceItem[];
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
}

export interface EvidenceItem {
  id: string;
  requirementId: string;
  taskId: string;
  title: string;
  description: string;
  expectedScreen: string;
  status: 'ACTION_REQUIRED' | 'CAPTURED' | 'VERIFIED' | 'MISSING';
  screenshotPath?: string;
  verificationStatus: 'PENDING' | 'VERIFIED' | 'FAILED';
  notes?: string;
  createdAt: Date;
}

export interface BusinessProfile {
  id: string;
  name: string;
  industry: string;
  location: string;
  website?: string;
  description: string;
  targetMarket: string[];
  customerPersonas: CustomerPersona[];
  fourPs: FourPs;
  fourAs: FourAs;
  usp: string;
  offers: string[];
}

export interface CustomerPersona {
  id: string;
  name: string;
  age: string;
  gender: string;
  location: string;
  interests: string[];
  painPoints: string[];
  goals: string[];
}

export interface FourPs {
  product: string;
  price: string;
  place: string;
  promotion: string;
}

export interface FourAs {
  acceptability: string;
  affordability: string;
  accessibility: string;
  awareness: string;
}

export interface Campaign {
  id: string;
  platform: 'meta' | 'linkedin';
  name: string;
  objective: string;
  audience: AudienceDefinition;
  budget: string;
  schedule: string;
  adSets: AdSet[];
  status: 'PLANNING' | 'READY' | 'ACTIVE' | 'PAUSED' | 'COMPLETED';
}

export interface AudienceDefinition {
  demographics: string[];
  interests: string[];
  behaviors: string[];
  locations: string[];
  customAudiences?: string[];
}

export interface AdSet {
  id: string;
  name: string;
  audience: AudienceDefinition;
  budget: string;
  ads: Ad[];
}

export interface Ad {
  id: string;
  name: string;
  headline: string;
  primaryText: string;
  description?: string;
  callToAction: string;
  creativeType: string;
  destinationUrl?: string;
}

export interface ContentCalendarItem {
  id: string;
  date: Date;
  platform: string;
  contentType: string;
  topic: string;
  copy: string;
  hashtags: string[];
  status: 'PLANNED' | 'DRAFTED' | 'SCHEDULED' | 'PUBLISHED';
}

export interface Prospect {
  id: string;
  businessName: string;
  industry: string;
  location: string;
  website?: string;
  socialPresence: string[];
  potentialProblems: string[];
  recommendedServices: string[];
  qualificationReason: string;
  source: string;
  verificationStatus: 'UNVERIFIED' | 'VERIFIED' | 'DISQUALIFIED';
  outreachStatus: 'NOT_CONTACTED' | 'CONTACTED' | 'RESPONDED' | 'FOLLOW_UP' | 'CONVERTED';
}

export interface OutreachMessage {
  id: string;
  prospectId: string;
  type: 'initial' | 'follow_up_1' | 'follow_up_2' | 'final';
  channel: 'linkedin' | 'email';
  subject?: string;
  content: string;
  status: 'DRAFT' | 'SENT' | 'DELIVERED' | 'READ' | 'RESPONDED';
  sentAt?: Date;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  business: BusinessProfile | null;
  requirements: Requirement[];
  tasks: Task[];
  campaigns: Campaign[];
  content: ContentCalendarItem[];
  prospects: Prospect[];
  outreach: OutreachMessage[];
  evidence: EvidenceItem[];
  status: 'INITIALIZING' | 'IN_PROGRESS' | 'COMPLETED' | 'VERIFIED';
  createdAt: Date;
  updatedAt: Date;
}

export interface QACheckResult {
  category: string;
  item: string;
  status: 'PASS' | 'FAIL' | 'WARNING' | 'SKIP';
  details: string;
}
