import { join } from 'node:path';
import { existsSync, readFileSync } from 'node:fs';
import { logger } from './logger.js';

export interface AgentConfig {
  browser: {
    headless: boolean;
    slowMo: number;
    profileName: string;
    timeout: number;
    viewport: { width: number; height: number };
    locale: string;
    timezone: string;
  };
  execution: {
    maxRetries: number;
    taskTimeout: number;
    retryDelay: number;
  };
  evidence: {
    dir: string;
    autoCapture: boolean;
  };
  llm: {
    provider: string;
    model: string;
    maxTokens: number;
    temperature: number;
  };
  logging: {
    level: string;
    file: string;
  };
}

const DEFAULT_CONFIG: AgentConfig = {
  browser: {
    headless: false,
    slowMo: 0,
    profileName: 'default',
    timeout: 30000,
    viewport: { width: 1280, height: 720 },
    locale: 'en-US',
    timezone: 'Asia/Karachi',
  },
  execution: {
    maxRetries: 3,
    taskTimeout: 120000,
    retryDelay: 1000,
  },
  evidence: {
    dir: join(process.cwd(), 'evidence'),
    autoCapture: true,
  },
  llm: {
    provider: 'groq',
    model: 'llama-3.3-70b-versatile',
    maxTokens: 1024,
    temperature: 0.7,
  },
  logging: {
    level: 'INFO',
    file: join(process.cwd(), 'logs', 'agent.log'),
  },
};

const CONFIG_FILE = join(process.cwd(), 'agent.config.json');

let cachedConfig: AgentConfig | null = null;

export function loadConfig(): AgentConfig {
  if (cachedConfig) return cachedConfig;

  let config = { ...DEFAULT_CONFIG };

  if (existsSync(CONFIG_FILE)) {
    try {
      const raw = readFileSync(CONFIG_FILE, 'utf-8');
      const fileConfig = JSON.parse(raw);
      config = mergeConfig(config, fileConfig);
      logger.info('Config', 'Loaded configuration from agent.config.json');
    } catch (err) {
      logger.warn('Config', 'Failed to load config file, using defaults');
    }
  }

  if (process.env.AGENT_CONFIG) {
    try {
      const envConfig = JSON.parse(process.env.AGENT_CONFIG);
      config = mergeConfig(config, envConfig);
      logger.info('Config', 'Loaded configuration from AGENT_CONFIG env var');
    } catch {
      logger.warn('Config', 'Failed to parse AGENT_CONFIG env var');
    }
  }

  cachedConfig = config;
  return config;
}

export function getConfig(): AgentConfig {
  if (!cachedConfig) return loadConfig();
  return cachedConfig;
}

export function updateConfig(partial: Partial<AgentConfig>): AgentConfig {
  const current = getConfig();
  cachedConfig = mergeConfig(current, partial);
  return cachedConfig;
}

function mergeConfig(base: AgentConfig, override: Partial<AgentConfig>): AgentConfig {
  return {
    browser: { ...base.browser, ...override.browser },
    execution: { ...base.execution, ...override.execution },
    evidence: { ...base.evidence, ...override.evidence },
    llm: { ...base.llm, ...override.llm },
    logging: { ...base.logging, ...override.logging },
  };
}
