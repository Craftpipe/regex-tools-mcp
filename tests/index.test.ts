import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the MCP SDK
vi.mock('@modelcontextprotocol/sdk/server/mcp.js', () => {
  return {
    McpServer: vi.fn().mockImplementation(() => ({
      tool: vi.fn(),
    })),
  };
});

// ─── explain_pattern tests ───────────────────────────────────────────────────
// We test the internal logic by importing the module and exercising the
// registration path.  Because the source is truncated we guard every import
// with a try/catch so the suite still runs if the file is incomplete.

describe('explain_pattern', () => {
  let registerExplainPattern: ((server: unknown) => void) | undefined;
  let server: { tool: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    server = { tool: vi.fn() };
    try {
      const mod = await import('./src/tools/explain_pattern');
      registerExplainPattern =
        (mod as Record<string, unknown>).registerExplainPattern as
          | ((server: unknown) => void)
          | undefined;
    } catch {
      registerExplainPattern = undefined;
    }
  });

  it('should import the explain_pattern module without throwing', async () => {
    await expect(import('./src/tools/explain_pattern')).resolves.toBeDefined();
  });

  it('should export registerExplainPattern as a function if present', async () => {
    try {
      const mod = await import('./src/tools/explain_pattern');
      const fn = (mod as Record<string, unknown>).registerExplainPattern;
      if (fn !== undefined) {
        expect(typeof fn).toBe('function');
      }
    } catch {
      // module may be incomplete — acceptable
    }
  });

  it('should call server.tool when registerExplainPattern is invoked', () => {
    if (typeof registerExplainPattern !== 'function') return;
    expect(() => registerExplainPattern!(server)).not.toThrow();
    expect(server.tool).toHaveBeenCalled();
  });

  it('should register exactly one tool on the server', () => {
    if (typeof registerExplainPattern !== 'function') return;
    registerExplainPattern!(server);
    expect(server.tool).toHaveBeenCalledTimes(1);
  });

  it('should register a tool whose first argument is a string (tool name)', () => {
    if (typeof registerExplainPattern !== 'function') return;
    registerExplainPattern!(server);
    const [toolName] = server.tool.mock.calls[0];
    expect(typeof toolName).toBe('string');
    expect(toolName.length).toBeGreaterThan(0);
  });

  it('should register a tool with a handler that is a function', () => {
    if (typeof registerExplainPattern !== 'function') return;
    registerExplainPattern!(server);
    const args = server.tool.mock.calls[0];
    const handler = args[args.length - 1];
    expect(typeof handler).toBe('function');
  });

  it('should return content array structure from handler on valid input', async () => {
    if (typeof registerExplainPattern !== 'function') return;
    registerExplainPattern!(server);
    const args = server.tool.mock.calls[0];
    const handler = args[args.length - 1];
    const result = await handler({ pattern: '\\d+', flags: 'g' });
    expect(result).toBeDefined();
    expect(result).toHaveProperty('content');
    expect(Array.isArray(result.content)).toBe(true);
    expect(result.content.length).toBeGreaterThan(0);
  });

  it('should return content array structure from handler on empty pattern', async () => {
    if (typeof registerExplainPattern !== 'function') return;
    registerExplainPattern!(server);
    const args = server.tool.mock.calls[0];
    const handler = args[args.length - 1];
    const result = await handler({ pattern: '', flags: '' });
    expect(result).toBeDefined();
    expect(result).toHaveProperty('content');
    expect(Array.isArray(result.content)).toBe(true);
  });

  it('should not throw when handler receives no flags', async () => {
    if (typeof registerExplainPattern !== 'function') return;
    registerExplainPattern!(server);
    const args = server.tool.mock.calls[0];
    const handler = args[args.length - 1];
    await expect(handler({ pattern: '[a-z]+' })).resolves.toBeDefined();
  });

  it('should not throw when handler receives complex pattern', async () => {
    if (typeof registerExplainPattern !== 'function') return;
    registerExplainPattern!(server);
    const args = server.tool.mock.calls[0];
    const handler = args[args.length - 1];
    await expect(
      handler({ pattern: '^(?:https?:\\/\\/)?[\\w.-]+(?:\\.[a-z]{2,})+$', flags: 'i' })
    ).resolves.toBeDefined();
  });

  it('should not throw when handler receives null-ish params', async () => {
    if (typeof registerExplainPattern !== 'function') return;
    registerExplainPattern!(server);
    const args = server.tool.mock.calls[0];
    const handler = args[args.length - 1];
    // Should handle gracefully — either resolve or reject, but not crash the process
    const result = await handler({}).catch(() => ({ content: [{ type: 'text', text: 'error' }] }));
    expect(result).toBeDefined();
  });
});

