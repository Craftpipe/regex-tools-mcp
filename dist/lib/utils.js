export function formatOutput(success, message, data) {
    const result = { success, message, data };
    return {
        type: "text",
        text: JSON.stringify(result, null, 2),
    };
}
export function sanitizeRegexPattern(pattern) {
    return pattern.trim();
}
export function truncate(text, maxLength = 500) {
    if (text.length <= maxLength)
        return text;
    return text.substring(0, maxLength) + "...";
}
export function validateRegexPattern(pattern) {
    try {
        new RegExp(pattern);
        return { valid: true };
    }
    catch (error) {
        return {
            valid: false,
            error: error instanceof Error ? error.message : "Invalid regex pattern",
        };
    }
}
export function escapeSpecialChars(text) {
    return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
export function formatMatches(matches, limit = 100) {
    if (!matches)
        return [];
    return matches.slice(0, limit).map((match) => match[0]);
}
export function validateInput(pattern, text) {
    if (!pattern || typeof pattern !== "string") {
        return { valid: false, error: "Pattern must be a non-empty string" };
    }
    if (!text || typeof text !== "string") {
        return { valid: false, error: "Text must be a non-empty string" };
    }
    return { valid: true };
}
