import { z } from 'zod';
function buildPatternFromDescription(description, flags) {
    const desc = description.toLowerCase().trim();
    // Email
    if (desc.includes('email')) {
        return {
            pattern: '[a-zA-Z0-9._%+\\-]+@[a-zA-Z0-9.\\-]+\\.[a-zA-Z]{2,}',
            explanation: 'Matches email addresses: local part (alphanumeric, dots, underscores, percent, plus, hyphen), @ symbol, domain name, dot, and TLD of 2+ letters.',
            alternatives: [
                '[^\\s@]+@[^\\s@]+\\.[^\\s@]+',
                '[a-zA-Z0-9._%+\\-]+@[a-zA-Z0-9.\\-]+\\.[a-zA-Z]{2,63}'
            ]
        };
    }
    // US phone numbers
    if ((desc.includes('phone') || desc.includes('telephone')) && (desc.includes('us') || desc.includes('american') || desc.includes('555') || desc.includes('(555)'))) {
        if (desc.includes('(555)') || desc.includes('format (')) {
            return {
                pattern: '\\(\\d{3}\\)\\s\\d{3}-\\d{4}',
                explanation: 'Matches US phone numbers in the format (555) 123-4567: opening paren, 3 digits, closing paren, space, 3 digits, hyphen, 4 digits.',
                alternatives: [
                    '\\(?\\d{3}\\)?[\\s.\\-]?\\d{3}[\\s.\\-]?\\d{4}',
                    '\\(\\d{3}\\)[\\s]\\d{3}-\\d{4}'
                ]
            };
        }
        return {
            pattern: '(?:\\+1[\\s.\\-]?)?(?:\\(?\\d{3}\\)?[\\s.\\-]?)\\d{3}[\\s.\\-]?\\d{4}',
            explanation: 'Matches US phone numbers in various formats including optional country code +1, area code with or without parentheses, and separators (space, dot, or hyphen).',
            alternatives: [
                '\\d{3}[\\-.]\\d{3}[\\-.]\\d{4}',
                '\\(?\\d{3}\\)?[\\s\\-.]\\d{3}[\\s\\-.]\\d{4}'
            ]
        };
    }
    // Generic phone
    if (desc.includes('phone') || desc.includes('telephone')) {
        return {
            pattern: '(?:\\+?\\d{1,3}[\\s.\\-]?)?(?:\\(?\\d{1,4}\\)?[\\s.\\-]?)?\\d{1,4}[\\s.\\-]?\\d{1,4}[\\s.\\-]?\\d{1,9}',
            explanation: 'Matches international phone numbers with optional country code, area code, and various separators.',
            alternatives: [
                '\\+?[\\d\\s.\\-()]{7,20}',
                '\\d{7,15}'
            ]
        };
    }
    // URL
    if (desc.includes('url') || desc.includes('website') || desc.includes('web address') || desc.includes('http')) {
        return {
            pattern: 'https?:\\/\\/(?:www\\.)?[-a-zA-Z0-9@:%._\\+~#=]{1,256}\\.[a-zA-Z0-9()]{1,6}\\b(?:[-a-zA-Z0-9()@:%_\\+.~#?&\\/=]*)',
            explanation: 'Matches HTTP and HTTPS URLs with optional www prefix, domain name, TLD, and optional path/query/fragment.',
            alternatives: [
                'https?:\\/\\/[^\\s]+',
                '(?:https?|ftp):\\/\\/[\\w\\-]+(\\.[\\w\\-]+)+([\\w.,@?^=%&:/~+#\\-]*[\\w@?^=%&/~+#\\-])?'
            ]
        };
    }
    // IP address
    if (desc.includes('ip address') || desc.includes('ipv4') || (desc.includes('ip') && desc.includes('address'))) {
        return {
            pattern: '(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)',
            explanation: 'Matches valid IPv4 addresses: four groups of 0-255 separated by dots.',
            alternatives: [
                '\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}',
                '(?:\\d{1,3}\\.){3}\\d{1,3}'
            ]
        };
    }
    // Date patterns
    if (desc.includes('date')) {
        if (desc.includes('mm/dd/yyyy') || desc.includes('mm/dd/yy')) {
            return {
                pattern: '(?:0?[1-9]|1[0-2])\\/(?:0?[1-9]|[12][0-9]|3[01])\\/(?:\\d{4}|\\d{2})',
                explanation: 'Matches dates in MM/DD/YYYY or MM/DD/YY format with optional leading zeros.',
                alternatives: [
                    '\\d{1,2}\\/\\d{1,2}\\/\\d{2,4}',
                    '(?:0[1-9]|1[0-2])\\/(?:0[1-9]|[12]\\d|3[01])\\/\\d{4}'
                ]
            };
        }
        if (desc.includes('yyyy-mm-dd') || desc.includes('iso')) {
            return {
                pattern: '\\d{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12][0-9]|3[01])',
                explanation: 'Matches ISO 8601 dates in YYYY-MM-DD format.',
                alternatives: [
                    '\\d{4}-\\d{2}-\\d{2}',
                    '\\d{4}-(?:0?[1-9]|1[0-2])-(?:0?[1-9]|[12]\\d|3[01])'
                ]
            };
        }
        return {
            pattern: '(?:\\d{4}[-\\/](?:0?[1-9]|1[0-2])[-\\/](?:0?[1-9]|[12][0-9]|3[01]))|(?:(?:0?[1-9]|1[0-2])[-\\/](?:0?[1-9]|[12][0-9]|3[01])[-\\/]\\d{2,4})',
            explanation: 'Matches common date formats including YYYY-MM-DD and MM/DD/YYYY with various separators.',
            alternatives: [
                '\\d{1,4}[-\\/.]\\d{1,2}[-\\/.]\\d{1,4}',
                '\\d{4}-\\d{2}-\\d{2}'
            ]
        };
    }
    // Time
    if (desc.includes('time')) {
        if (desc.includes('12') || desc.includes('am') || desc.includes('pm')) {
            return {
                pattern: '(?:0?[1-9]|1[0-2]):[0-5][0-9](?::[0-5][0-9])?\\s?(?:[AaPp][Mm])',
                explanation: 'Matches 12-hour time format with optional seconds and AM/PM indicator.',
                alternatives: [
                    '\\d{1,2}:\\d{2}\\s?[AaPp][Mm]',
                    '(?:0?[1-9]|1[0-2]):[0-5]\\d(?:\\s?[AaPp][Mm])?'
                ]
            };
        }
        return {
            pattern: '(?:[01]?[0-9]|2[0-3]):[0-5][0-9](?::[0-5][0-9])?',
            explanation: 'Matches 24-hour time format (HH:MM or HH:MM:SS) with hours 00-23 and minutes/seconds 00-59.',
            alternatives: [
                '\\d{1,2}:\\d{2}',
                '(?:[01]\\d|2[0-3]):[0-5]\\d'
            ]
        };
    }
    // ZIP code
    if (desc.includes('zip') || desc.includes('postal code')) {
        if (desc.includes('us') || desc.includes('american') || desc.includes('united states')) {
            return {
                pattern: '\\d{5}(?:-\\d{4})?',
                explanation: 'Matches US ZIP codes: 5 digits with optional 4-digit extension separated by a hyphen.',
                alternatives: [
                    '\\d{5}',
                    '[0-9]{5}(?:[\\-][0-9]{4})?'
                ]
            };
        }
        return {
            pattern: '[A-Z0-9]{3,10}(?:[\\s\\-][A-Z0-9]{3,7})?',
            explanation: 'Matches generic postal codes of 3-10 alphanumeric characters with optional space or hyphen separator.',
            alternatives: [
                '\\d{5}(?:-\\d{4})?',
                '[A-Z]{1,2}\\d{1,2}[A-Z]?\\s?\\d[A-Z]{2}'
            ]
        };
    }
    // Credit card
    if (desc.includes('credit card') || desc.includes('card number')) {
        return {
            pattern: '(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13}|3(?:0[0-5]|[68][0-9])[0-9]{11}|6(?:011|5[0-9]{2})[0-9]{12})',
            explanation: 'Matches major credit card numbers: Visa (16 digits starting with 4), Mastercard (16 digits starting with 51-55), Amex (15 digits starting with 34/37), Diners Club, and Discover.',
            alternatives: [
                '\\d{4}[\\s\\-]?\\d{4}[\\s\\-]?\\d{4}[\\s\\-]?\\d{4}',
                '[0-9]{13,19}'
            ]
        };
    }
    // Hex color
    if (desc.includes('hex color') || desc.includes('hexadecimal color') || desc.includes('color code') || desc.includes('colour')) {
        return {
            pattern: '#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})\\b',
            explanation: 'Matches CSS hex color codes: # followed by either 3 or 6 hexadecimal characters.',
            alternatives: [
                '#[0-9a-fA-F]{3,6}',
                '#(?:[0-9a-fA-F]{3}){1,2}'
            ]
        };
    }
    // UUID
    if (desc.includes('uuid') || desc.includes('guid')) {
        return {
            pattern: '[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}',
            explanation: 'Matches UUID/GUID format: 8-4-4-4-12 hexadecimal characters separated by hyphens.',
            alternatives: [
                '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}',
                '[\\da-fA-F]{8}-[\\da-fA-F]{4}-[\\da-fA-F]{4}-[\\da-fA-F]{4}-[\\da-fA-F]{12}'
            ]
        };
    }
    // Username
    if (desc.includes('username')) {
        return {
            pattern: '[a-zA-Z][a-zA-Z0-9_\\-]{2,29}',
            explanation: 'Matches usernames starting with a letter, followed by 2-29 alphanumeric characters, underscores, or hyphens (total 3-30 characters).',
            alternatives: [
                '[a-zA-Z0-9_\\-]{3,30}',
                '[a-zA-Z][\\w\\-]{2,29}'
            ]
        };
    }
    // Password
    if (desc.includes('password')) {
        const hasStrong = desc.includes('strong') || desc.includes('complex');
        if (hasStrong) {
            return {
                pattern: '(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[!@#$%^&*()_+\\-=\\[\\]{};\':"\\\\|,.<>\\/?]).{8,}',
                explanation: 'Matches strong passwords: at least 8 characters with at least one lowercase letter, one uppercase letter, one digit, and one special character.',
                alternatives: [
                    '(?=.*[A-Za-z])(?=.*\\d)[A-Za-z\\d]{8,}',
                    '.{8,}'
                ]
            };
        }
        return {
            pattern: '.{8,}',
            explanation: 'Matches any string of at least 8 characters.',
            alternatives: [
                '(?=.*[A-Za-z])(?=.*\\d).{8,}',
                '[\\S]{8,}'
            ]
        };
    }
    // Integer / number
    if (desc.includes('integer') || desc.includes('whole number')) {
        const hasNeg = desc.includes('negative') || desc.includes('signed');
        return {
            pattern: hasNeg ? '-?\\d+' : '\\d+',
            explanation: hasNeg
                ? 'Matches integers including optional negative sign followed by one or more digits.'
                : 'Matches positive integers: one or more digit characters.',
            alternatives: hasNeg
                ? ['[+-]?\\d+', '-?[0-9]+']
                : ['[0-9]+', '[1-9]\\d*']
        };
    }
    // Decimal / float
    if (desc.includes('decimal') || desc.includes('float') || desc.includes('number with')) {
        return {
            pattern: '-?\\d+(?:\\.\\d+)?',
            explanation: 'Matches decimal numbers with optional negative sign and optional fractional part.',
            alternatives: [
                '-?\\d*\\.?\\d+',
                '[+-]?(?:\\d+\\.?\\d*|\\.\\d+)'
            ]
        };
    }
    // Alphanumeric
    if (desc.includes('alphanumeric')) {
        return {
            pattern: '[a-zA-Z0-9]+',
            explanation: 'Matches one or more alphanumeric characters (letters and digits).',
            alternatives: [
                '[\\w]+',
                '[A-Za-z0-9]+'
            ]
        };
    }
    // Words / letters only
    if (desc.includes('letters only') || desc.includes('alphabetic') || (desc.includes('word') && !desc.includes('password'))) {
        return {
            pattern: '[a-zA-Z]+',
            explanation: 'Matches one or more alphabetic characters (letters only, no digits or special characters).',
            alternatives: [
                '[A-Za-z]+',
                flags.includes('i') ? '[a-z]+' : '[a-zA-Z]+'
            ]
        };
    }
    // Whitespace
    if (desc.includes('whitespace') || desc.includes('white space') || desc.includes('spaces')) {
        return {
            pattern: '\\s+',
            explanation: 'Matches one or more whitespace characters including spaces, tabs, and newlines.',
            alternatives: [
                ' +',
                '[\\t ]+',
                '[ \\t\\n\\r]+'
            ]
        };
    }
    // HTML tag
    if (desc.includes('html') && desc.includes('tag')) {
        return {
            pattern: '<\\/?[a-zA-Z][a-zA-Z0-9]*(?:\\s+[^>]*)?>',
            explanation: 'Matches HTML tags including optional attributes. Note: regex is not ideal for full HTML parsing.',
            alternatives: [
                '<[^>]+>',
                '<\\/?[\\w\\s="/.\'\\-:;#]*>'
            ]
        };
    }
    // SSN
    if (desc.includes('ssn') || desc.includes('social security')) {
        return {
            pattern: '(?!000|666|9\\d{2})\\d{3}[-\\s]?(?!00)\\d{2}[-\\s]?(?!0000)\\d{4}',
            explanation: 'Matches US Social Security Numbers in XXX-XX-XXXX format with validation to exclude invalid ranges (000, 666, 900-999 area numbers).',
            alternatives: [
                '\\d{3}-\\d{2}-\\d{4}',
                '\\d{3}[\\s\\-]?\\d{2}[\\s\\-]?\\d{4}'
            ]
        };
    }
    // Slug
    if (desc.includes('slug') || desc.includes('url slug')) {
        return {
            pattern: '[a-z0-9]+(?:-[a-z0-9]+)*',
            explanation: 'Matches URL slugs: lowercase alphanumeric segments separated by single hyphens.',
            alternatives: [
                '[a-z0-9\\-]+',
                '[a-z][a-z0-9\\-]*[a-z0-9]'
            ]
        };
    }
    // MAC address
    if (desc.includes('mac address') || desc.includes('mac addr')) {
        return {
            pattern: '(?:[0-9A-Fa-f]{2}[:\\-]){5}[0-9A-Fa-f]{2}',
            explanation: 'Matches MAC addresses in XX:XX:XX:XX:XX:XX or XX-XX-XX-XX-XX-XX format.',
            alternatives: [
                '[0-9A-Fa-f]{12}',
                '(?:[0-9A-Fa-f]{2}:){5}[0-9A-Fa-f]{2}'
            ]
        };
    }
    // Hashtag
    if (desc.includes('hashtag')) {
        return {
            pattern: '#[a-zA-Z][a-zA-Z0-9_]*',
            explanation: 'Matches hashtags: # symbol followed by a letter and then alphanumeric characters or underscores.',
            alternatives: [
                '#\\w+',
                '#[^\\s#]+'
            ]
        };
    }
    // Mention / @username
    if (desc.includes('mention') || desc.includes('@username') || desc.includes('twitter')) {
        return {
            pattern: '@[a-zA-Z][a-zA-Z0-9_]{0,29}',
            explanation: 'Matches social media mentions: @ symbol followed by a letter and up to 29 alphanumeric characters or underscores.',
            alternatives: [
                '@\\w{1,30}',
                '@[a-zA-Z0-9_]+'
            ]
        };
    }
    // Fallback: generate a generic pattern based on keywords
    const words = description.match(/\b\w+\b/g) || [];
    const meaningfulWords = words.filter(w => w.length > 3 && !['that', 'with', 'from', 'this', 'have', 'will', 'should', 'match', 'matches', 'pattern', 'string', 'text'].includes(w.toLowerCase()));
    if (meaningfulWords.length > 0) {
        const escaped = meaningfulWords.slice(0, 3).map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
        return {
            pattern: `(?:${escaped.join('|')})`,
            explanation: `Matches strings containing one of the key terms derived from the description: ${meaningfulWords.slice(0, 3).join(', ')}. This is a best-effort pattern based on the description keywords.`,
            alternatives: [
                `(?i:${escaped.join('|')})`,
                `\\b(?:${escaped.join('|')})\\b`
            ]
        };
    }
    return {
        pattern: '.*',
        explanation: 'Matches any string. The description was too generic to generate a specific pattern. Please provide more details or use matchExamples/noMatchExamples to refine.',
        alternatives: [
            '.+',
            '\\S+'
        ]
    };
}
function refinePatternFromExamples(pattern, matchExamples, noMatchExamples, flags) {
    // Try to validate and potentially adjust anchoring based on examples
    let currentPattern = pattern;
    let refined = false;
    try {
        const re = new RegExp(currentPattern, flags);
        // Check if all match examples pass
        const allMatchPass = matchExamples.every(ex => re.test(ex));
        // Check if all no-match examples fail
        const allNoMatchPass = noMatchExamples.every(ex => !re.test(ex));
        if (allMatchPass && allNoMatchPass) {
            return { pattern: currentPattern, refined: false };
        }
        // Try anchored version
        const anchoredPattern = `^(?:${currentPattern})$`;
        try {
            const anchoredRe = new RegExp(anchoredPattern, flags);
            const anchoredMatchPass = matchExamples.every(ex => anchoredRe.test(ex));
            const anchoredNoMatchPass = noMatchExamples.every(ex => !anchoredRe.test(ex));
            if (anchoredMatchPass && anchoredNoMatchPass) {
                return { pattern: anchoredPattern, refined: true };
            }
        }
        catch {
            // anchored version failed to compile
        }
        // Try case-insensitive if not already
        if (!flags.includes('i')) {
            const ciFlags = flags + 'i';
            try {
                const ciRe = new RegExp(currentPattern, ciFlags);
                const ciMatchPass = matchExamples.every(ex => ciRe.test(ex));
                const ciNoMatchPass = noMatchExamples.every(ex => !ciRe.test(ex));
                if (ciMatchPass && ciNoMatchPass) {
                    refined = true;
                    // Note: we return the pattern but caller should use ciFlags
                }
            }
            catch {
                // ignore
            }
        }
    }
    catch {
        // Pattern compilation failed, return as-is
    }
    return { pattern: currentPattern, refined };
}
function validatePattern(pattern, flags, matchExamples, noMatchExamples) {
    const results = {
        matchExamples: [],
        noMatchExamples: []
    };
    let re = null;
    try {
        re = new RegExp(pattern, flags);
    }
    catch {
        // Invalid pattern — all fail
        for (const ex of matchExamples) {
            results.matchExamples.push({ example: ex, passed: false });
        }
        for (const ex of noMatchExamples) {
            results.noMatchExamples.push({ example: ex, passed: false });
        }
        return results;
    }
    for (const ex of matchExamples) {
        results.matchExamples.push({ example: ex, passed: re.test(ex) });
    }
    for (const ex of noMatchExamples) {
        // For noMatchExamples, "passed" means the pattern correctly does NOT match
        results.noMatchExamples.push({ example: ex, passed: !re.test(ex) });
    }
    return results;
}
export function registerGeneratePattern(server) {
    server.tool("generate_pattern", "Generates a regex pattern from a natural language description. Optionally accepts example strings that should match and strings that should not match, to guide and validate the generated pattern.", {
        description: z.string().describe("Plain English description of what the pattern should match (e.g. 'US phone numbers in the format (555) 123-4567')"),
        matchExamples: z.string().optional().describe("Optional comma-separated list of example strings the pattern MUST match. Used to validate and refine the generated pattern."),
        noMatchExamples: z.string().optional().describe("Optional comma-separated list of example strings the pattern must NOT match. Used to tighten the pattern and avoid false positives."),
        flags: z.string().optional().describe("Optional regex flags to incorporate into the recommendation (e.g. 'i' for case-insensitive matching).")
    }, async (params) => {
        try {
            if (!params || typeof params !== 'object') {
                return { content: [{ type: "text", text: "Error: Invalid parameters provided." }] };
            }
            const description = (params.description && typeof params.description === 'string')
                ? params.description.trim()
                : '';
            if (!description) {
                return { content: [{ type: "text", text: "Error: A description is required to generate a pattern." }] };
            }
            const rawFlags = (params.flags && typeof params.flags === 'string')
                ? params.flags.trim().replace(/[^gimsuy]/g, '')
                : '';
            const rawMatchExamples = (params.matchExamples && typeof params.matchExamples === 'string')
                ? params.matchExamples.trim()
                : '';
            const rawNoMatchExamples = (params.noMatchExamples && typeof params.noMatchExamples === 'string')
                ? params.noMatchExamples.trim()
                : '';
            const matchExamples = rawMatchExamples
                ? rawMatchExamples.split(',').map(s => s.trim()).filter(s => s.length > 0)
                : [];
            const noMatchExamples = rawNoMatchExamples
                ? rawNoMatchExamples.split(',').map(s => s.trim()).filter(s => s.length > 0)
                : [];
            // Generate initial pattern from description
            let { pattern, explanation, alternatives } = buildPatternFromDescription(description, rawFlags);
            // Attempt to refine based on examples
            let finalFlags = rawFlags;
            if (matchExamples.length > 0 || noMatchExamples.length > 0) {
                const { pattern: refinedPattern, refined } = refinePatternFromExamples(pattern, matchExamples, noMatchExamples, rawFlags);
                if (refined) {
                    pattern = refinedPattern;
                    explanation += ' (Pattern was refined based on provided examples.)';
                }
                // Check if adding 'i' flag helps
                if (!rawFlags.includes('i')) {
                    try {
                        const reWithI = new RegExp(pattern, rawFlags + 'i');
                        const reWithout = new RegExp(pattern, rawFlags);
                        const withIMatchPass = matchExamples.every(ex => reWithI.test(ex));
                        const withoutMatchPass = matchExamples.every(ex => reWithout.test(ex));
                        const withINoMatchPass = noMatchExamples.every(ex => !reWithI.test(ex));
                        if (withIMatchPass && withINoMatchPass && !withoutMatchPass) {
                            finalFlags = rawFlags + 'i';
                            explanation += ' Case-insensitive flag (i) was added to match the provided examples.';
                        }
                    }
                    catch {
                        // ignore
                    }
                }
            }
            // Validate the final pattern
            const validationResults = validatePattern(pattern, finalFlags, matchExamples, noMatchExamples);
            // Validate alternatives too (just compile-check them)
            const validAlternatives = alternatives.filter(alt => {
                try {
                    new RegExp(alt, finalFlags);
                    return true;
                }
                catch {
                    return false;
                }
            });
            const result = {
                pattern,
                flags: finalFlags,
                explanation,
                validationResults,
                alternatives: validAlternatives
            };
            // Build a human-readable summary
            const matchPassCount = validationResults.matchExamples.filter(r => r.passed).length;
            const matchTotalCount = validationResults.matchExamples.length;
            const noMatchPassCount = validationResults.noMatchExamples.filter(r => r.passed).length;
            const noMatchTotalCount = validationResults.noMatchExamples.length;
            let summary = '';
            if (matchTotalCount > 0 || noMatchTotalCount > 0) {
                summary = `\n\nValidation Summary: `;
                if (matchTotalCount > 0) {
                    summary += `${matchPassCount}/${matchTotalCount} match examples passed. `;
                }
                if (noMatchTotalCount > 0) {
                    summary += `${noMatchPassCount}/${noMatchTotalCount} no-match examples correctly rejected.`;
                }
            }
            const output = JSON.stringify(result, null, 2) + summary;
            return { content: [{ type: "text", text: output }] };
        }
        catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            return { content: [{ type: "text", text: `Error: ${msg}` }] };
        }
    });
}
