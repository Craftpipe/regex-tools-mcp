import { TextContent } from "@modelcontextprotocol/sdk/types.js";
export interface RegexResult {
    success: boolean;
    message: string;
    data?: unknown;
}
export declare function formatOutput(success: boolean, message: string, data?: unknown): TextContent;
export declare function sanitizeRegexPattern(pattern: string): string;
export declare function truncate(text: string, maxLength?: number): string;
export declare function validateRegexPattern(pattern: string): {
    valid: boolean;
    error?: string;
};
export declare function escapeSpecialChars(text: string): string;
export declare function formatMatches(matches: RegExpExecArray[] | null, limit?: number): string[];
export declare function validateInput(pattern: string, text: string): {
    valid: boolean;
    error?: string;
};
