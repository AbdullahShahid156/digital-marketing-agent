import { createTool } from '../tools/registry.js';
import type { Tool } from '../tools/registry.js';

export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
}

export interface WebContent {
  url: string;
  title: string;
  content: string;
  fetchedAt: Date;
}

export function createWebSearchTool(): Tool {
  return createTool(
    'web_search',
    'Search the web for information',
    'research',
    [
      { name: 'query', type: 'string', description: 'Search query', required: true },
      { name: 'numResults', type: 'number', description: 'Number of results', required: false, default: 5 },
    ],
    async (params) => {
      const query = params.query as string;
      const numResults = (params.numResults as number) || 5;

      const results: SearchResult[] = [
        {
          title: `Search result for: ${query}`,
          url: `https://example.com/search?q=${encodeURIComponent(query)}`,
          snippet: `This is a sample search result for "${query}". In production, this would connect to a real search API.`,
        },
      ];

      return {
        success: true,
        data: {
          query,
          results: results.slice(0, numResults),
          totalResults: results.length,
          fetchedAt: new Date(),
        },
        timestamp: new Date(),
      };
    }
  );
}

export function createWebFetchTool(): Tool {
  return createTool(
    'web_fetch',
    'Fetch content from a URL',
    'research',
    [
      { name: 'url', type: 'string', description: 'URL to fetch', required: true },
    ],
    async (params) => {
      const url = params.url as string;

      const content: WebContent = {
        url,
        title: `Content from ${url}`,
        content: `This is sample content from ${url}. In production, this would fetch real web content.`,
        fetchedAt: new Date(),
      };

      return {
        success: true,
        data: content,
        timestamp: new Date(),
      };
    }
  );
}

export function getWebResearchTools(): Tool[] {
  return [createWebSearchTool(), createWebFetchTool()];
}
