export interface ToolParameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  description: string;
  required: boolean;
  default?: unknown;
}

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: ToolParameter[];
  category: string;
}

export interface ToolResult {
  success: boolean;
  data?: unknown;
  error?: string;
  timestamp: Date;
}

export type ToolExecutor = (params: Record<string, unknown>) => Promise<ToolResult>;

export interface Tool {
  definition: ToolDefinition;
  execute: ToolExecutor;
}

export class ToolRegistry {
  private tools: Map<string, Tool> = new Map();

  register(tool: Tool): void {
    if (this.tools.has(tool.definition.name)) {
      throw new Error(`Tool already registered: ${tool.definition.name}`);
    }
    this.tools.set(tool.definition.name, tool);
  }

  unregister(name: string): boolean {
    return this.tools.delete(name);
  }

  get(name: string): Tool | undefined {
    return this.tools.get(name);
  }

  list(): ToolDefinition[] {
    return Array.from(this.tools.values()).map(t => t.definition);
  }

  listByCategory(category: string): ToolDefinition[] {
    return this.list().filter(t => t.category === category);
  }

  async execute(name: string, params: Record<string, unknown>): Promise<ToolResult> {
    const tool = this.tools.get(name);
    if (!tool) {
      return {
        success: false,
        error: `Tool not found: ${name}`,
        timestamp: new Date(),
      };
    }

    const validation = this.validateParams(tool.definition, params);
    if (!validation.success) {
      return {
        success: false,
        error: validation.error,
        timestamp: new Date(),
      };
    }

    return tool.execute(params);
  }

  private validateParams(
    definition: ToolDefinition,
    params: Record<string, unknown>
  ): { success: boolean; error?: string } {
    for (const param of definition.parameters) {
      if (param.required && !(param.name in params)) {
        return {
          success: false,
          error: `Missing required parameter: ${param.name}`,
        };
      }
      if (param.name in params) {
        const value = params[param.name];
        if (typeof value !== param.type && param.type !== 'object' && param.type !== 'array') {
          return {
            success: false,
            error: `Invalid type for parameter ${param.name}: expected ${param.type}`,
          };
        }
      }
    }
    return { success: true };
  }
}

export const toolRegistry = new ToolRegistry();

export function createTool(
  name: string,
  description: string,
  category: string,
  parameters: ToolParameter[],
  executor: ToolExecutor
): Tool {
  return {
    definition: { name, description, parameters, category },
    execute: executor,
  };
}
