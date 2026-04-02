import { TextContent } from "@modelcontextprotocol/sdk/types.js";

export interface RegexResult {
  success: boolean;
  message: string;
  data?: unknown;
}

export function formatOutput(
  success: boolean,
  message: string,
  data?: unknown
): TextContent {
  const result: RegexResult = { success, message, data };
  return {
    type: "text",
    text: JSON.stringify(result, null, 2),
  };
}

export function sanitizeRegexPattern(pattern: string): string {
  return pattern.trim();
}

export function truncate(text: string, maxLength: number = 500): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + "...";
}

export function validateRegexPattern(pattern: string): {
  valid: boolean;
  error?: string;
} {
  try {
    new RegExp(pattern);
    return { valid: true };
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : "Invalid regex pattern",
    };
  }
}

export function escapeSpecialChars(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function formatMatches(
  matches: RegExpExecArray[] | null,
  limit: number = 100
): string[] {
  if (!matches) return [];
  return matches.slice(0, limit).map((match) => match[0]);
}

export function validateInput(
  pattern: string,
  text: string
): { valid: boolean; error?: string } {
  if (!pattern || typeof pattern !== "string") {
    return { valid: false, error: "Pattern must be a non-empty string" };
  }
  if (!text || typeof text !== "string") {
    return { valid: false, error: "Text must be a non-empty string" };
  }
  return { valid: true };
}