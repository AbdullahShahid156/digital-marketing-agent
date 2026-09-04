import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import type { Project } from '../types/index.js';
import { logger } from './logger.js';

const DATA_DIR = join(process.cwd(), 'data');
const PROJECT_FILE = join(DATA_DIR, 'project.json');

function ensureDataDir(): void {
  if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true });
  }
}

export function loadProject(): Project | null {
  ensureDataDir();
  if (!existsSync(PROJECT_FILE)) {
    logger.info('State', 'No existing project found');
    return null;
  }
  try {
    const raw = readFileSync(PROJECT_FILE, 'utf-8');
    const project = JSON.parse(raw) as Project;
    logger.info('State', `Loaded project: ${project.name}`);
    return project;
  } catch (error) {
    logger.error('State', 'Failed to load project', error as Error);
    return null;
  }
}

export function saveProject(project: Project): void {
  ensureDataDir();
  try {
    project.updatedAt = new Date();
    writeFileSync(PROJECT_FILE, JSON.stringify(project, null, 2), 'utf-8');
    logger.info('State', `Saved project: ${project.name}`);
  } catch (error) {
    logger.error('State', 'Failed to save project', error as Error);
    throw error;
  }
}

export function createNewProject(name: string, description: string): Project {
  const project: Project = {
    id: crypto.randomUUID(),
    name,
    description,
    business: null,
    requirements: [],
    tasks: [],
    campaigns: [],
    content: [],
    prospects: [],
    outreach: [],
    evidence: [],
    status: 'INITIALIZING',
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  saveProject(project);
  return project;
}
