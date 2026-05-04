# Syntax Highlighting

The BerryCrush extension provides rich syntax highlighting for `.scenario` and `.fragment` files.

## File Types

### Scenario Files (`.scenario`)

Test scenarios containing features, scenarios, and test steps.

### Fragment Files (`.fragment`)

Reusable step sequences that can be included in scenarios.

## Highlighted Elements

| Element | Description | Example |
|---------|-------------|---------|
| Block Keywords | Scenario/fragment declarations | `scenario:`, `fragment:`, `feature:` |
| Step Keywords | Step prefixes | `given`, `when`, `then`, `and`, `but` |
| Directives | Action keywords | `call`, `assert`, `extract`, `include`, `body` |
| Operation References | API operation IDs | `^createUser`, `^getPetById` |
| Variables | Interpolated values | `{{userId}}`, `{{authToken}}` |
| JSON Path | Property paths | `$.name`, `$.items[0].id` |
| Strings | Quoted values | `"value"`, `'value'` |
| Numbers | Numeric literals | `200`, `3.14` |
| Comments | Line comments | `# This is a comment` |
| Tags | Test tags | `@smoke`, `@critical` |
| Tables | Parameter tables | `\| key \| value \|` |

## Examples

### Scenario with Highlighting

```berrycrush
# User management test suite
@smoke @critical
scenario: Create and retrieve user
  given user data is prepared
    body:
      {
        "name": "John Doe",
        "email": "john@example.com"
      }
  when creating the user
    call ^createUser
  then user is created
    assert status 201
    extract $.id => userId
  and can retrieve the user
    call ^getUserById
      | id | {{userId}} |
    assert $.name equals "John Doe"
```

### Fragment with Highlighting

```berrycrush
# Authentication fragment
fragment: authenticate
  parameters:
    username: testuser
    password: secret123
  given credentials are provided
    call ^login
      | username | {{username}} |
      | password | {{password}} |
  then authentication succeeds
    assert status 200
    extract $.accessToken => token
```

## Customizing Colors

VS Code allows customizing token colors through settings:

1. Open Settings (Ctrl+, / Cmd+,)
2. Search for "Editor: Token Color Customizations"
3. Click "Edit in settings.json"

Example customization:

```json
{
  "editor.tokenColorCustomizations": {
    "textMateRules": [
      {
        "scope": "keyword.control.berrycrush",
        "settings": {
          "foreground": "#569CD6"
        }
      }
    ]
  }
}
```

## Related Features

- [Code Folding](folding.md) - Collapse highlighted blocks
- [Document Outline](outline.md) - Navigate highlighted sections
