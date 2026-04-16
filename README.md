# BerryCrush VS Code Extension

IDE support for BerryCrush `.scenario` and `.fragment` files.

## Features

### Syntax Highlighting

Full syntax highlighting for BerryCrush scenario DSL:
- Keywords: `scenario`, `feature`, `given`, `when`, `then`, `and`, `but`
- Directives: `call`, `assert`, `extract`, `include`, `body`, `bodyFile`
- Auto-test: `auto:`, `excludes:` for automatic test generation
- Conditionals: `if`, `else if`, `else` with `and`/`or` operators
- Operation IDs: `^operationId`
- Variables: `{{variableName}}`, `${variableName}`
- Test context: `test.type`, `test.field`, `test.description`, `test.value`, `test.location`
- Tags: `@smoke`, `@ignore`, etc.
- JSONPath expressions: `$.path.to.field`
- JSON bodies and strings

### Auto-Completion

Intelligent completions for:
- **Operation IDs** - After typing `call ^`, shows all operations from your OpenAPI spec
- **Spec names** - For multi-spec projects, after `call using `
- **Fragment names** - After `include `
- **Variables** - After `{{` or `${`, shows extracted variables
- **Keywords** - Step keywords with snippets
- **Assertion operators** - `equals`, `contains`, `notEmpty`, etc.
- **Parameters** - Call parameters based on OpenAPI operation definition

### Go to Definition (F12 / Ctrl+Click / Cmd+Click)

Navigate directly to definitions with precise positioning:

- **OpenAPI operations** - Click on `^operationId` while holding Ctrl (or Cmd on macOS) to jump to the exact line in your OpenAPI spec where the operation is defined. The target line is revealed at the **top** of the editor viewport for easy context.

- **Spec names** - After `using` keyword, Ctrl+Click (Cmd+Click on macOS) on the spec name (e.g., `call using petstore`) to open the OpenAPI specification file at the beginning.

- **Fragments** - Ctrl+Click (Cmd+Click on macOS) on fragment name after `include` to jump to the fragment definition.

- **Variables** - Ctrl+Click (Cmd+Click on macOS) on `{{variable}}` to jump to the `extract` statement that defined it.

### Find All References (Shift+F12)

Find all usages of:
- **Fragments** - Right-click on a fragment definition or usage to find all `include` statements

### Document Outline

View hierarchical structure in VS Code's Outline panel (`Ctrl+Shift+O` / `Cmd+Shift+O`):
- **Features** - Displayed as top-level Class symbols
- **Scenarios/Outlines** - Shown under features as Method symbols
- **Background** - Constructor symbol under feature
- **Fragments** - Function symbols at top level
- **Steps** - given/when/then/and/but as Field symbols under scenarios
- **Examples** - Array symbol under outlines
- **Parameters** - Struct symbol in scenarios

The outline enables:
- Quick navigation by clicking items
- Breadcrumb navigation showing current location
- Go to Symbol (`Ctrl+Shift+O` / `Cmd+Shift+O`) with type-ahead filtering

### Hover Information

Hover over elements to see:
- **Operation details** - Method, path, parameters, request body, responses
- **Fragment preview** - Steps defined in the fragment
- **Keyword documentation** - Usage examples for keywords and operators

### Document Formatting

Format your scenario and fragment files with:
- **Format Document** - `Shift+Alt+F` (or `Shift+Option+F` on macOS)
- **Format Selection** - Select text and use `Ctrl+K Ctrl+F` (or `Cmd+K Cmd+F`)
- **Format on Type** - Automatically format after typing `:` on keywords

Formatting rules:
- **Root-level keywords** (`feature`, `scenario`, standalone `given`/`when`/`then`) - no indent
- **Scenario inside feature** - 2 space indent  
- **Background inside feature** - 2 space indent
- **Step keywords** (`given`, `when`, `then`, `and`, `but`) - 2 space indent from parent
- **Directives** (`call`, `assert`, `extract`, `body`, `include`, etc.) - 2 space indent from step
- **Conditional blocks** (`if`, `else if`, `else`) - same level as directives, contents +2 indent
- **Table alignment** - Columns aligned with pipes, numbers right-aligned, text left-aligned
- **Triple-quoted blocks** - Content inside `"""` preserved as-is

### Code Folding

Collapse and expand logical sections of your scenario files:
- **Features** - Fold entire feature including all scenarios and background
- **Scenarios/Outlines** - Fold individual test scenarios
- **Fragments** - Fold fragment definitions
- **Background** - Fold background sections
- **Steps** - Fold `given`, `when`, `then`, `and`, `but` with their contents
- **Parameters/Examples** - Fold parameter and examples blocks
- **Conditional Blocks** - Fold `if`/`else if`/`else` blocks individually
- **Triple-quoted Bodies** - Fold multi-line JSON/text bodies
- **Comment Blocks** - Fold consecutive comment lines

Use the fold icons in the gutter, or keyboard shortcuts:
- **Fold** - `Ctrl+Shift+[` (`Cmd+Option+[` on macOS)
- **Unfold** - `Ctrl+Shift+]` (`Cmd+Option+]` on macOS)
- **Fold All** - `Ctrl+K Ctrl+0` (`Cmd+K Cmd+0`)
- **Unfold All** - `Ctrl+K Ctrl+J` (`Cmd+K Cmd+J`)