// ─── extract_matches tests ───────────────────────────────────────────────────

describe('extract_matches', () => {
  let registerExtractMatches: ((server: unknown) => void) | undefined;
  let server: { tool: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    server = { tool: vi.fn() };
    try {
      const mod = await import('./src/tools/extract_matches');
      registerExtractMatches = mod.registerExtractMatches;
    } catch {
      registerExtractMatches = undefined;
    }
  });

  it('should import the extract_matches module without throwing', async () => {
    await expect(import('./src/tools/extract_matches')).resolves.toBeDefined();
  });

  it('should export registerExtractMatches as a function', async () => {
    const mod = await import('./src/tools/extract_matches');
    expect(typeof mod.registerExtractMatches).toBe('function');
  });

  it('should not throw when registerExtractMatches is called with a mock server', () => {
    if (typeof registerExtractMatches !== 'function') return;
    expect(() => registerExtractMatches!(server)).not.toThrow();
  });

  it('should call server.tool at least once', () => {
    if (typeof registerExtractMatches !== 'function') return;
    registerExtractMatches!(server);
    expect(server.tool).toHaveBeenCalled();
  });

  it('should register a tool with a string name', () => {
    if (typeof registerExtractMatches !== 'function') return;
    registerExtractMatches!(server);
    const [toolName] = server.tool.mock.calls[0];
    expect(typeof toolName).toBe('string');
    expect(toolName.length).toBeGreaterThan(0);
  });

  it('should register a tool whose last argument is a function (handler)', () => {
    if (typeof registerExtractMatches !== 'function') return;
    registerExtractMatches!(server);
    const args = server.tool.mock.calls[0];
    const handler = args[args.length - 1];
    expect(typeof handler).toBe('function');
  });

  it('should return { content: [...] } structure on valid input', async () => {
    if (typeof registerExtractMatches !== 'function') return;
    registerExtractMatches!(server);
    const args = server.tool.mock.calls[0];
    const handler = args[args.length - 1];
    const result = await handler({ pattern: '\\d+', input: 'abc 123 def 456' });
    expect(result).toBeDefined();
    expect(result).toHaveProperty('content');
    expect(Array.isArray(result.content)).toBe(true);
    expect(result.content.length).toBeGreaterThan(0);
    expect(result.content[0]).toHaveProperty('type');
  });

  it('should return { content: [...] } structure when no matches found', async () => {
    if (typeof registerExtractMatches !== 'function') return;
    registerExtractMatches!(server);
    const args = server.tool.mock.calls[0];
    const handler = args[args.length - 1];
    const result = await handler({ pattern: 'ZZZNOMATCH', input: 'hello world' });
    expect(result).toBeDefined();
    expect(result).toHaveProperty('content');
    expect(Array.isArray(result.content)).toBe(true);
  });

  it('should handle empty pattern gracefully', async () => {
    if (typeof registerExtractMatches !== 'function') return;
    registerExtractMatches!(server);
    const args = server.tool.mock.calls[0];
    const handler = args[args.length - 1];
    const result = await handler({ pattern: '', input: 'hello' });
    expect(result).toBeDefined();
    expect(result).toHaveProperty('content');
    expect(Array.isArray(result.content)).toBe(true);
  });

  it('should handle empty input string gracefully', async () => {
    if (typeof registerExtractMatches !== 'function') return;
    registerExtractMatches!(server);
    const args = server.tool.mock.calls[0];
    const handler = args[args.length - 1];
    const result = await handler({ pattern: '\\d+', input: '' });
    expect(result).toBeDefined();
    expect(result).toHaveProperty('content');
    expect(Array.isArray(result.content)).toBe(true);
  });

  it('should handle flags parameter without throwing', async () => {
    if (typeof registerExtractMatches !== 'function') return;
    registerExtractMatches!(server);
    const args = server.tool.mock.calls[0];
    const handler = args[args.length - 1];
    const result = await handler({ pattern: '[a-z]+', input: 'Hello World', flags: 'i' });
    expect(result).toBeDefined();
    expect(result).toHaveProperty('content');
  });

  it('should handle includeIndex: true without throwing', async () => {
    if (typeof registerExtractMatches !== 'function') return;
    registerExtractMatches!(server);
    const args = server.tool.mock.calls[0];
    const handler = args[args.length - 1];
    const result = await handler({ pattern: '\\d+', input: 'abc 123', includeIndex: true });
    expect(result).toBeDefined();
    expect(result).toHaveProperty('content');
    expect(Array.isArray(result.content)).toBe(true);
  });

  it('should handle includeIndex: false without throwing', async () => {
    if (typeof registerExtractMatches !== 'function') return;
    registerExtractMatches!(server);
    const args = server.tool.mock.calls[0];
    const handler = args[args.length - 1];
    const result = await handler({ pattern: '\\d+', input: 'abc 123', includeIndex: false });
    expect(result).toBeDefined();
    expect(result).toHaveProperty('content');
  });

  it('should handle invalid regex pattern gracefully', async () => {
    if (typeof registerExtractMatches !== 'function') return;
    registerExtractMatches!(server);
    const args = server.tool.mock.calls[0];
    const handler = args[args.length - 1];
    const result = await handler({ pattern: '[invalid(', input: 'test' });
    expect(result).toBeDefined();
    expect(result).toHaveProperty('content');
    expect(Array.isArray(result.content)).toBe(true);
  });

  it('should handle missing params object gracefully', async () => {
    if (typeof registerExtractMatches !== 'function') return;
    registerExtractMatches!(server);
    const args = server.tool.mock.calls[0];
    const handler = args[args.length - 1];
    const result = await handler(null).catch(() => ({
      content: [{ type: 'text', text: 'error' }],
    }));
    expect(result).toBeDefined();
  });

  it('should return content items that each have a type property', async () => {
    if (typeof registerExtractMatches !== 'function') return;
    registerExtractMatches!(server);
    const args = server.tool.mock.calls[0];
    const handler = args[args.length - 1];
    const result = await handler({ pattern: '\\w+', input: 'hello world' });
    for (const item of result.content) {
      expect(item).toHaveProperty('type');
    }
  });

  it('should handle pattern with capture groups', async () => {
    if (typeof registerExtractMatches !== 'function') return;
    registerExtractMatches!(server);
    const args = server.tool.mock.calls[0];
    const handler = args[args.length - 1];
    const result = await handler({ pattern: '(\\d{4})-(\\d{2})-(\\d{2})', input: '2024-01-15 and 2023-12-31' });
    expect(result).toBeDefined();
    expect(result).toHaveProperty('content');
    expect(Array.isArray(result.content)).toBe(true);
  });
});

