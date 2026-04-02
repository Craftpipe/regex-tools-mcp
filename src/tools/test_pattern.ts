import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

export function registerTestPattern(server: McpServer): void {
  server.tool("test_pattern", "Tests whether a regex pattern matches a given string. Returns match result, captured groups, and match position. Useful for quickly validating if a pattern works before using it in code.", {
    pattern: z.string().describe("The regex pattern to test (without delimiters, e.g. '^\\d{3}-\\d{4}$')"),
    input: z.string().describe("The string to test the pattern against"),
    flags: z.string().optional().describe("Optional regex flags to apply (e.g. 'gi' for global case-insensitive). Defaults to no flags if omitted.")
  }, async (params) => {
    try {
      if (!params || typeof params !== 'object') {
        return { content: [{ type: "text", text: "Error: Invalid parameters provided." }] };
      }

      const { pattern, input, flags } = params;

      if (typeof pattern !== 'string' || pattern.trim() === '') {
        return { content: [{ type: "text", text: "Error: 'pattern' must be a non-empty string." }] };
      }

      if (typeof input !== 'string') {
        return { content: [{ type: "text", text: "Error: 'input' must be a string." }] };
      }

      const resolvedFlags: string = (typeof flags === 'string' && flags.trim() !== '') ? flags.trim() : '';

      // Validate flags — only allow known regex flag characters
      const validFlagsRegex = /^[gimsuy]*$/;
      if (!validFlagsRegex.test(resolvedFlags)) {
        return { content: [{ type: "text", text: `Error: Invalid regex flags '${resolvedFlags}'. Allowed flags: g, i, m, s, u, y.` }] };
      }

      let regex: RegExp;
      try {
        regex = new RegExp(pattern, resolvedFlags);
      } catch (regexErr: unknown) {
        const msg = regexErr instanceof Error ? regexErr.message : String(regexErr);
        return { content: [{ type: "text", text: `Error: Invalid regex pattern — ${msg}` }] };
      }

      // Use exec to get detailed match info (works for both global and non-global)
      // For global flag, we find the first match using exec
      const match: RegExpExecArray | null = regex.exec(input);

      let matched: boolean;
      let matchedText: string | null;
      let index: number | null;
      let groups: string[];
      let namedGroups: Record<string, string>;

      if (match === null) {
        matched = false;
        matchedText = null;
        index = null;
        groups = [];
        namedGroups = {};
      } else {
        matched = true;
        matchedText = match[0];
        index = match.index;

        // Captured groups: match[1], match[2], ... (undefined entries become null-like)
        groups = match.slice(1).map((g) => (g === undefined ? '' : g));

        // Named capture groups
        namedGroups = {};
        if (match.groups && typeof match.groups === 'object') {
          for (const [key, value] of Object.entries(match.groups)) {
            namedGroups[key] = value === undefined ? '' : value;
          }
        }
      }

      const resultObject = {
        matched,
        matchedText,
        index,
        groups,
        namedGroups
      };

      const resultJson = JSON.stringify(resultObject, null, 2);

      return { content: [{ type: "text", text: resultJson }] };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return { content: [{ type: "text", text: `Error: ${msg}` }] };
    }
  });
}