import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

interface TokenExplanation {
  token: string;
  meaning: string;
}

interface FlagExplanations {
  [flag: string]: string;
}

interface ExplainResult {
  summary: string;
  breakdown: TokenExplanation[];
  flags: FlagExplanations;
  warnings: string[];
}

const FLAG_DESCRIPTIONS: Record<string, string> = {
  g: 'Global — finds all matches rather than stopping after the first match',
  i: 'Case-insensitive — matches both uppercase and lowercase letters',
  m: 'Multiline — ^ and $ match the start/end of each line, not just the whole string',
  s: 'Dotall — makes . match newline characters (\\n) as well',
  u: 'Unicode — enables full Unicode matching and stricter parsing',
  y: 'Sticky — matches only from the position indicated by lastIndex; does not search ahead',
  d: 'Indices — provides start/end indices for each match and capture group',
};

function explainFlags(flags: string): FlagExplanations {
  const result: FlagExplanations = {};
  for (const ch of flags) {
    if (FLAG_DESCRIPTIONS[ch]) {
      result[ch] = FLAG_DESCRIPTIONS[ch];
    } else {
      result[ch] = `Unknown flag '${ch}'`;
    }
  }
  return result;
}

type TokenNode =
  | { type: 'literal'; value: string }
  | { type: 'metachar'; value: string }
  | { type: 'charclass'; value: string; negated: boolean; content: string }
  | { type: 'group'; value: string; kind: string; content: string }
  | { type: 'quantifier'; value: string; base: string; min: number; max: number; lazy: boolean }
  | { type: 'anchor'; value: string }
  | { type: 'alternation'; value: string }
  | { type: 'backreference'; value: string; index: string }
  | { type: 'lookaround'; value: string; kind: string; content: string }
  | { type: 'unknown'; value: string };

function tokenize(pattern: string): TokenNode[] {
  const tokens: TokenNode[] = [];
  let i = 0;

  while (i < pattern.length) {
    const ch = pattern[i];

    // Escaped sequence
    if (ch === '\\') {
      const next = pattern[i + 1] ?? '';
      const raw = '\\' + next;

      if (/\d/.test(next)) {
        tokens.push({ type: 'backreference', value: raw, index: next });
        i += 2;
        continue;
      }

      tokens.push({ type: 'metachar', value: raw });
      i += 2;
      continue;
    }

    // Character class [...]
    if (ch === '[') {
      let j = i + 1;
      const negated = pattern[j] === '^';
      if (negated) j++;
      // Allow ] as first char inside class
      if (pattern[j] === ']') j++;
      while (j < pattern.length && pattern[j] !== ']') {
        if (pattern[j] === '\\') j++;
        j++;
      }
      const raw = pattern.slice(i, j + 1);
      const content = pattern.slice(i + 1 + (negated ? 1 : 0), j);
      tokens.push({ type: 'charclass', value: raw, negated, content });
      i = j + 1;
      continue;
    }

    // Group (...)
    if (ch === '(') {
      // Find matching closing paren (naive, handles nesting)
      let depth = 1;
      let j = i + 1;
      while (j < pattern.length && depth > 0) {
        if (pattern[j] === '\\') { j += 2; continue; }
        if (pattern[j] === '(') depth++;
        if (pattern[j] === ')') depth--;
        j++;
      }
      const raw = pattern.slice(i, j);
      const inner = pattern.slice(i + 1, j - 1);

      let kind = 'capturing';
      let content = inner;

      if (inner.startsWith('?:')) {
        kind = 'non-capturing';
        content = inner.slice(2);
      } else if (inner.startsWith('?=')) {
        kind = 'lookahead';
        content = inner.slice(2);
        tokens.push({ type: 'lookaround', value: raw, kind: 'positive lookahead', content });
        i = j;
        continue;
      } else if (inner.startsWith('?!')) {
        kind = 'negative lookahead';
        content = inner.slice(2);
        tokens.push({ type: 'lookaround', value: raw, kind: 'negative lookahead', content });
        i = j;
        continue;
      } else if (inner.startsWith('?<=')) {
        kind = 'positive lookbehind';
        content = inner.slice(3);
        tokens.push({ type: 'lookaround', value: raw, kind: 'positive lookbehind', content });
        i = j;
        continue;
      } else if (inner.startsWith('?<!')) {
        kind = 'negative lookbehind';
        content = inner.slice(3);
        tokens.push({ type: 'lookaround', value: raw, kind: 'negative lookbehind', content });
        i = j;
        continue;
      } else if (inner.startsWith('?<')) {
        const nameEnd = inner.indexOf('>');
        const name = inner.slice(2, nameEnd);
        kind = `named capturing group '${name}'`;
        content = inner.slice(nameEnd + 1);
      }

      tokens.push({ type: 'group', value: raw, kind, content });
      i = j;
      continue;
    }

    // Anchors
    if (ch === '^' || ch === '$') {
      tokens.push({ type: 'anchor', value: ch });
      i++;
      continue;
    }

    // Alternation
    if (ch === '|') {
      tokens.push({ type: 'alternation', value: '|' });
      i++;
      continue;
    }

    // Quantifiers — attach to previous token
    if (ch === '*' || ch === '+' || ch === '?' || ch === '{') {
      let raw = ch;
      let min = 0;
      let max = Infinity;
      let j = i + 1;

      if (ch === '*') { min = 0; max = Infinity; }
      else if (ch === '+') { min = 1; max = Infinity; }
      else if (ch === '?') { min = 0; max = 1; }
      else if (ch === '{') {
        while (j < pattern.length && pattern[j] !== '}') j++;
        raw = pattern.slice(i, j + 1);
        const inner = pattern.slice(i + 1, j);
        const parts = inner.split(',');
        min = parseInt(parts[0], 10);
        max = parts.length === 1 ? min : (parts[1].trim() === '' ? Infinity : parseInt(parts[1], 10));
        i = j + 1;
      } else {
        i++;
      }

      if (ch !== '{') i++;

      const lazy = pattern[i] === '?';
      if (lazy) { raw += '?'; i++; }

      const prev = tokens.pop();
      const base = prev ? prev.value : '';
      tokens.push({ type: 'quantifier', value: base + raw, base, min, max, lazy });
      continue;
    }

    // Dot
    if (ch === '.') {
      tokens.push({ type: 'metachar', value: '.' });
      i++;
      continue;
    }

    // Literal character
    tokens.push({ type: 'literal', value: ch });
    i++;
  }

  return tokens;
}

