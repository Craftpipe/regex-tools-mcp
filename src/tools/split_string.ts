import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

export function registerSplitString(server: McpServer): void {
  server.tool("split_string", "Splits a string into an array of substrings using a regex pattern as the delimiter. More powerful than simple string splitting because the delimiter can be a complex pattern.", {
    pattern: z.string().describe("The regex pattern to use as the split delimiter (without delimiters)"),
    input: z.string().describe("The string to split"),
    flags: z.string().optional().describe("Optional regex flags to apply to the delimiter pattern (e.g. 'i' for case-insensitive delimiter matching)"),
    limit: z.number().optional().describe("Optional maximum number of substrings to return. If omitted, all substrings are returned.")
  }, async (params) => {
    try {
      if (!params || typeof params !== 'object') {
        return { content: [{ type: "text", text: "Error: Invalid or missing parameters." }] };
      }

      const { pattern, input, flags, limit } = params;

      if (typeof pattern !== 'string' || pattern.length === 0) {
        return { content: [{ type: "text", text: "Error: 'pattern' must be a non-empty string." }] };
      }

      if (typeof input !== 'string') {
        return { content: [{ type: "text", text: "Error: 'input' must be a string." }] };
      }

      const resolvedFlags = (typeof flags === 'string' && flags.length > 0) ? flags : '';

      // Validate flags — only allow known regex flags
      const validFlags = /^[gimsuy]*$/;
      if (!validFlags.test(resolvedFlags)) {
        return { content: [{ type: "text", text: `Error: Invalid regex flags: '${resolvedFlags}'. Allowed flags are g, i, m, s, u, y.` }] };
      }

      // Build the regex — may throw if pattern is invalid
      let regex: RegExp;
      try {
        // Always use the 'g' flag internally to count delimiter matches accurately,
        // but we merge with user-supplied flags (deduplicating 'g').
        const flagsForCount = resolvedFlags.includes('g') ? resolvedFlags : resolvedFlags + 'g';
        regex = new RegExp(pattern, flagsForCount);
      } catch (regexErr: unknown) {
        const msg = regexErr instanceof Error ? regexErr.message : String(regexErr);
        return { content: [{ type: "text", text: `Error: Invalid regex pattern: ${msg}` }] };
      }

      // Count delimiter matches before splitting (reset lastIndex to be safe)
      regex.lastIndex = 0;
      let delimitersFound = 0;
      while (regex.exec(input) !== null) {
        delimitersFound++;
        // Guard against zero-length matches causing infinite loops
        if (regex.lastIndex === 0) break;
      }

      // Build the split regex (without forced 'g' flag, since split doesn't need it)
      let splitRegex: RegExp;
      try {
        // Remove 'g' flag for splitting — split() ignores it anyway, but keep it clean
        const splitFlags = resolvedFlags.replace('g', '');
        splitRegex = new RegExp(pattern, splitFlags);
      } catch (regexErr: unknown) {
        const msg = regexErr instanceof Error ? regexErr.message : String(regexErr);
        return { content: [{ type: "text", text: `Error: Invalid regex pattern: ${msg}` }] };
      }

      // Perform the split
      let parts: string[];
      if (typeof limit === 'number' && Number.isFinite(limit)) {
        if (limit < 0) {
          return { content: [{ type: "text", text: "Error: 'limit' must be a non-negative number." }] };
        }
        parts = input.split(splitRegex, Math.floor(limit));
      } else {
        parts = input.split(splitRegex);
      }

      const partCount = parts.length;

      const resultObj = {
        parts,
        partCount,
        delimitersFound
      };

      return { content: [{ type: "text", text: JSON.stringify(resultObj, null, 2) }] };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return { content: [{ type: "text", text: `Error: ${msg}` }] };
    }
  });
}