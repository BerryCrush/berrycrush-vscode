# Extension Settings

Configure the BerryCrush extension to match your project setup.

## Accessing Settings

1. **Settings UI**: File → Preferences → Settings (Ctrl+,)
2. Search for "berrycrush"
3. Or edit `settings.json` directly

## Available Settings

### OpenAPI Configuration

#### berrycrush.openapi.path

Path to your OpenAPI specification file (relative to workspace root).

```json
{
  "berrycrush.openapi.path": "api/openapi.yaml"
}
```

**Type**: string  
**Default**: ""

#### berrycrush.openapi.paths

Paths to multiple OpenAPI spec files for multi-spec projects.

```json
{
  "berrycrush.openapi.paths": [
    "api/users.yaml",
    "api/products.yaml",
    "api/orders.yaml"
  ]
}
```

**Type**: array of strings  
**Default**: []

### Fragment Configuration

#### berrycrush.fragmentsPath

Path to search for fragment files (relative to workspace root).

```json
{
  "berrycrush.fragmentsPath": "src/test/resources"
}
```

**Type**: string  
**Default**: "src/test/resources"

### Formatting Configuration

#### berrycrush.formatting.indentSize

Number of spaces per indentation level.

```json
{
  "berrycrush.formatting.indentSize": 2
}
```

**Type**: number  
**Default**: 2  
**Range**: 1-8

#### berrycrush.formatting.alignTables

Align columns in parameter tables.

```json
{
  "berrycrush.formatting.alignTables": true
}
```

**Type**: boolean  
**Default**: true

## Extension Commands

Available commands (access via Command Palette - Ctrl+Shift+P):

| Command | Description |
|---------|-------------|
| BerryCrush: Refresh OpenAPI | Reload OpenAPI specification |
| BerryCrush: Refresh Fragments | Rescan fragment files |
| BerryCrush: Refresh Custom Steps | Reload custom step definitions |

## Workspace Settings

Configure settings per-project in `.vscode/settings.json`:

```json
{
  "berrycrush.openapi.path": "api/spec.yaml",
  "berrycrush.fragmentsPath": "src/test/resources/fragments",
  "berrycrush.formatting.indentSize": 2,
  "berrycrush.formatting.alignTables": true
}
```

## User Settings

Configure global defaults in user settings:

1. Open Settings (Ctrl+,)
2. Select "User" tab
3. Search for "berrycrush"
4. Configure settings

## Recommended Settings

### For API Testing Projects

```json
{
  "berrycrush.openapi.path": "api/openapi.yaml",
  "berrycrush.fragmentsPath": "src/test/resources",
  "berrycrush.formatting.indentSize": 2,
  "berrycrush.formatting.alignTables": true,
  "editor.formatOnSave": true,
  "[berrycrush-scenario]": {
    "editor.formatOnSave": true
  },
  "[berrycrush-fragment]": {
    "editor.formatOnSave": true
  }
}
```

### For Multi-Spec Projects

```json
{
  "berrycrush.openapi.paths": [
    "services/user-service/api.yaml",
    "services/product-service/api.yaml",
    "services/order-service/api.yaml"
  ],
  "berrycrush.fragmentsPath": "src/test/resources"
}
```

## Troubleshooting

### Settings Not Taking Effect

1. Reload the window: Ctrl+Shift+P → "Developer: Reload Window"
2. Run refresh commands from the Command Palette
3. Check for syntax errors in settings.json

### OpenAPI Not Loading

- Verify the path is correct and the file exists
- Check the file is valid YAML/JSON
- Look at Output → BerryCrush for error messages

### Fragments Not Found

- Verify the fragmentsPath setting
- Ensure fragment files have `.fragment` extension
- Run "BerryCrush: Refresh Fragments"
