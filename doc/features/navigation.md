# Navigation

Navigate quickly through your BerryCrush files using go-to-definition and find references.

## Go to Definition

Jump to the definition of fragments and operations.

### Fragment Navigation

**Ctrl+Click** (or **F12**) on a fragment name in an `include` directive:

```berrycrush
given user is authenticated
  include login    # Ctrl+Click to jump to fragment definition
```

This opens the `.fragment` file containing the `fragment: login` definition.

### Operation Navigation

**Ctrl+Click** on an operation reference:

```berrycrush
when creating a user
  call ^createUser    # Ctrl+Click to view operation in OpenAPI spec
```

This shows the operation definition from your OpenAPI specification.

## Find All References

Find where fragments and operations are used.

### Finding Fragment Usages

1. Right-click on a fragment name
2. Select **Find All References** (or press **Shift+F12**)

Shows all files where the fragment is included:

```
Results:
  test-login.scenario:15 - include login
  test-checkout.scenario:8 - include login
  test-profile.scenario:22 - include login
```

### Finding Operation Usages

Works similarly for operation references (`^operationId`).

## Peek Definition

View definitions without leaving your current file:

1. Right-click on a fragment or operation reference
2. Select **Peek Definition** (or press **Alt+F12**)

A small inline window shows the definition.

## Keyboard Shortcuts

| Action | Windows/Linux | macOS |
|--------|---------------|-------|
| Go to Definition | F12 or Ctrl+Click | F12 or Cmd+Click |
| Peek Definition | Alt+F12 | Option+F12 |
| Find All References | Shift+F12 | Shift+F12 |
| Go Back | Alt+← | Ctrl+- |
| Go Forward | Alt+→ | Ctrl+Shift+- |

## Configuration

To enable operation navigation, configure the OpenAPI path:

```json
{
  "berrycrush.openapi.path": "api/openapi.yaml"
}
```

For multiple specs:

```json
{
  "berrycrush.openapi.paths": [
    "api/users.yaml",
    "api/products.yaml"
  ]
}
```

## Troubleshooting

### Fragment Navigation Not Working

- Ensure the fragment file is in the configured fragments path
- Run **BerryCrush: Refresh Fragments** from the command palette

### Operation Navigation Not Working

- Verify the OpenAPI path is correct
- Run **BerryCrush: Refresh OpenAPI** from the command palette
- Check that the operation ID exists in the spec

## Related Features

- [Document Links](links.md) - Clickable links in the editor
- [Document Outline](outline.md) - Navigate via symbols view
