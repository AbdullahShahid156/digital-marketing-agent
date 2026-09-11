import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('LLM Integration', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
    delete process.env.GROQ_API_KEY;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should detect when LLM is not configured', async () => {
    const { isLLMConfigured } = await import('../src/core/llm.js');
    expect(isLLMConfigured()).toBe(false);
  });

  it('should detect when LLM is configured', async () => {
    process.env.GROQ_API_KEY = 'test-key';
    const { isLLMConfigured } = await import('../src/core/llm.js');
    expect(isLLMConfigured()).toBe(true);
  });

  it('should throw error when generating text without API key', async () => {
    const { generateText } = await import('../src/core/llm.js');
    await expect(generateText('test prompt')).rejects.toThrow('GROQ_API_KEY environment variable is required');
  });
});
