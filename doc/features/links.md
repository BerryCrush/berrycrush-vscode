# Document Links

Clickable links in your scenario files for quick navigation.

## Link Types

### Fragment Links

Fragment names in `include` directives become clickable:

```berrycrush
given user is authenticated
  include login    # ← Clickable link
```

**Ctrl+Click** (or **Cmd+Click** on macOS) opens the fragment file.

### Operation Links

Operation references become clickable:

```berrycrush
when creating a user
  call ^createUser    # ← Clickable link
```

Opens the operation definition in your OpenAPI spec.

## Link Indicators

Links are indicated by:
- **Underline**: Links appear underlined when you hover
- **Cursor Change**: Cursor changes to pointer over links
- **Ctrl/Cmd key**: Hold Ctrl/Cmd to see all links

## Using Links

### Single Click (with modifier)

- **Windows/Linux**: Ctrl+Click
- **macOS**: Cmd+Click

### Multiple Links

When a line has multiple links, click the specific one you want:

```berrycrush
given user is authenticated
  include login            # Link 1 - fragment reference
when checking profile
  call ^getProfile         # Link 2 - operation reference
```

## Link Decorations

### Valid Links

Links to existing targets appear normally.

### Broken Links

Links to missing fragments or operations may show:
- Different color (depending on theme)
- Warning in Problems panel
- Tooltip indicating the issue

## Configuration

### Fragment Path

Set where to search for fragments:

```json
{
  "berrycrush.fragmentsPath": "src/test/resources"
}
```

### OpenAPI Path

Set the OpenAPI spec location:

```json
{
  "berrycrush.openapi.path": "api/openapi.yaml"
}
```

## Hover Information

Hover over a link to see:
- **Fragment links**: Fragment location and preview
- **Operation links**: HTTP method, path, and description

## Keyboard Navigation

| Action | Windows/Linux | macOS |
|--------|---------------|-------|
| Follow Link | Ctrl+Click | Cmd+Click |
| Open Link to Side | Ctrl+Alt+Click | Cmd+Option+Click |
| Go Back | Alt+← | Ctrl+- |

## Tips

- Use links for quick navigation in large projects
- Broken links often indicate typos or missing files
- Configure paths correctly for links to work

## Related Features

- [Navigation](navigation.md) - Go to definition and find references
- [Completion](completion.md) - Auto-complete creates valid links
