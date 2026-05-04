# Document Formatting

Automatically format your BerryCrush files for consistent style.

## Formatting Commands

### Format Entire Document

- **Keyboard**: Alt+Shift+F (Windows/Linux) or Option+Shift+F (macOS)
- **Command Palette**: Format Document
- **Context Menu**: Right-click → Format Document

### Format Selection

- **Keyboard**: Ctrl+K Ctrl+F (Windows/Linux) or Cmd+K Cmd+F (macOS)
- **Context Menu**: Right-click → Format Selection

## What Gets Formatted

### Indentation

Steps and nested content are properly indented:

**Before:**
```berrycrush
scenario: Test
given user exists
call ^getUser
then response OK
assert status 200
```

**After:**
```berrycrush
scenario: Test
  given user exists
    call ^getUser
  then response OK
    assert status 200
```

### Table Alignment

Data tables in `examples:` sections are aligned for readability:

**Before:**
```berrycrush
examples:
| name | email | age |
| John | john@example.com | 30 |
| Jane | jane@example.com | 25 |
```

**After:**
```berrycrush
examples:
  | name | email            | age |
  | John | john@example.com | 30  |
  | Jane | jane@example.com | 25  |
```

### Whitespace Cleanup

- Removes trailing whitespace
- Normalizes blank lines
- Ensures proper spacing around operators

## Configuration

### Indent Size

Set the number of spaces per indent level:

```json
{
  "berrycrush.formatting.indentSize": 2
}
```

Default: 2 spaces

### Table Alignment

Enable or disable table column alignment:

```json
{
  "berrycrush.formatting.alignTables": true
}
```

Default: enabled

## Format on Save

Enable automatic formatting when saving:

```json
{
  "editor.formatOnSave": true,
  "[berrycrush-scenario]": {
    "editor.formatOnSave": true
  },
  "[berrycrush-fragment]": {
    "editor.formatOnSave": true
  }
}
```

## Format on Type

Format as you type (e.g., after pressing Enter):

```json
{
  "editor.formatOnType": true
}
```

## Examples

### Full Scenario Formatting

**Before:**
```berrycrush
@smoke @api
scenario: Complete user workflow
given user data
body:
{"name":"John","email":"john@test.com"}
when creating user
call ^createUser
then user created
assert status 201
extract $.id => userId
and can retrieve
call ^getUser
|id|{{userId}}|
assert $.name equals "John"
```

**After:**
```berrycrush
@smoke @api
scenario: Complete user workflow
  given user data
    body:
      {"name":"John","email":"john@test.com"}
  when creating user
    call ^createUser
  then user created
    assert status 201
    extract $.id => userId
  and can retrieve
    call ^getUser
      | id | {{userId}} |
    assert $.name equals "John"
```

## Tips

- Format before committing code
- Use format on save for consistency
- Configure team-wide settings in `.vscode/settings.json`

## Related Features

- [Syntax Highlighting](syntax.md) - Visual structure
- [Code Folding](folding.md) - Collapse formatted blocks