function describeMetachar(value: string, flags: string): string {
  const dotallActive = flags.includes('s');
  const map: Record<string, string> = {
    '.': dotallActive
      ? 'any character including newlines (dotall mode active)'
      : 'any character except a newline',
    '\\d': 'a digit (0–9)',
    '\\D': 'a non-digit character',
    '\\w': 'a word character (letter, digit, or underscore)',
    '\\W': 'a non-word character',
    '\\s': 'a whitespace character (space, tab, newline, etc.)',
    '\\S': 'a non-whitespace character',
    '\\b': 'a word boundary',
    '\\B': 'a non-word boundary',
    '\\n': 'a newline character',
    '\\r': 'a carriage return character',
    '\\t': 'a tab character',
    '\\f': 'a form feed character',
    '\\v': 'a vertical tab character',
    '\\0': 'a null character',
    '\\\\': 'a literal backslash',
    '\\.': 'a literal dot',
    '\\^': 'a literal caret',
    '\\$': 'a literal dollar sign',
    '\\*': 'a literal asterisk',
    '\\+': 'a literal plus sign',
    '\\?': 'a literal question mark',
    '\\(': 'a literal opening parenthesis',
    '\\)': 'a literal closing parenthesis',
    '\\[': 'a literal opening bracket',
    '\\]': 'a literal closing bracket',
    '\\{': 'a literal opening brace',
    '\\}': 'a literal closing brace',
    '\\|': 'a literal pipe character',
    '\\-': 'a literal hyphen',
  };
  return map[value] ?? `the escape sequence ${value}`;
}

function describeQuantifier(min: number, max: number, lazy: boolean, base: string): string {
  let range: string;
  if (min === 0 && max === Infinity) range = 'zero or more times';
  else if (min === 1 && max === Infinity) range = 'one or more times';
  else if (min === 0 && max === 1) range = 'zero or one time (optional)';
  else if (min === max) range = `exactly ${min} time${min !== 1 ? 's' : ''}`;
  else if (max === Infinity) range = `at least ${min} time${min !== 1 ? 's' : ''}`;
  else range = `between ${min} and ${max} times`;

  const greed = lazy ? ' (lazy — matches as few characters as possible)' : ' (greedy — matches as many characters as possible)';
  return `${base ? `'${base}' repeated ` : 'Repeated '}${range}${greed}`;
}

