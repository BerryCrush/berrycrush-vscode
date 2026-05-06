---
applyTo: "*.ts"
---

# TypeScript Best Practices for VS Code Extension

## Technology Stack

| Technology | Version | Notes |
|------------|---------|-------|
| TypeScript | 6.0 | Primary language |
| Node.js | 25 | Runtime |
| VS Code API | ^1.118.0 | Extension host |
| ESLint | 10.x | Code linting |
| Mocha | 11.x | Test framework |

## 1. Type Safety

Always use explicit types; avoid `any`:

```typescript
// GOOD: Explicit types
function parseScenario(text: string): ScenarioNode | null {
    // ...
}

// AVOID: Implicit any
function parseScenario(text) {  // Missing parameter type
    // ...
}
```

## 2. Null Safety

Handle nullability explicitly:

```typescript
// GOOD: Null checks
const fragment = fragmentProvider.getFragment(name);
if (!fragment) {
    return null;
}
return fragment.location;

// AVOID: Assuming non-null
return fragmentProvider.getFragment(name).location;  // May crash
```

## 3. Async/Await

Prefer async/await over raw Promises:

```typescript
// GOOD: async/await
async function loadSpecs(): Promise<void> {
    const files = await vscode.workspace.findFiles('**/*.yaml');
    for (const file of files) {
        await this.parseSpec(file);
    }
}

// AVOID: Promise chains
function loadSpecs(): Promise<void> {
    return vscode.workspace.findFiles('**/*.yaml')
        .then(files => Promise.all(files.map(f => this.parseSpec(f))))
        .then(() => undefined);
}
```

## 4. Error Handling

Use try-catch with proper error logging:

```typescript
// GOOD: Proper error handling
try {
    const content = fs.readFileSync(filePath, 'utf-8');
    return this.parseContent(content);
} catch {
    console.error(`Failed to load ${filePath}`);
    return null;
}

// AVOID: Silent failures
const content = fs.readFileSync(filePath, 'utf-8');  // May throw
```

## 5. Disposables

Always dispose of VS Code resources:

```typescript
// GOOD: Track disposables
export function activate(context: vscode.ExtensionContext) {
    const provider = new MyProvider();
    context.subscriptions.push(
        vscode.languages.registerCompletionItemProvider(selector, provider)
    );
}

// AVOID: Leaking disposables
vscode.languages.registerCompletionItemProvider(selector, provider);
```

## 6. Interface Definitions

Define interfaces for complex data structures:

```typescript
// GOOD: Clear interface
export interface Fragment {
    name: string;
    filePath: string;
    steps: string[];
    location: vscode.Location;
}

// Use the interface
const fragments: Map<string, Fragment> = new Map();
```

## 7. Const Assertions

Use const assertions for literal types:

```typescript
// GOOD: Const assertion
const STEP_KEYWORDS = ['given', 'when', 'then', 'and', 'but'] as const;
type StepKeyword = typeof STEP_KEYWORDS[number];

// AVOID: Mutable arrays for constants
const STEP_KEYWORDS = ['given', 'when', 'then', 'and', 'but'];  // string[]
```

## 8. Provider Patterns

Follow VS Code provider interface patterns:

```typescript
// GOOD: Implement full interface with proper types
export class MyHoverProvider implements vscode.HoverProvider {
    provideHover(
        document: vscode.TextDocument,
        position: vscode.Position,
        _token: vscode.CancellationToken  // Prefix unused params with _
    ): vscode.ProviderResult<vscode.Hover> {
        // Implementation
    }
}
```

## 9. Configuration Access

Use typed configuration access:

```typescript
// GOOD: Type-safe config access
function getIndentSize(): number {
    const config = vscode.workspace.getConfiguration('berrycrush');
    return config.get<number>('formatting.indentSize', 2);
}
```

## 10. Module Organization

One class/interface per file, named after the export:

```
src/
├── completion-provider.ts   # ScenarioCompletionProvider
├── definition-provider.ts   # ScenarioDefinitionProvider
├── hover-provider.ts        # ScenarioHoverProvider
└── fragment-provider.ts     # FragmentProvider
```

## Testing Requirements

Every provider must have corresponding tests:

```
src/
├── symbol-provider.ts
└── test/
    └── suite/
        └── symbol-provider.test.ts  # Tests for SymbolProvider
```

Test file naming convention: `{source-file}.test.ts`

## Documentation Requirements

All public APIs must have JSDoc comments:

```typescript
/**
 * Provides document symbols for scenario files.
 * Shows feature, scenario, outline, background, and step hierarchies
 * in the Outline view and breadcrumb navigation.
 */
export class ScenarioDocumentSymbolProvider implements vscode.DocumentSymbolProvider {
    /**
     * Generate document symbols for the outline view.
     * @param document - The document to analyze
     * @param token - Cancellation token
     * @returns Array of document symbols representing the hierarchy
     */
    provideDocumentSymbols(
        document: vscode.TextDocument,
        token: vscode.CancellationToken
    ): vscode.DocumentSymbol[] {
        // ...
    }
}
```
