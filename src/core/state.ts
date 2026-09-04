import { readFileSync, writeFileSync, existsSync, mkdirSync, copyFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import type { Project } from '../types/index.js';
import { logger } from './logger.js';

const DATA_DIR = join(process.cwd(), 'data');
const PROJECT_FILE = join(DATA_DIR, 'project.json');
const HISTORY_DIR = join(DATA_DIR, 'history');

export interface StateSnapshot {
  timestamp: Date;
  action: string;
  data: Project;
}

function ensureDataDir(): void {
  if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!existsSync(HISTORY_DIR)) {
    mkdirSync(HISTORY_DIR, { recursive: true });
  }
}

function createBackup(action: string): void {
  if (!existsSync(PROJECT_FILE)) return;
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupFile = join(HISTORY_DIR, `${action}_${timestamp}.json`);
  try {
    copyFileSync(PROJECT_FILE, backupFile);
    logger.debug('State', `Backup created: ${backupFile}`);
  } catch (error) {
    logger.warn('State', `Failed to create backup: ${error}`);
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
    project.createdAt = new Date(project.createdAt);
    project.updatedAt = new Date(project.updatedAt);
    logger.info('State', `Loaded project: ${project.name}`);
    return project;
  } catch (error) {
    logger.error('State', 'Failed to load project', error as Error);
    return null;
  }
}

export function saveProject(project: Project, action: string = 'update'): void {
  ensureDataDir();
  
  if (existsSync(PROJECT_FILE)) {
    createBackup(action);
  }
  
  try {
    project.updatedAt = new Date();
    const tempFile = PROJECT_FILE + '.tmp';
    writeFileSync(tempFile, JSON.stringify(project, null, 2), 'utf-8');
    writeFileSync(PROJECT_FILE, readFileSync(tempFile), 'utf-8');
    logger.info('State', `Saved project: ${project.name} (action: ${action})`);
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
  saveProject(project, 'create');
  return project;
}

export function getHistoryFiles(): string[] {
  ensureDataDir();
  return readdirSync(HISTORY_DIR)
    .filter((f: string) => f.endsWith('.json'))
    .sort()
    .reverse();
}

export function loadFromHistory(filename: string): Project | null {
  const filePath = join(HISTORY_DIR, filename);
  if (!existsSync(filePath)) {
    logger.error('State', `History file not found: ${filename}`);
    return null;
  }
  try {
    const raw = readFileSync(filePath, 'utf-8');
    return JSON.parse(raw) as Project;
  } catch (error) {
    logger.error('State', `Failed to load history: ${filename}`, error as Error);
    return null;
  }
}