function describeCharClass(negated: boolean, content: string): string {
  const prefix = negated ? 'any character NOT in the set: ' : 'any one character from the set: ';
  return prefix + `[${content}]`;
}

function describeGroup(kind: string, content: string): string {
  if (kind === 'capturing') return `a capturing group matching: ${content}`;
  if (kind === 'non-capturing') return `a non-capturing group matching: ${content}`;
  if (kind.startsWith('named')) return `${kind} matching: ${content}`;
  return `a group (${kind}) matching: ${content}`;
}

function describeLookaround(kind: string, content: string): string {
  const descriptions: Record<string, string> = {
    'positive lookahead': `asserts that what follows matches: ${content} (without consuming characters)`,
    'negative lookahead': `asserts that what follows does NOT match: ${content} (without consuming characters)`,
    'positive lookbehind': `asserts that what precedes matches: ${content} (without consuming characters)`,
    'negative lookbehind': `asserts that what precedes does NOT match: ${content} (without consuming characters)`,
  };
  return descriptions[kind] ?? `lookaround (${kind}): ${content}`;
}

function buildBreakdown(tokens: TokenNode[], flags: string): TokenExplanation[] {
  return tokens.map((tok) => {
    switch (tok.type) {
      case 'literal':
        return { token: tok.value, meaning: `matches the literal character '${tok.value}'` };
      case 'metachar':
        return { token: tok.value, meaning: describeMetachar(tok.value, flags) };
      case 'anchor':
        return {
          token: tok.value,
          meaning: tok.value === '^'
            ? (flags.includes('m') ? 'start of a line' : 'start of the string')
            : (flags.includes('m') ? 'end of a line' : 'end of the string'),
        };
      case 'alternation':
        return { token: '|', meaning: 'OR — matches either the expression before or after this symbol' };
      case 'charclass':
        return { token: tok.value, meaning: describeCharClass(tok.negated, tok.content) };
      case 'group':
        return { token: tok.value, meaning: describeGroup(tok.kind, tok.content) };
      case 'lookaround':
        return { token: tok.value, meaning: describeLookaround(tok.kind, tok.content) };
      case 'quantifier':
        return { token: tok.value, meaning: describeQuantifier(tok.min, tok.max, tok.lazy, tok.base) };
      case 'backreference':
        return { token: tok.value, meaning: `back-reference to capture group #${tok.index} — matches the same text captured by that group` };
      default:
        return { token: tok.value, meaning: `unknown token '${tok.value}'` };
    }
  });
}

function buildSummary(pattern: string, flags: string, breakdown: TokenExplanation[]): string {
  const hasAnchors = breakdown.some((b) => b.token === '^' || b.token === '$');
  const hasGroups = breakdown.some((b) => b.token.startsWith('('));
  const hasQuantifiers = breakdown.some((b) => ['*', '+', '?', '{'].some((q) => b.token.includes(q)));
  const caseNote = flags.includes('i') ? ' (case-insensitive)' : '';
  const globalNote = flags.includes('g') ? ' across all occurrences in the input' : '';

  let base = `This pattern matches text${caseNote}${globalNote}`;
  if (hasAnchors) base += ', anchored to specific positions in the string';
  if (hasGroups) base += ', with one or more captured groups';
  if (hasQuantifiers) base += ', using quantifiers to control repetition';
  base += '.';
  return base;
}

