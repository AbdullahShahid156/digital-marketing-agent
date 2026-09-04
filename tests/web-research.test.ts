import { describe, it, expect } from 'vitest';
import { createWebSearchTool, createWebFetchTool } from '../src/tools/web-research.js';

describe('Web Research Tools', () => {
  it('should create web search tool', async () => {
    const tool = createWebSearchTool();
    expect(tool.definition.name).toBe('web_search');

    const result = await tool.execute({ query: 'digital marketing Pakistan' });
    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
  });

  it('should create web fetch tool', async () => {
    const tool = createWebFetchTool();
    expect(tool.definition.name).toBe('web_fetch');

    const result = await tool.execute({ url: 'https://example.com' });
    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
  });
});
