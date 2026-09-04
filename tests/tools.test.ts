import { describe, it, expect } from 'vitest';
import { ToolRegistry, createTool } from '../src/tools/registry.js';
import type { Tool } from '../src/tools/registry.js';

describe('Tool Registry', () => {
  it('should register and retrieve a tool', () => {
    const registry = new ToolRegistry();
    const tool = createTool(
      'test-tool',
      'A test tool',
      'testing',
      [{ name: 'input', type: 'string', description: 'Input', required: true }],
      async (params) => ({
        success: true,
        data: `Received: ${params.input}`,
        timestamp: new Date(),
      })
    );

    registry.register(tool);
    const retrieved = registry.get('test-tool');
    expect(retrieved).toBeDefined();
    expect(retrieved!.definition.name).toBe('test-tool');
  });

  it('should list tools', () => {
    const registry = new ToolRegistry();
    const tool1 = createTool('tool1', 'Tool 1', 'cat1', [], async () => ({ success: true, timestamp: new Date() }));
    const tool2 = createTool('tool2', 'Tool 2', 'cat2', [], async () => ({ success: true, timestamp: new Date() }));

    registry.register(tool1);
    registry.register(tool2);
    expect(registry.list()).toHaveLength(2);
  });

  it('should filter by category', () => {
    const registry = new ToolRegistry();
    const tool1 = createTool('tool1', 'Tool 1', 'cat1', [], async () => ({ success: true, timestamp: new Date() }));
    const tool2 = createTool('tool2', 'Tool 2', 'cat2', [], async () => ({ success: true, timestamp: new Date() }));

    registry.register(tool1);
    registry.register(tool2);
    expect(registry.listByCategory('cat1')).toHaveLength(1);
  });

  it('should execute a tool', async () => {
    const registry = new ToolRegistry();
    const tool = createTool(
      'echo',
      'Echo tool',
      'util',
      [{ name: 'message', type: 'string', description: 'Message', required: true }],
      async (params) => ({
        success: true,
        data: params.message,
        timestamp: new Date(),
      })
    );

    registry.register(tool);
    const result = await registry.execute('echo', { message: 'Hello' });
    expect(result.success).toBe(true);
    expect(result.data).toBe('Hello');
  });

  it('should handle missing required params', async () => {
    const registry = new ToolRegistry();
    const tool = createTool(
      'required-param-tool',
      'Tool with required param',
      'test',
      [{ name: 'required', type: 'string', description: 'Required', required: true }],
      async () => ({ success: true, timestamp: new Date() })
    );

    registry.register(tool);
    const result = await registry.execute('required-param-tool', {});
    expect(result.success).toBe(false);
    expect(result.error).toContain('Missing required parameter');
  });

  it('should handle unknown tool', async () => {
    const registry = new ToolRegistry();
    const result = await registry.execute('nonexistent', {});
    expect(result.success).toBe(false);
    expect(result.error).toContain('Tool not found');
  });

  it('should unregister tools', () => {
    const registry = new ToolRegistry();
    const tool = createTool('temp', 'Temp', 'test', [], async () => ({ success: true, timestamp: new Date() }));
    registry.register(tool);
    expect(registry.unregister('temp')).toBe(true);
    expect(registry.get('temp')).toBeUndefined();
  });
});
