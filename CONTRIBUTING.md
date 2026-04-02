# Contributing

Thanks for your interest in contributing! Here's how to get started.

## Reporting Issues

- Use [GitHub Issues](../../issues) to report bugs or suggest features
- Include steps to reproduce for bugs
- Check existing issues before creating a new one

## Setup

```bash
git clone <this-repo>
cd regex-tools-mcp
npm install
npx tsc          # compile TypeScript to dist/
npm test          # run tests
```

The compiled output lives in `dist/`. Never edit files in `dist/` directly — edit `src/` and recompile.

## Pull Requests

1. Fork the repository
2. Create a feature branch: `git checkout -b feat/my-feature`
3. Make your changes
4. Run tests (see below)
5. Commit with a clear message: `git commit -m "feat: add my feature"`
6. Push and open a Pull Request

## Code Style

- TypeScript with strict types — no `any`
- ESM imports: `import { x } from "./module.js"`
- Zod schemas for all tool parameter validation
- Every tool handler returns `{ content: [{ type: "text", text: "..." }] }`
- Handle errors inside tool handlers with try/catch — return error as text content
- No hardcoded credentials — use environment variables

## Testing

```bash
npm test              # run vitest
npm run test:coverage # run with coverage report
npx tsc --noEmit      # type check without compiling
```

- Tests live in `tests/`
- Test tool logic, not MCP server wiring or stdio transport
- Mock external I/O (filesystem, network) with `vi.mock()`
- All tests must pass and types must check before merging

## Architecture

- `src/index.ts` — MCP server setup, tool registration, stdio transport
- `src/tools/*.ts` — one file per tool, each exports a register function
- `src/utils.ts` — shared helper functions
- Uses `@modelcontextprotocol/sdk` for the server framework
- Uses `zod` for input validation

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
