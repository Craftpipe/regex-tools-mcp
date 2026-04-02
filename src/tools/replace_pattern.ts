import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

export function registerReplacePattern(server: McpServer): void {
  server.tool("replace_pattern", "Replaces occurrences of a regex pattern in a string with a replacement. Supports backreferences in the replacement string (e.g. $1, $2, or named groups like $<name>).", {
    pattern: z.string().describe("The regex pattern to find (without delimiters)"),
    input: z.string().describe("The string to perform replacements on"),
    replacement: z.string().describe("The replacement string. Use $1, $2 etc. for captured groups, $& for the full match, or $<name> for named groups."),
    flags: z.string().optional().describe("Optional regex flags. Use 'g' to replace all occurrences, otherwise only the first match is replaced. Add 'i' for case-insensitive.")
  }, async (params) => {
    try {
      if (!params || typeof params !== 'object') {
        return { content: [{ type: "text", text: "Error: Invalid parameters provided." }] };
      }

      const { pattern, input, replacement, flags } = params;

      if (typeof pattern !== 'string' || pattern.length === 0) {
        return { content: [{ type: "text", text: "Error: 'pattern' must be a non-empty string." }] };
      }

      if (typeof input !== 'string') {
        return { content: [{ type: "text", text: "Error: 'input' must be a string." }] };
      }

      if (typeof replacement !== 'string') {
        return { content: [{ type: "text", text: "Error: 'replacement' must be a string." }] };
      }

      const resolvedFlags: string = (flags != null && typeof flags === 'string') ? flags : '';

      // Validate flags — only allow known regex flags
      const validFlagsPattern = /^[gimsuy]*$/;
      if (!validFlagsPattern.test(resolvedFlags)) {
        return { content: [{ type: "text", text: `Error: Invalid regex flags: '${resolvedFlags}'. Allowed flags are g, i, m, s, u, y.` }] };
      }

      let regex: RegExp;
      try {
        regex = new RegExp(pattern, resolvedFlags);
      } catch (regexErr: unknown) {
        const regexMsg = regexErr instanceof Error ? regexErr.message : String(regexErr);
        return { content: [{ type: "text", text: `Error: Invalid regex pattern: ${regexMsg}` }] };
      }

      const originalLength = input.length;
      let replacementCount = 0;

      let result: string;

      if (resolvedFlags.includes('g')) {
        // Replace all occurrences and count them
        result = input.replace(regex, (...args: unknown[]) => {
          replacementCount++;
          // Reconstruct the replacement using the original replacement string
          // We need to call the string replacement manually to support backreferences
          // Use a temporary single-match regex to apply the replacement string properly
          const matchStr = args[0] as string;
          const offset = args[args.length - 2] as number;
          const fullString = args[args.length - 1] as string;

          // Build the groups array and named groups
          // args layout: match, ...captureGroups, offset, string[, namedGroups]
          const lastArgIndex = args.length - 1;
          const namedGroups = (typeof args[lastArgIndex] === 'object' && args[lastArgIndex] !== null && !(typeof args[lastArgIndex] === 'number') && !(typeof args[lastArgIndex] === 'string'))
            ? args[lastArgIndex] as Record<string, string>
            : undefined;

          // Determine number of capture groups
          // args: [match, cap1, cap2, ..., offset, string, namedGroups?]
          let captureGroupsEndIndex = lastArgIndex - 2; // index before offset
          if (namedGroups !== undefined) {
            captureGroupsEndIndex = lastArgIndex - 3;
          }

          const captureGroups: (string | undefined)[] = [];
          for (let i = 1; i <= captureGroupsEndIndex; i++) {
            captureGroups.push(args[i] as string | undefined);
          }

          // Apply replacement string with backreferences
          let applied = replacement;

          // Replace named groups $<name>
          applied = applied.replace(/\$<([^>]+)>/g, (_m: string, name: string) => {
            if (namedGroups && Object.prototype.hasOwnProperty.call(namedGroups, name)) {
              return namedGroups[name] ?? '';
            }
            return '';
          });

          // Replace $& with full match
          applied = applied.replace(/\$&/g, matchStr);

          // Replace $` with portion before match
          applied = applied.replace(/\$`/g, fullString.slice(0, offset));

          // Replace $' with portion after match
          applied = applied.replace(/\$'/g, fullString.slice(offset + matchStr.length));

          // Replace $$ with literal $
          applied = applied.replace(/\$\$/g, '$');

          // Replace numbered backreferences $1 - $99
          applied = applied.replace(/\$(\d{1,2})/g, (_m: string, numStr: string) => {
            const num = parseInt(numStr, 10);
            if (num >= 1 && num <= captureGroups.length) {
              return captureGroups[num - 1] ?? '';
            }
            return _m;
          });

          return applied;
        });
      } else {
        // Replace only first occurrence
        let matched = false;
        result = input.replace(regex, (...args: unknown[]) => {
          if (!matched) {
            matched = true;
            replacementCount++;
          }

          const matchStr = args[0] as string;
          const offset = args[args.length - 2] as number;
          const fullString = args[args.length - 1] as string;

          const lastArgIndex = args.length - 1;
          const namedGroups = (typeof args[lastArgIndex] === 'object' && args[lastArgIndex] !== null && !(typeof args[lastArgIndex] === 'number') && !(typeof args[lastArgIndex] === 'string'))
            ? args[lastArgIndex] as Record<string, string>
            : undefined;

          let captureGroupsEndIndex = lastArgIndex - 2;
          if (namedGroups !== undefined) {
            captureGroupsEndIndex = lastArgIndex - 3;
          }

          const captureGroups: (string | undefined)[] = [];
          for (let i = 1; i <= captureGroupsEndIndex; i++) {
            captureGroups.push(args[i] as string | undefined);
          }

          let applied = replacement;

          applied = applied.replace(/\$<([^>]+)>/g, (_m: string, name: string) => {
            if (namedGroups && Object.prototype.hasOwnProperty.call(namedGroups, name)) {
              return namedGroups[name] ?? '';
            }
            return '';
          });

          applied = applied.replace(/\$&/g, matchStr);
          applied = applied.replace(/\$`/g, fullString.slice(0, offset));
          applied = applied.replace(/\$'/g, fullString.slice(offset + matchStr.length));
          applied = applied.replace(/\$\$/g, '$');

          applied = applied.replace(/\$(\d{1,2})/g, (_m: string, numStr: string) => {
            const num = parseInt(numStr, 10);
            if (num >= 1 && num <= captureGroups.length) {
              return captureGroups[num - 1] ?? '';
            }
            return _m;
          });

          return applied;
        });
      }

      const resultLength = result.length;

      const output = JSON.stringify({
        result,
        replacementCount,
        originalLength,
        resultLength
      });

      return { content: [{ type: "text", text: output }] };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return { content: [{ type: "text", text: `Error: ${msg}` }] };
    }
  });
}