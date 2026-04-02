import { z } from 'zod';
export function registerValidatePattern(server) {
    server.tool("validate_pattern", "Validates that a regex pattern is syntactically correct and checks for common mistakes such as unbalanced groups, catastrophic backtracking risks, or deprecated syntax. Use this before embedding a pattern in production code.", {
        pattern: z.string().describe("The regex pattern to validate (without delimiters)"),
        flags: z.string().optional().describe("Optional regex flags to validate alongside the pattern (e.g. 'gim'). Invalid flag combinations will be reported."),
        strict: z.boolean().optional().describe("If true, also reports style warnings and performance concerns in addition to hard errors. Defaults to false.")
    }, async (params) => {
        try {
            if (!params || typeof params !== 'object') {
                return { content: [{ type: "text", text: "Error: Invalid parameters" }] };
            }
            const pattern = typeof params.pattern === 'string' ? params.pattern : '';
            const flags = typeof params.flags === 'string' ? params.flags : '';
            const strict = typeof params.strict === 'boolean' ? params.strict : false;
            const errors = [];
            const warnings = [];
            const suggestions = [];
            // --- Validate flags ---
            const validFlags = new Set(['g', 'i', 'm', 's', 'u', 'v', 'y', 'd']);
            const flagChars = flags.split('');
            const seenFlags = new Set();
            for (const f of flagChars) {
                if (!validFlags.has(f)) {
                    errors.push(`Invalid flag: '${f}'. Valid flags are: g, i, m, s, u, v, y, d`);
                }
                else if (seenFlags.has(f)) {
                    errors.push(`Duplicate flag: '${f}'`);
                }
                else {
                    seenFlags.add(f);
                }
            }
            // u and v flags are mutually exclusive
            if (seenFlags.has('u') && seenFlags.has('v')) {
                errors.push("Flags 'u' and 'v' cannot be used together");
            }
            // --- Attempt to construct the RegExp to catch syntax errors ---
            let syntaxValid = true;
            try {
                new RegExp(pattern, flags);
            }
            catch (e) {
                syntaxValid = false;
                const msg = e instanceof Error ? e.message : String(e);
                errors.push(`Syntax error: ${msg}`);
            }
            // --- Static analysis (only if pattern is non-empty and no fatal syntax error) ---
            if (pattern.length > 0 && syntaxValid) {
                // Check for unbalanced parentheses
                let parenDepth = 0;
                let bracketDepth = 0;
                let inCharClass = false;
                let i = 0;
                while (i < pattern.length) {
                    const ch = pattern[i];
                    if (ch === '\\') {
                        i += 2;
                        continue;
                    }
                    if (ch === '[' && !inCharClass) {
                        inCharClass = true;
                        bracketDepth++;
                    }
                    else if (ch === ']' && inCharClass) {
                        inCharClass = false;
                        bracketDepth--;
                    }
                    else if (!inCharClass) {
                        if (ch === '(')
                            parenDepth++;
                        else if (ch === ')') {
                            parenDepth--;
                            if (parenDepth < 0) {
                                errors.push(`Unbalanced closing parenthesis at position ${i}`);
                                parenDepth = 0;
                            }
                        }
                    }
                    i++;
                }
                if (parenDepth > 0) {
                    errors.push(`Unbalanced opening parenthesis: ${parenDepth} group(s) not closed`);
                }
                if (bracketDepth > 0) {
                    errors.push(`Unbalanced opening bracket: character class not closed`);
                }
                // Check for empty groups
                if (/\(\)/.test(pattern)) {
                    warnings.push("Empty group '()' found — this matches an empty string and is likely unintentional");
                }
                // Check for empty alternation branches
                if (/\|{2,}/.test(pattern)) {
                    warnings.push("Consecutive alternation operators '||' create empty branches");
                }
                if (/^\|/.test(pattern)) {
                    warnings.push("Pattern starts with '|' creating an empty leading alternation branch");
                }
                if (/\|$/.test(pattern)) {
                    warnings.push("Pattern ends with '|' creating an empty trailing alternation branch");
                }
                // Check for catastrophic backtracking patterns
                // Nested quantifiers on same group: (a+)+ or (a*)* or (a+)*
                if (/\([^)]*[+*][^)]*\)[+*?]/.test(pattern)) {
                    warnings.push("Potential catastrophic backtracking: nested quantifiers detected (e.g. '(a+)+' or '(a*)*'). " +
                        "This can cause exponential time complexity on non-matching input.");
                }
                // Overlapping alternation with quantifier: (a|a)+ style
                const overlapMatch = pattern.match(/\(([^)]+)\)[+*]/);
                if (overlapMatch) {
                    const inner = overlapMatch[1];
                    const branches = inner.split('|');
                    const branchSet = new Set(branches);
                    if (branchSet.size < branches.length) {
                        warnings.push(`Overlapping alternation branches inside a quantified group: '${overlapMatch[0]}'. ` +
                            "Duplicate branches can cause catastrophic backtracking.");
                    }
                }
                // Check for .* or .+ without anchors (potential ReDoS or over-matching)
                if (/\.\*|\.\+/.test(pattern) && strict) {
                    warnings.push("Unbounded wildcard '.*' or '.+' found. Consider using a more specific character class to avoid over-matching or performance issues.");
                }
                // Check for redundant character classes like [a] (single char in class)
                if (strict) {
                    const singleCharClass = /\[([^\]\\])\]/g;
                    let m;
                    while ((m = singleCharClass.exec(pattern)) !== null) {
                        suggestions.push(`Redundant character class '[${m[1]}]' can be simplified to '${m[1]}'`);
                    }
                }
                // Check for [0-9] vs \d suggestion
                if (strict && /\[0-9\]/.test(pattern)) {
                    suggestions.push("'[0-9]' can be simplified to '\\d'");
                }
                // Check for [a-zA-Z0-9_] vs \w suggestion
                if (strict && /\[a-zA-Z0-9_\]/.test(pattern)) {
                    suggestions.push("'[a-zA-Z0-9_]' can be simplified to '\\w'");
                }
                // Check for deprecated octal escapes (e.g. \1 through \9 as backreferences outside groups)
                const backrefs = pattern.match(/\\([1-9])/g);
                if (backrefs) {
                    // Count capturing groups
                    const capturingGroups = (pattern.match(/(?<!\\)\((?!\?)/g) || []).length;
                    for (const ref of backrefs) {
                        const refNum = parseInt(ref[1], 10);
                        if (refNum > capturingGroups) {
                            errors.push(`Backreference '${ref}' refers to group ${refNum}, but only ${capturingGroups} capturing group(s) exist`);
                        }
                    }
                }
                // Check for missing escape on special chars that are commonly forgotten
                if (strict) {
                    // Detect literal dot used where \. was likely intended — heuristic: dot not inside char class
                    // This is hard to detect perfectly; skip to avoid false positives
                }
                // Check for anchors usage suggestions
                if (strict && !pattern.startsWith('^') && !pattern.endsWith('$')) {
                    suggestions.push("Pattern has no anchors ('^' or '$'). If you intend to match the full string, consider adding anchors to avoid partial matches.");
                }
                // Check for case-insensitive flag with explicit case ranges
                if (seenFlags.has('i') && /[a-z]-[a-z]|[A-Z]-[A-Z]/i.test(pattern)) {
                    warnings.push("Case-insensitive flag 'i' is set, but the pattern contains explicit case ranges in character classes. " +
                        "The ranges may behave unexpectedly — consider using a single case range with the 'i' flag.");
                }
                // Check for unicode issues without u/v flag
                if (!seenFlags.has('u') && !seenFlags.has('v')) {
                    if (/\\u\{[0-9a-fA-F]+\}/.test(pattern)) {
                        errors.push("Unicode escape '\\u{...}' requires the 'u' or 'v' flag to be set");
                    }
                    if (/\\p\{/.test(pattern) || /\\P\{/.test(pattern)) {
                        errors.push("Unicode property escapes '\\p{...}' or '\\P{...}' require the 'u' or 'v' flag to be set");
                    }
                }
                // Warn about s flag (dotAll) usage without the flag
                if (!seenFlags.has('s') && strict) {
                    if (/\./.test(pattern)) {
                        suggestions.push("The '.' metacharacter does not match newlines by default. If you need to match newlines, add the 's' (dotAll) flag or use '[\\s\\S]'.");
                    }
                }
                // Check for quantifier on zero-width assertion
                const zeroWidthQuantifier = /(?:\\[bB]|\\[1-9]|\^|\$|\(\?[=!<][^)]*\))[+*?{]/;
                if (zeroWidthQuantifier.test(pattern)) {
                    warnings.push("Quantifier applied to a zero-width assertion (e.g. '^+', '\\b*', lookahead+). This is likely a mistake.");
                }
                // Check for {0} quantifier (matches nothing)
                if (/\{0\}/.test(pattern)) {
                    warnings.push("Quantifier '{0}' makes the preceding element match zero times (effectively removes it). This is likely unintentional.");
                }
                // Check for overly broad patterns in strict mode
                if (strict && /^\.\*$/.test(pattern.trim())) {
                    warnings.push("Pattern '.*' matches everything including empty strings. This is likely too broad.");
                }
            }
            const valid = errors.length === 0;
            const result = JSON.stringify({ valid, errors, warnings, suggestions }, null, 2);
            return { content: [{ type: "text", text: result }] };
        }
        catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            return { content: [{ type: "text", text: `Error: ${msg}` }] };
        }
    });
}
