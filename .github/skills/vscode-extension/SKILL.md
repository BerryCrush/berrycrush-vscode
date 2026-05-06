---
name: vscode-extension
description: Guide for VS Code extension development with BerryCrush. Use this when implementing new providers, features, or modifying extension behavior.
argument-hint: VS Code extension patterns and best practices
user-invocable: true
---

# VS Code Extension Development Guide

This skill provides guidance for developing the BerryCrush VS Code extension.

## Project Structure

```
vscode/
├── src/
│   ├── extension.ts           # Extension entry point
│   ├── *-provider.ts          # Language feature providers
│   └── test/
│       ├── runTest.ts         # Test runner entry
│       ├── fixtures/          # Test fixture files
│       └── suite/
│           ├── index.ts       # Mocha test configuration
│           └── *.test.ts      # Test files
├── syntaxes/
│   └── berrycrush.tmLanguage.json  # TextMate grammar
├── snippets/
│   └── berrycrush.code-snippets    # Code snippets
├── resources/
│   └── icons/                 # Extension icons
├── package.json               # Extension manifest
└── tsconfig.json              # TypeScript configuration
```

## Provider Types

### Completion Provider
Provides code completion suggestions.

```typescript
export class ScenarioCompletionProvider implements vscode.CompletionItemProvider {
    provideCompletionItems(
        document: vscode.TextDocument,
        position: vscode.Position,
        _token: vscode.CancellationToken,
        _context: vscode.CompletionContext
    ): vscode.CompletionItem[] {
        // Return completion items based on context
    }
}
```

Trigger characters in `extension.ts`:
```typescript
vscode.languages.registerCompletionItemProvider(
    SELECTOR,
    provider,
    '^', '@', '$', '{', ' '  // Trigger characters
);
```

### Definition Provider
Enables "Go to Definition" (Ctrl+Click, F12).

```typescript
export class ScenarioDefinitionProvider implements vscode.DefinitionProvider {
    provideDefinition(
        document: vscode.TextDocument,
        position: vscode.Position,
        _token: vscode.CancellationToken
    ): vscode.ProviderResult<vscode.Definition> {
        // Return location of definition
    }
}
```

### Hover Provider
Shows information on hover.

```typescript
export class ScenarioHoverProvider implements vscode.HoverProvider {
    provideHover(
        document: vscode.TextDocument,
        position: vscode.Position,
        _token: vscode.CancellationToken
    ): vscode.ProviderResult<vscode.Hover> {
        // Return markdown content for hover
        return new vscode.Hover(
            new vscode.MarkdownString('**Operation:** `GET /pets`')
        );
    }
}
```

### Document Symbol Provider
Provides outline view and breadcrumb navigation.

```typescript
export class ScenarioDocumentSymbolProvider implements vscode.DocumentSymbolProvider {
    provideDocumentSymbols(
        document: vscode.TextDocument,
        _token: vscode.CancellationToken
    ): vscode.DocumentSymbol[] {
        // Return hierarchical symbols
    }
}
```

Symbol kinds to use:
- `vscode.SymbolKind.Class` - feature
- `vscode.SymbolKind.Method` - scenario, outline
- `vscode.SymbolKind.Function` - fragment
- `vscode.SymbolKind.Constructor` - background
- `vscode.SymbolKind.Event` - step (given/when/then)

### Reference Provider
Enables "Find All References" (Shift+F12).

```typescript
export class ScenarioReferenceProvider implements vscode.ReferenceProvider {
    async provideReferences(
        document: vscode.TextDocument,
        position: vscode.Position,
        context: vscode.ReferenceContext,
        _token: vscode.CancellationToken
    ): Promise<vscode.Location[]> {
        // Search workspace for references
    }
}
```

### Formatting Provider
Provides document formatting.

```typescript
export class ScenarioFormattingProvider implements 
    vscode.DocumentFormattingEditProvider,
    vscode.DocumentRangeFormattingEditProvider,
    vscode.OnTypeFormattingEditProvider {
    
    provideDocumentFormattingEdits(
        document: vscode.TextDocument,
        _options: vscode.FormattingOptions,
        _token: vscode.CancellationToken
    ): vscode.TextEdit[] {
        // Return edits to format document
    }
}
```

