# Architecture

Overview of the BerryCrush VS Code extension architecture.

## Extension Structure

```
┌─────────────────────────────────────────────────────┐
│                    extension.ts                      │
│                  (Entry Point)                       │
├─────────────────────────────────────────────────────┤
│  Providers (Language Features)                       │
├─────────────┬───────────────┬───────────────────────┤
│ Completion  │  Navigation   │     Formatting        │
│  Provider   │   Providers   │      Provider         │
├─────────────┼───────────────┼───────────────────────┤
│ completion- │ definition-   │ formatting-           │
│ provider.ts │ provider.ts   │ provider.ts           │
│             │ reference-    │                       │
│             │ provider.ts   │                       │
├─────────────┴───────────────┴───────────────────────┤
│  Support Services                                    │
├─────────────┬───────────────┬───────────────────────┤
│  OpenAPI    │   Fragment    │      Step             │
│  Provider   │   Provider    │    Provider           │
├─────────────┼───────────────┼───────────────────────┤
│ openapi-    │ fragment-     │ step-                 │
│ provider.ts │ provider.ts   │ provider.ts           │
└─────────────┴───────────────┴───────────────────────┘
```

## Core Components

### Extension Entry Point

`extension.ts` handles:
- Extension activation
- Provider registration
- Command registration
- Configuration loading

```typescript
export function activate(context: vscode.ExtensionContext) {
  // Register providers
  // Register commands
  // Initialize services
}
```

### Language Providers

#### Completion Provider

`completion-provider.ts` provides:
- Keyword completions (given, when, then)
- Directive completions (call, assert, include)
- Operation reference completions
- Fragment reference completions
- Variable completions

#### Definition Provider

`definition-provider.ts` handles:
- Fragment definition lookup
- Operation definition lookup (via OpenAPI)

#### Reference Provider

`reference-provider.ts` finds:
- Fragment usages across files
- Operation usages across files

#### Document Link Provider

`document-link-provider.ts` creates:
- Clickable fragment links
- Clickable operation links

#### Folding Provider

`folding-provider.ts` defines:
- Scenario folding regions
- Fragment folding regions
- Step block folding regions

#### Formatting Provider

`formatting-provider.ts` implements:
- Indentation normalization
- Table column alignment
- Whitespace cleanup

#### Symbol Provider

`symbol-provider.ts` extracts:
- Scenario symbols
- Fragment symbols
- Step symbols
- Tag symbols

### Support Services

#### OpenAPI Provider

`openapi-provider.ts` handles:
- OpenAPI spec parsing (YAML/JSON)
- Operation ID extraction
- Operation details lookup
- Multi-spec support

#### Fragment Provider

`fragment-provider.ts` manages:
- Fragment file discovery
- Fragment definition parsing
- Fragment cache management

#### Step Provider

`step-provider.ts` handles:
- Custom step definition discovery
- Step pattern matching

## Data Flow

### Completion Flow

```
User Types → Completion Provider
                   │
          ┌────────┴────────┐
          ▼                 ▼
    OpenAPI Provider  Fragment Provider
          │                 │
          ▼                 ▼
   Operation List     Fragment List
          │                 │
          └────────┬────────┘
                   ▼
          Completion Items
```

### Navigation Flow

```
Ctrl+Click → Definition Provider
                   │
          ┌────────┴────────┐
          ▼                 ▼
   Is Fragment?      Is Operation?
          │                 │
          ▼                 ▼
   Fragment Provider  OpenAPI Provider
          │                 │
          ▼                 ▼
   File Location      Spec Location
```

## Configuration

Settings are accessed via:

```typescript
const config = vscode.workspace.getConfiguration('berrycrush');
const openapiPath = config.get<string>('openapi.path');
```

## Event Handling

### File Changes

Providers listen for file changes to refresh caches:

```typescript
vscode.workspace.onDidChangeTextDocument(event => {
  if (isBerryCrushFile(event.document)) {
    refreshCache();
  }
});
```

### Configuration Changes

```typescript
vscode.workspace.onDidChangeConfiguration(event => {
  if (event.affectsConfiguration('berrycrush')) {
    reloadConfiguration();
  }
});
```

## TextMate Grammar

`syntaxes/berrycrush.tmLanguage.json` defines:
- Token patterns
- Scope names
- Syntax highlighting rules

## Extension Points

### Adding a New Provider

1. Create `new-provider.ts`
2. Implement the VS Code provider interface
3. Register in `extension.ts`

### Adding New Completions

1. Modify `completion-provider.ts`
2. Add completion items
3. Add trigger characters if needed

## Related Documentation

- [Development Setup](setup.md)
- [Contributing](contributing.md)