### Code Snippets

Type a prefix and press `Tab` or select from suggestions (`Ctrl+Space`):

| Prefix | Description |
|--------|-------------|
| **Structure** | |
| `feature` | Feature with background and scenario |
| `feature-simple` | Simple feature with one scenario |
| `scenario` | Complete scenario (given/when/then) |
| `outline` | Scenario outline with examples table |
| `background` | Background block |
| `fragment` | Fragment template |
| **Steps** | |
| `given` / `given:` | Given step |
| `when` / `when:` | When step |
| `then` / `then:` | Then step |
| `and` | And step |
| `but` | But step |
| **API Calls** | |
| `call` | API call with parameter |
| `call-body` | Call with structured body |
| `call-json` | Call with inline JSON body |
| `call-body-triple` | Call with triple-quoted body |
| `call-using` | Multi-spec call |
| **Assertions** | |
| `assert-status` | Assert HTTP status (with choices) |
| `assert-json` | Assert JSON path value |
| `assert-exists` | Assert JSON path exists |
| `assert-notempty` | Assert not empty |
| `assert-header` | Assert response header |
| `assert-schema` | Assert OpenAPI schema |
| `assert-time` | Assert response time |
| **Other** | |
| `extract` | Extract value to variable |
| `extract-header` | Extract header to variable |
| `include` | Include fragment |
| `if` / `if-else` | Conditional blocks |
| `if-json` | JSON path conditional |
| `fail` | Fail with message |
| `auto` | Auto-generated test block |
| `parameters` | Parameters block |
| `examples` | Examples table |
| `@` | Add tag (with choices) |

## Keyboard Shortcuts

| Action | Windows/Linux | macOS |
|--------|--------------|-------|
| **Editing** | | |
| Toggle Line Comment | `Ctrl+/` | `Cmd+/` |
| Format Document | `Shift+Alt+F` | `Shift+Option+F` |
| Format Selection | `Ctrl+K Ctrl+F` | `Cmd+K Cmd+F` |
| **Navigation** | | |
| Go to Definition | `F12` or `Ctrl+Click` | `F12` or `Cmd+Click` |
| Peek Definition | `Alt+F12` | `Option+F12` |
| Find All References | `Shift+F12` | `Shift+F12` |
| Go to Symbol | `Ctrl+Shift+O` | `Cmd+Shift+O` |
| **Completion** | | |
| Trigger Suggestions | `Ctrl+Space` | `Ctrl+Space` |
| Accept Suggestion | `Tab` or `Enter` | `Tab` or `Enter` |
| **Folding** | | |
| Fold | `Ctrl+Shift+[` | `Cmd+Option+[` |
| Unfold | `Ctrl+Shift+]` | `Cmd+Option+]` |
| Fold All | `Ctrl+K Ctrl+0` | `Cmd+K Cmd+0` |
| Unfold All | `Ctrl+K Ctrl+J` | `Cmd+K Cmd+J` |

## Installation

### From VSIX (Local Install)

1. Build the extension:
   ```bash
   cd contrib/vscode/berrycrush
   npm install
   npm run compile
   npm run package
   ```

2. Install the generated `.vsix` file:
   - Open VS Code
   - Press `Ctrl+Shift+P` (or `Cmd+Shift+P` on macOS)
   - Run "Extensions: Install from VSIX..."
   - Select the `.vsix` file

### Development

1. Open the extension folder in VS Code
2. Press `F5` to launch Extension Development Host
3. Open a `.scenario` file to test

### Running Tests

Run the test suite:

```bash
cd contrib/vscode/berrycrush
npm install
npm run test
```

This runs the extension tests in a headless VS Code instance using `@vscode/test-electron`.

## Configuration

Configure the extension in VS Code settings:

```json
{
  // Single OpenAPI spec
  "berrycrush.openapi.path": "src/main/resources/openapi.yaml",
  
  // Multiple OpenAPI specs
  "berrycrush.openapi.paths": [
    "specs/petstore.yaml",
    "specs/auth.yaml"
  ],
  
  // Path to search for fragment files
  "berrycrush.fragmentsPath": "src/test/resources",
  
  // Formatting options
  "berrycrush.formatting.indentSize": 2,      // Spaces per indent level
  "berrycrush.formatting.alignTables": true   // Align table columns
}
```

### Auto-Discovery

If no OpenAPI paths are configured, the extension automatically searches for:
- `openapi.yaml`, `openapi.yml`, `openapi.json`
- `swagger.yaml`, `swagger.yml`, `swagger.json`
- Any `openapi*.yaml` or `swagger*.yaml` files

## Commands

- **BerryCrush: Refresh OpenAPI** - Reload OpenAPI specifications
- **BerryCrush: Refresh Fragments** - Reload fragment files

## Requirements

- VS Code 1.85.0 or higher

## Known Issues

- Large OpenAPI specs may take a moment to parse initially
- Schema validation in completions doesn't resolve `$ref` references

## Contributing

Contributions are welcome! Please see the main berrycrush repository for contribution guidelines.

## License

Apache License 2.0