function collectWarnings(pattern: string, flags: string, tokens: TokenNode[]): string[] {
  const warnings: string[] = [];

  // Catastrophic backtracking hint
  const hasNestedQuantifiers = /(\*|\+|\{[^}]+\})\s*(\*|\+|\{[^}]+\})/.test(pattern);
  if (hasNestedQuantifiers) {
    warnings.push('Potential catastrophic backtracking: nested quantifiers detected. Consider using atomic groups or possessive quantifiers if your engine supports them.');
  }

  // Unanchored pattern
  const hasStart = tokens.some((t) => t.type === 'anchor' && t.value === '^');
  const hasEnd = tokens.some((t) => t.type === 'anchor' && t.value === '$');
  if (!hasStart && !hasEnd) {
    warnings.push('This pattern is not anchored (no ^ or $), so it will match anywhere within the input string.');
  }

  // Greedy quantifiers on .
  if (/\.\*/.test(pattern) || /\.\+/.test(pattern)) {
    warnings.push('Greedy .* or .+ can match more than intended. Consider using a lazy variant (.*? or .+?) or a more specific character class.');
  }

  // Unicode flag missing for unicode escapes
  if (/\\u\{/.test(pattern) && !flags.includes('u')) {
    warnings.push("Unicode escape \\u{...} requires the 'u' flag to work correctly.");
  }

  // Flags without multiline
  if ((pattern.includes('^') || pattern.includes('$')) && !flags.includes('m')) {
    warnings.push("^ and $ match the start/end of the entire string. Add the 'm' flag if you want them to match line boundaries.");
  }

  // Backreferences without capturing groups
  const hasBackref = tokens.some((t) => t.type === 'backreference');
  const hasCapturing = tokens.some((t) => t.type === 'group' && (t as { kind: string }).kind === 'capturing');
  if (hasBackref && !hasCapturing) {
    warnings.push('Back-references found but no capturing groups detected. This may cause the pattern to always fail.');
  }

  // Empty alternation
  if (/\|\|/.test(pattern) || pattern.startsWith('|') || pattern.endsWith('|')) {
    warnings.push('Empty alternation branch detected (e.g. || or leading/trailing |). This will match an empty string on that branch.');
  }

  return warnings;
}

function explainPattern(pattern: string, flags: string, verbosity: string): ExplainResult {
  const tokens = tokenize(pattern);
  const breakdown = buildBreakdown(tokens, flags);
  const summary = buildSummary(pattern, flags, breakdown);
  const flagExplanations = explainFlags(flags);
  const warnings = collectWarnings(pattern, flags, tokens);

  if (verbosity === 'brief') {
    return { summary, breakdown: [], flags: flagExplanations, warnings };
  }

  if (verbosity === 'detailed') {
    // Add extra detail to each breakdown item
    const detailed = breakdown.map((item) => ({
      token: item.token,
      meaning: item.meaning + ` [raw: ${JSON.stringify(item.token)}]`,
    }));
    return { summary, breakdown: detailed, flags: flagExplanations, warnings };
  }

  // normal
  return { summary, breakdown, flags: flagExplanations, warnings };
}

export function registerExplainPattern(server: McpServer): void {
  server.tool(
    'explain_pattern',
    'Explains a regex pattern in plain English, breaking it down token by token. Helps developers understand what an existing pattern does without having to decode it manually.',
    {
      pattern: z.string().describe('The regex pattern to explain (without delimiters)'),
      flags: z
        .string()
        .optional()
        .describe("Optional regex flags used with this pattern (e.g. 'gi'). Including flags improves the accuracy of the explanation."),
      verbosity: z
        .string()
        .optional()
        .describe(
          "Level of detail: 'brief' for a one-sentence summary, 'normal' for a full breakdown, 'detailed' for an exhaustive token-by-token analysis. Defaults to 'normal'."
        ),
    },
    async (params) => {
      try {
        if (!params || typeof params !== 'object') {
          return { content: [{ type: 'text', text: 'Error: Invalid parameters provided.' }] };
        }

        const pattern: string =
          typeof params.pattern === 'string' ? params.pattern : '';

        if (pattern === '') {
          return { content: [{ type: 'text', text: 'Error: pattern parameter is required and must be a non-empty string.' }] };
        }

        const flags: string =
          typeof params.flags === 'string' ? params.flags : '';

        const verbosityRaw: string =
          typeof params.verbosity === 'string' ? params.verbosity.toLowerCase().trim() : 'normal';

        const verbosity =
          verbosityRaw === 'brief' || verbosityRaw === 'detailed' ? verbosityRaw : 'normal';

        // Validate the pattern is a valid regex
        try {
          new RegExp(pattern, flags);
        } catch (regexErr: unknown) {
          const msg = regexErr instanceof Error ? regexErr.message : String(regexErr);
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(
                  {
                    summary: 'Invalid regex pattern.',
                    breakdown: [],
                    flags: explainFlags(flags),
                    warnings: [`Pattern failed to compile: ${msg}`],
                  },
                  null,
                  2
                ),
              },
            ],
          };
        }

        const result: ExplainResult = explainPattern(pattern, flags, verbosity);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        return { content: [{ type: 'text', text: `Error: ${msg}` }] };
      }
    }
  );
}