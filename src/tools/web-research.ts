import { createTool, toolRegistry } from '../tools/registry.js';
import type { Tool, ToolResult } from '../tools/registry.js';

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

async function searchDuckDuckGo(query: string, numResults: number): Promise<SearchResult[]> {
  try {
    const encodedQuery = encodeURIComponent(query);
    const response = await fetch(
      `https://api.duckduckgo.com/?q=${encodedQuery}&format=json&no_html=1&skip_disambig=1`,
      {
        headers: {
          'User-Agent': 'HunarmandPunjabAgent/1.0',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`DuckDuckGo API error: ${response.status}`);
    }

    const data = await response.json() as {
      Abstract?: string;
      AbstractText?: string;
      AbstractSource?: string;
      AbstractURL?: string;
      Results?: Array<{ Text?: string; FirstURL?: string }>;
      RelatedTopics?: Array<{ Text?: string; FirstURL?: string }>;
    };

    const results: SearchResult[] = [];

    if (data.AbstractText && data.AbstractURL) {
      results.push({
        title: data.AbstractSource || query,
        url: data.AbstractURL,
        snippet: data.AbstractText,
      });
    }

    if (data.Results) {
      for (const item of data.Results) {
        if (item.Text && item.FirstURL) {
          results.push({
            title: item.Text.substring(0, 100),
            url: item.FirstURL,
            snippet: item.Text,
          });
        }
      }
    }

    if (data.RelatedTopics) {
      for (const item of data.RelatedTopics) {
        if (item.Text && item.FirstURL) {
          results.push({
            title: item.Text.substring(0, 100),
            url: item.FirstURL,
            snippet: item.Text,
          });
        }
      }
    }

    return results.slice(0, numResults);
  } catch {
    return [{
      title: `Search: ${query}`,
      url: `https://duckduckgo.com/?q=${encodeURIComponent(query)}`,
      snippet: `Search for "${query}" - API request failed, providing fallback link.`,
    }];
  }
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

      const results = await searchDuckDuckGo(query, numResults);

      return {
        success: true,
        data: {
          query,
          results,
          totalResults: results.length,
          fetchedAt: new Date(),
        },
        timestamp: new Date(),
      };
    }
  );
}

function extractTextFromHtml(html: string): string {
  let text = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  const title = titleMatch ? titleMatch[1].trim() : '';

  if (text.length > 5000) {
    text = text.substring(0, 5000) + '...';
  }

  return title ? `[${title}] ${text}` : text;
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

      try {
        const response = await fetch(url, {
          headers: {
            'User-Agent': 'HunarmandPunjabAgent/1.0',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          },
          redirect: 'follow',
        });

        if (!response.ok) {
          throw new Error(`HTTP error: ${response.status}`);
        }

        const html = await response.text();
        const content = extractTextFromHtml(html);

        return {
          success: true,
          data: {
            url,
            title: url,
            content,
            fetchedAt: new Date(),
          } as WebContent,
          timestamp: new Date(),
        };
      } catch (error) {
        return {
          success: false,
          error: `Failed to fetch URL: ${error instanceof Error ? error.message : 'Unknown error'}`,
          timestamp: new Date(),
        };
      }
    }
  );
}

export function registerWebResearchTools(): void {
  const tools = getWebResearchTools();
  for (const tool of tools) {
    try {
      toolRegistry.register(tool);
    } catch {
      // Tool already registered, skip
    }
  }
}

export async function executeTool(toolName: string, params: Record<string, unknown>): Promise<ToolResult> {
  const tool = toolRegistry.get(toolName);
  if (!tool) {
    return {
      success: false,
      error: `Tool not found: ${toolName}`,
      timestamp: new Date(),
    };
  }
  return tool.execute(params);
}

export function getWebResearchTools(): Tool[] {
  return [createWebSearchTool(), createWebFetchTool()];
}
