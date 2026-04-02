#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { registerTestPattern } from './tools/test_pattern.js';
import { registerExtractMatches } from './tools/extract_matches.js';
import { registerReplacePattern } from './tools/replace_pattern.js';
import { registerExplainPattern } from './tools/explain_pattern.js';
import { registerGeneratePattern } from './tools/generate_pattern.js';
import { registerSplitString } from './tools/split_string.js';
import { registerValidatePattern } from './tools/validate_pattern.js';

const server = new McpServer({
  name: "regex-tools-mcp",
  version: "1.0.0",
});

registerTestPattern(server);
registerExtractMatches(server);
registerReplacePattern(server);
registerExplainPattern(server);
registerGeneratePattern(server);
registerSplitString(server);
registerValidatePattern(server);

async function main(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}
main().catch(console.error);