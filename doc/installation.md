# Installation

## Prerequisites

- VS Code version 1.85.0 or higher

## VS Code Marketplace (Recommended)

1. Open VS Code
2. Go to Extensions (Ctrl+Shift+X / Cmd+Shift+X)
3. Search for "BerryCrush"
4. Click **Install**

Or install via the command line:

```bash
code --install-extension berrycrush.berrycrush
```

## Manual Installation (VSIX)

If you have a `.vsix` file:

1. Open VS Code
2. Go to Extensions (Ctrl+Shift+X / Cmd+Shift+X)
3. Click the "..." menu at the top of the Extensions panel
4. Select "Install from VSIX..."
5. Choose the `berrycrush-x.x.x.vsix` file

Or via command line:

```bash
code --install-extension path/to/berrycrush-x.x.x.vsix
```

## Verify Installation

After installation, verify the extension is working:

1. Open a `.scenario` or `.fragment` file
2. You should see syntax highlighting
3. Check the status bar for "BerryCrush Scenario" or "BerryCrush Fragment"

## Troubleshooting

### Extension Not Activating

- Ensure the file extension is `.scenario` or `.fragment`
- Check Output > BerryCrush for error messages
- Try reloading VS Code (Ctrl+Shift+P > "Developer: Reload Window")

### Syntax Highlighting Not Working

- Verify the file has the correct extension
- Check that no other extension is overriding the language

### Missing Features

- Ensure you've configured the OpenAPI path if using operation references
- Run "BerryCrush: Refresh OpenAPI" from the command palette

## Uninstall

1. Go to Extensions
2. Find "BerryCrush"
3. Click **Uninstall**

## Next Steps

- [Getting Started](getting-started.md) - Create your first scenario
- [Configuration](configuration/settings.md) - Configure the extension
