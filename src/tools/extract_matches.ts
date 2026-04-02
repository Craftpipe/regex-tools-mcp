import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

export function registerExtractMatches(server: McpServer): void {
  server.tool("extract_matches", "Extracts all matches of a regex pattern from a string. Returns every occurrence found, including captured groups for each match. Ideal for parsing structured data out of text.", {
    pattern: z.string().describe("The regex pattern to search for (without delimiters)"),
    input: z.string().describe("The string to search within"),
    flags: z.string().optional().describe("Optional regex flags. The 'g' flag is always applied automatically to find all matches. Add 'i' for case-insensitive, 'm' for multiline, etc."),
    includeIndex: z.boolean().optional().describe("If true, includes the start index of each match in the results. Defaults to false.")
  }, async (params) => {
    try {
      if (!params || typeof params !== 'object') {
        return { content: [{ type: "text", text: "Error: Invalid parameters provided." }] };
      }

      const { pattern, input, flags, includeIndex } = params;

      if (typeof pattern !== 'string' || pattern.trim() === '') {
        return { content: [{ type: "text", text: "Error: 'pattern' must be a non-empty string." }] };
      }

      if (typeof input !== 'string') {
        return { content: [{ type: "text", text: "Error: 'input' must be a string." }] };
      }

      // Build flags string, always including 'g' and 'd' (for indices if needed)
      let flagsStr = typeof flags === 'string' ? flags : '';

      // Remove 'g' if already present to avoid duplication, then add it back
      flagsStr = flagsStr.replace(/g/g, '');

      // Always add 'g' flag
      flagsStr = flagsStr + 'g';

      // Add 'd' flag for indices support if includeIndex is true and not already present
      const wantIndex = includeIndex === true;
      if (wantIndex && !flagsStr.includes('d')) {
        flagsStr = flagsStr + 'd';
      }

      // Validate flags characters
      const validFlagChars = /^[gimsuy d]*$/;
      const cleanedFlags = flagsStr.replace(/\s/g, '');
      // Check each character is a valid flag
      const allowedFlags = new Set(['g', 'i', 'm', 's', 'u', 'y', 'd']);
      for (const ch of cleanedFlags) {
        if (!allowedFlags.has(ch)) {
          return { content: [{ type: "text", text: `Error: Invalid regex flag '${ch}'. Allowed flags: g, i, m, s, u, y, d.` }] };
        }
      }

      // Construct the regex
      let regex: RegExp;
      try {
        regex = new RegExp(pattern, cleanedFlags);
      } catch (regexErr: unknown) {
        const msg = regexErr instanceof Error ? regexErr.message : String(regexErr);
        return { content: [{ type: "text", text: `Error: Invalid regex pattern: ${msg}` }] };
      }

      // Collect all matches
      interface MatchResult {
        fullMatch: string;
        groups: (string | undefined)[];
        namedGroups: Record<string, string | undefined>;
        index?: number;
      }

      const matches: MatchResult[] = [];
      let match: RegExpExecArray | null;

      // Safety: reset lastIndex
      regex.lastIndex = 0;

      while ((match = regex.exec(input)) !== null) {
        const fullMatch = match[0];

        // Captured groups (index 1 onwards)
        const groups: (string | undefined)[] = [];
        for (let i = 1; i < match.length; i++) {
          groups.push(match[i]);
        }

        // Named groups
        const namedGroups: Record<string, string | undefined> = {};
        if (match.groups) {
          for (const [key, value] of Object.entries(match.groups)) {
            namedGroups[key] = value;
          }
        }

        const matchResult: MatchResult = {
          fullMatch,
          groups,
          namedGroups
        };

        if (wantIndex) {
          matchResult.index = match.index;
        }

        matches.push(matchResult);

        // Prevent infinite loop for zero-length matches
        if (match[0].length === 0) {
          regex.lastIndex++;
        }
      }

      const output = {
        totalMatches: matches.length,
        matches
      };

      const result = JSON.stringify(output, null, 2);
      return { content: [{ type: "text", text: result }] };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return { content: [{ type: "text", text: `Error: ${msg}` }] };
    }
  });
}