import { describe, it, expect } from 'vitest';
import { createWebSearchTool, createWebFetchTool } from '../src/tools/web-research.js';

describe('Web Research Tools', () => {
  it('should create web search tool', async () => {
    const tool = createWebSearchTool();
    expect(tool.definition.name).toBe('web_search');
    expect(tool.definition.description).toBe('Search the web for information');
  });

  it('should search DuckDuckGo and return results', async () => {
    const tool = createWebSearchTool();
    const result = await tool.execute({ query: 'digital marketing Pakistan' });

    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
    expect(result.data.query).toBe('digital marketing Pakistan');
    expect(result.data.results).toBeInstanceOf(Array);
    expect(result.data.results.length).toBeGreaterThanOrEqual(0);
  });

  it('should respect numResults parameter', async () => {
    const tool = createWebSearchTool();
    const result = await tool.execute({ query: 'test query', numResults: 2 });

    expect(result.success).toBe(true);
    expect(result.data.results.length).toBeLessThanOrEqual(2);
  });

  it('should create web fetch tool', async () => {
    const tool = createWebFetchTool();
    expect(tool.definition.name).toBe('web_fetch');
    expect(tool.definition.description).toBe('Fetch content from a URL');
  });

  it('should fetch real web content', async () => {
    const tool = createWebFetchTool();
    const result = await tool.execute({ url: 'https://example.com' });

    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
    expect(result.data.url).toBe('https://example.com');
    expect(result.data.content).toBeDefined();
    expect(typeof result.data.content).toBe('string');
    expect(result.data.content.length).toBeGreaterThan(0);
  });

  it('should handle invalid URLs gracefully', async () => {
    const tool = createWebFetchTool();
    const result = await tool.execute({ url: 'https://this-domain-does-not-exist-12345.com' });

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });
});