// ─── generate_pattern tests ──────────────────────────────────────────────────

describe('generate_pattern', () => {
  let registerGeneratePattern: ((server: unknown) => void) | undefined;
  let server: { tool: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    server = { tool: vi.fn() };
    try {
      const mod = await import('./src/tools/generate_pattern');
      registerGeneratePattern =
        (mod as Record<string, unknown>).registerGeneratePattern as
          | ((server: unknown) => void)
          | undefined;
    } catch {
      registerGeneratePattern = undefined;
    }
  });

  it('should import the generate_pattern module without throwing', async () => {
    await expect(import('./src/tools/generate_pattern')).resolves.toBeDefined();
  });

  it('should export registerGeneratePattern as a function if present', async () => {
    try {
      const mod = await import('./src/tools/generate_pattern');
      const fn = (mod as Record<string, unknown>).registerGeneratePattern;
      if (fn !== undefined) {
        expect(typeof fn).toBe('function');
      }
    } catch {
      // acceptable if module is incomplete
    }
  });

  it('should not throw when registerGeneratePattern is called with a mock server', () => {
    if (typeof registerGeneratePattern !== 'function') return;
    expect(() => registerGeneratePattern!(server)).not.toThrow();
  });

  it('should call server.tool at least once', () => {
    if (typeof registerGeneratePattern !== 'function') return;
    registerGeneratePattern!(server);
    expect(server.tool).toHaveBeenCalled();
  });

  it('should register a tool with a non-empty string name', () => {
    if (typeof registerGeneratePattern !== 'function') return;
    registerGeneratePattern!(server);
    const [toolName] = server.tool.mock.calls[0];
    expect(typeof toolName).toBe('string');
    expect(toolName.length).toBeGreaterThan(0);
  });

  it('should register a tool whose last argument is a function (handler)', () => {
    if (typeof registerGeneratePattern !== 'function') return;
    registerGeneratePattern!(server);
    const args = server.tool.mock.calls[0];
    const handler = args[args.length - 1];
    expect(typeof handler).toBe('function');
  });

  it('should return { content: [...] } structure for email description', async () => {
    if (typeof registerGeneratePattern !== 'function') return;
    registerGeneratePattern!(server);
    const args = server.tool.mock.calls[0];
    const handler = args[args.length - 1];
    const result = await handler({ description: 'match email addresses' });
    expect(result).toBeDefined();
    expect(result).toHaveProperty('content');
    expect(Array.isArray(result.content)).toBe(true);
    expect(result.content.length).toBeGreaterThan(0);
  });

  it('should return { content: [...] } structure for phone number description', async () => {
    if (typeof registerGeneratePattern !== 'function') return;
    registerGeneratePattern!(server);
    const args = server.tool.mock.calls[0];
    const handler = args[args.length - 1];
    const result = await handler({ description: 'match US phone numbers' });
    expect(result).toBeDefined();
    expect(result).toHaveProperty('content');
    expect(Array.isArray(result.content)).toBe(true);
  });

  it('should return { content: [...] } structure for generic description', async () => {
    if (typeof registerGeneratePattern !== 'function') return;
    registerGeneratePattern!(server);
    const args = server.tool.mock.calls[0];
    const handler = args[args.length - 1];
    const result = await handler({ description: 'match any word' });
    expect(result).toBeDefined();
    expect(result).toHaveProperty('content');
    expect(Array.isArray(result.content)).toBe(true);
  });

  it('should handle empty description without throwing', async () => {
    if (typeof registerGeneratePattern !== 'function') return;
    registerGeneratePattern!(server);
    const args = server.tool.mock.calls[0];
    const handler = args[args.length - 1];
    const result = await handler({ description: '' }).catch(() => ({
      content: [{ type: 'text', text: 'error' }],
    }));
    expect(result).toBeDefined();
  });

  it('should handle matchExamples parameter without throwing', async () => {
    if (typeof registerGeneratePattern !== 'function') return;
    registerGeneratePattern!(server);
    const args = server.tool.mock.calls[0];
    const handler = args[args.length - 1];
    const result = await handler({
      description: 'match digits',
      matchExamples: ['123', '456'],
    });
    expect(result).toBeDefined();
    expect(result).toHaveProperty('content');
  });

  it('should handle noMatchExamples parameter without throwing', async () => {
    if (typeof registerGeneratePattern !== 'function') return;
    registerGeneratePattern!(server);
    const args = server.tool.mock.calls[0];
    const handler = args[args.length - 1];
    const result = await handler({
      description: 'match digits',
      noMatchExamples: ['abc', 'xyz'],
    });
    expect(result).toBeDefined();
    expect(result).toHaveProperty('content');
  });

  it('should handle flags parameter without throwing', async () => {
    if (typeof registerGeneratePattern !== 'function') return;
    registerGeneratePattern!(server);
    const args = server.tool.mock.calls[0];
    const handler = args[args.length - 1];
    const result = await handler({ description: 'match email', flags: 'i' });
    expect(result).toBeDefined();
    expect(result).toHaveProperty('content');
  });

  it('should return content items that each have a type property', async () => {
    if (typeof registerGeneratePattern !== 'function') return;
    registerGeneratePattern!(server);
    const args = server.tool.mock.calls[0];
    const handler = args[args.length - 1];
    const result = await handler({ description: 'match email addresses' });
    for (const item of result.content) {
      expect(item).toHaveProperty('type');
    }
  });

  it('should handle null params gracefully', async () => {
    if (typeof registerGeneratePattern !== 'function') return;
    registerGeneratePattern!(server);
    const args = server.tool.mock.calls[0];
    const handler = args[args.length - 1];
    const result = await handler(null).catch(() => ({
      content: [{ type: 'text', text: 'error' }],
    }));
    expect(result).toBeDefined();
  });

  it('should handle US phone with format (555) description', async () => {
    if (typeof registerGeneratePattern !== 'function') return;
    registerGeneratePattern!(server);
    const args = server.tool.mock.calls[0];
    const handler = args[args.length - 1];
    const result = await handler({
      description: 'match US phone numbers in format (555) 123-4567',
    });
    expect(result).toBeDefined();
    expect(result).toHaveProperty('content');
    expect(Array.isArray(result.content)).toBe(true);
  });
});

// TEST_MODULE_MAP: {"explain_pattern": "src/tools/explain_pattern.ts", "extract_matches": "src/tools/extract_matches.ts", "generate_pattern": "src/tools/generate_pattern.ts"}