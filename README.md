# regex-tools-mcp

A powerful MCP server providing regex utilities for AI coding agents to test, extract, replace, explain, and generate regular expressions.

## Installation

### Using npx (Recommended)
```bash
npx regex-tools-mcp
```

### Using npm
```bash
npm install -g regex-tools-mcp
```

## MCP Client Configuration

### Claude Desktop
Add to `claude_desktop_config.json`:
```json
{
  "mcpServers": {
    "regex-tools-mcp": {
      "command": "npx",
      "args": ["-y", "regex-tools-mcp"]
    }
  }
}
```

### Cursor
Add to your MCP settings:
```json
{
  "mcpServers": {
    "regex-tools-mcp": {
      "command": "npx",
      "args": ["-y", "regex-tools-mcp"]
    }
  }
}
```

### Windsurf
Add to your MCP configuration:
```json
{
  "mcpServers": {
    "regex-tools-mcp": {
      "command": "npx",
      "args": ["-y", "regex-tools-mcp"]
    }
  }
}
```

## Tools

### test_pattern
Test a regex pattern against a string and get match results.
```
Input: pattern="^\d{3}-\d{2}-\d{4}$", text="123-45-6789"
Output: { matches: true, result: "123-45-6789" }
```

### extract_matches
Extract all matches of a pattern from text.
```
Input: pattern="\b\w+@\w+\.\w+\b", text="Contact: john@example.com or jane@test.org"
Output: { matches: ["john@example.com", "jane@test.org"] }
```

### replace_pattern
Replace text matching a pattern with a replacement string.
```
Input: pattern="\s+", replacement=" ", text="hello    world"
Output: { result: "hello world" }
```

### explain_pattern
Get a plain English explanation of what a regex pattern does.
```
Input: pattern="^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$"
Output: { explanation: "Matches valid email addresses..." }
```

### generate_pattern
Generate a regex pattern from a natural language description.
```
Input: description="Match any valid URL starting with http or https"
Output: { pattern: "^https?://[^\s/$.?#].[^\s]*$" }
```

### split_string
Split a string using a regex pattern as the delimiter.
```
Input: pattern="\s*,\s*", text="apple, banana , orange"
Output: { result: ["apple", "banana", "orange"] }
```

### validate_pattern
Validate if a regex pattern is syntactically correct.
```
Input: pattern="[a-z"
Output: { valid: false, error: "Unterminated character class" }
```

## Features

- ✅ Test regex patterns instantly
- ✅ Extract and manipulate text with precision
- ✅ AI-powered pattern explanation
- ✅ Generate regex from natural language
- ✅ Full pattern validation
- ✅ Works seamlessly with Claude, Cursor, and Windsurf

## License

Open source and free to use.

---

**Built with AI by Craftpipe**

Support: support@heijnesdigital.com