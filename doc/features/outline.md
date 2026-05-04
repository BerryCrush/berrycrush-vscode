# Document Outline

Navigate your scenario files using the Outline view and breadcrumbs.

## Outline View

### Opening the Outline

1. **View Menu**: View → Open View → Outline
2. **Explorer**: Expand the "Outline" section in the Explorer sidebar
3. **Keyboard**: Ctrl+Shift+O to open symbol picker

### Outline Contents

The outline shows the structure of your file:

```
📄 my-test.scenario
├── @smoke
├── @api
├── 📋 scenario: Create user
│   ├── given user data is ready
│   ├── when creating the user
│   └── then user is created
└── 📋 scenario: Update user
    ├── given user exists
    ├── when updating the user
    └── then user is updated
```

### Symbol Types

| Symbol | Icon | Description |
|--------|------|-------------|
| Scenario | 📋 | Test scenario |
| Fragment | 📦 | Reusable fragment |
| Feature | 📁 | Feature group |
| Step | → | Given/when/then step |
| Tag | 🏷️ | Test tag |
| Examples | 📊 | Data table for outline |

## Navigating

### Click to Navigate

Click any symbol in the outline to jump to that location in the editor.

### Filter Symbols

Type in the outline search box to filter:
- Type "create" to show only items containing "create"
- Type "@smoke" to show only smoke-tagged items

### Sort Options

Right-click the outline title bar:
- **Sort by Position** - Document order (default)
- **Sort by Name** - Alphabetical
- **Sort by Kind** - Group by type

## Breadcrumbs

### Enable Breadcrumbs

```json
{
  "breadcrumbs.enabled": true
}
```

### Using Breadcrumbs

The breadcrumb bar shows your current location:

```
my-test.scenario > scenario: Create user > given user data
```

Click any breadcrumb segment to:
- Jump to that location
- See siblings at that level

## Go to Symbol

### Quick Navigation

Press **Ctrl+Shift+O** (Cmd+Shift+O on macOS) to open the symbol picker:

1. Type to filter symbols
2. Use ↑↓ to select
3. Press Enter to navigate

### Symbol Prefixes

Add prefixes to filter by type:
- `@` - Show only tags
- `:` - Group by kind

## Keyboard Shortcuts

| Action | Windows/Linux | macOS |
|--------|---------------|-------|
| Go to Symbol | Ctrl+Shift+O | Cmd+Shift+O |
| Open Outline | View Menu | View Menu |
| Focus Outline | Ctrl+Shift+E, then Tab to Outline | Cmd+Shift+E |

## Tips

- Keep the outline open while editing large files
- Use breadcrumbs for quick context
- Filter by tags to find specific tests
- Collapse outline sections you're not using

## Related Features

- [Code Folding](folding.md) - Collapse sections
- [Navigation](navigation.md) - Go to definition