### Folding Range Provider
Enables code folding.

```typescript
export class ScenarioFoldingRangeProvider implements vscode.FoldingRangeProvider {
    provideFoldingRanges(
        document: vscode.TextDocument,
        _context: vscode.FoldingContext,
        _token: vscode.CancellationToken
    ): vscode.FoldingRange[] {
        // Return foldable ranges
    }
}
```

## Testing Patterns

### Unit Test Structure

```typescript
import * as assert from 'assert';
import * as vscode from 'vscode';
import { MyProvider } from '../../my-provider';

suite('MyProvider Test Suite', () => {
    let provider: MyProvider;

    setup(() => {
        provider = new MyProvider();
    });

    suite('Feature Group', () => {
        test('should handle basic case', () => {
            const result = provider.doSomething('input');
            assert.strictEqual(result, 'expected');
        });

        test('should handle edge case', () => {
            const result = provider.doSomething('');
            assert.strictEqual(result, null);
        });
    });
});
```

### Mock Document Helper

```typescript
function createMockDocument(content: string): vscode.TextDocument {
    const lines = content.split('\n');
    return {
        getText: () => content,
        lineAt: (lineOrPos: number | vscode.Position) => {
            const lineNum = typeof lineOrPos === 'number' ? lineOrPos : lineOrPos.line;
            return {
                text: lines[lineNum] || '',
                lineNumber: lineNum,
                range: new vscode.Range(lineNum, 0, lineNum, (lines[lineNum] || '').length)
            };
        },
        positionAt: (offset: number) => {
            let remaining = offset;
            for (let i = 0; i < lines.length; i++) {
                if (remaining <= lines[i].length) {
                    return new vscode.Position(i, remaining);
                }
                remaining -= lines[i].length + 1;
            }
            return new vscode.Position(lines.length - 1, 0);
        },
        lineCount: lines.length
    } as vscode.TextDocument;
}
```

### Mock Cancellation Token

```typescript
function createMockToken(): vscode.CancellationToken {
    return {
        isCancellationRequested: false,
        onCancellationRequested: () => ({ dispose: () => {} })
    };
}
```

## Common Patterns

### Searching Workspace Files

```typescript
// Find files, excluding build directories
const files = await vscode.workspace.findFiles(
    '**/*.scenario',
    '{**/node_modules/**,**/build/**,**/target/**,**/out/**}'
);
```

### Reading Configuration

```typescript
const config = vscode.workspace.getConfiguration('berrycrush');
const specPath = config.get<string>('openapi.path');
const indentSize = config.get<number>('formatting.indentSize', 2);
```

### Creating Locations

```typescript
const location = new vscode.Location(
    vscode.Uri.file(filePath),
    new vscode.Position(lineNumber, columnNumber)
);
```

### Creating Ranges

```typescript
const range = new vscode.Range(
    new vscode.Position(startLine, startCol),
    new vscode.Position(endLine, endCol)
);
```

## Build Commands

```bash
# Compile TypeScript
npm run compile

# Watch mode for development
npm run watch

# Run linter
npm run lint

# Run tests
npm run test

# Package extension
npx vsce package
```

## Extension Registration

Always register providers in `extension.ts`:

```typescript
export function activate(context: vscode.ExtensionContext) {
    const provider = new MyProvider();
    
    // Register and track for disposal
    context.subscriptions.push(
        vscode.languages.registerCompletionItemProvider(
            BERRYCRUSH_SELECTOR,
            provider
        )
    );
}

export function deactivate() {
    // Cleanup if needed
}
```

## Document Selector

```typescript
const BERRYCRUSH_SELECTOR: vscode.DocumentSelector = [
    { language: 'berrycrush-scenario' },
    { language: 'berrycrush-fragment' }
];
```

## Error Handling Best Practices

1. **Never throw in providers** - Return null/empty array instead
2. **Log errors to output channel** - Use `outputChannel.appendLine()`
3. **Handle missing files gracefully** - Check file existence before reading
4. **Validate user input** - Guard against invalid positions/ranges
