# Development Setup

Set up your environment to contribute to the BerryCrush VS Code extension.

## Prerequisites

- **Node.js**: Version 18 or higher
- **npm**: Comes with Node.js
- **VS Code**: Latest version recommended
- **Git**: For version control

## Getting Started

### Clone the Repository

```bash
git clone https://github.com/ktakashi/berrycrush.git
cd berrycrush/vscode
```

### Install Dependencies

```bash
npm install
```

### Build the Extension

```bash
npm run compile
```

### Run in Development Mode

1. Open the `vscode` folder in VS Code
2. Press **F5** to launch the Extension Development Host
3. A new VS Code window opens with the extension loaded
4. Make changes to the code
5. Press **Ctrl+Shift+F5** to reload

## Project Structure

```
vscode/
├── src/
│   ├── extension.ts           # Extension entry point
│   ├── completion-provider.ts # Auto-completion
│   ├── definition-provider.ts # Go to definition
│   ├── document-link-provider.ts # Clickable links
│   ├── folding-provider.ts    # Code folding
│   ├── formatting-provider.ts # Document formatting
│   ├── hover-provider.ts      # Hover information
│   ├── reference-provider.ts  # Find references
│   ├── symbol-provider.ts     # Document symbols
│   ├── fragment-provider.ts   # Fragment discovery
│   ├── openapi-provider.ts    # OpenAPI parsing
│   └── step-provider.ts       # Custom step discovery
├── syntaxes/
│   └── berrycrush.tmLanguage.json  # Syntax highlighting
├── snippets/
│   └── berrycrush.code-snippets    # Code snippets
├── resources/
│   └── icons/                 # File icons
├── doc/                       # Documentation
├── package.json               # Extension manifest
├── tsconfig.json              # TypeScript config
└── .eslintrc.json             # ESLint config
```

## Development Commands

| Command | Description |
|---------|-------------|
| `npm run compile` | Compile TypeScript |
| `npm run watch` | Watch mode (auto-compile) |
| `npm run lint` | Run ESLint |
| `npm test` | Run tests |
| `npm run package` | Build VSIX package |

## Testing

### Run Tests

```bash
npm test
```

Tests run in a VS Code instance using `@vscode/test-electron`.

### Debug Tests

1. Open the Test Explorer view
2. Click the debug icon next to a test
3. Breakpoints work in test code

## Debugging

### Launch Configuration

The `.vscode/launch.json` includes configurations for:
- **Run Extension**: Launch development host
- **Extension Tests**: Run test suite

### Debug Output

Use `console.log()` or the VS Code Output channel:

```typescript
const outputChannel = vscode.window.createOutputChannel('BerryCrush');
outputChannel.appendLine('Debug message');
outputChannel.show();
```

## Building a VSIX

Package the extension for distribution:

```bash
npm run package
```

This creates `berrycrush-x.x.x.vsix`.

## Code Style

- Follow existing code patterns
- Run `npm run lint` before committing
- Use TypeScript strict mode
- Add JSDoc comments for public APIs

## Next Steps

- [Architecture](architecture.md) - Understand the codebase
- [Contributing](contributing.md) - Contribution guidelines
