# Code Folding

Collapse and expand sections to focus on relevant parts of your scenario files.

## Folding Controls

### Fold/Unfold

- **Keyboard**: Ctrl+Shift+[ to fold, Ctrl+Shift+] to unfold
- **Click**: Click the fold icon (-/+) in the gutter
- **Command Palette**: "Fold" and "Unfold" commands

### Fold All / Unfold All

- **Fold All**: Ctrl+K Ctrl+0
- **Unfold All**: Ctrl+K Ctrl+J

### Fold Levels

- **Fold Level 1**: Ctrl+K Ctrl+1 (scenarios/fragments only)
- **Fold Level 2**: Ctrl+K Ctrl+2 (include steps)
- **Fold Level 3+**: Ctrl+K Ctrl+3, etc.

## Foldable Regions

### Scenarios

The entire scenario block can be folded:

```berrycrush
scenario: User management    ▼
  given user exists
    call ^getUser
  then response OK
    assert status 200
```

Folded:
```
scenario: User management    ▶ ...
```

### Fragments

Fragment definitions can be folded:

```berrycrush
fragment: login    ▼
  given credentials
    call ^authenticate
  then success
    assert status 200
```

### Steps

Individual step blocks can be folded:

```berrycrush
scenario: Test
  given complex setup    ▼
    call ^step1
    call ^step2
    call ^step3
    assert status 200
  then simple assertion
    assert $.ok equals true
```

### Features

Feature blocks with multiple scenarios:

```berrycrush
feature: User API    ▼
  scenario: Create user
    ...
  scenario: Update user
    ...
  scenario: Delete user
    ...
```

### Examples Tables

Large examples tables can be collapsed:

```berrycrush
examples:    ▼
  | name  | email           | age |
  | John  | john@test.com   | 25  |
  | Jane  | jane@test.com   | 30  |
  | Bob   | bob@test.com    | 35  |
```

## Fold Indicators

In the editor gutter:

| Icon | Meaning |
|------|---------|
| ▼ | Expanded (can fold) |
| ▶ | Collapsed (can unfold) |

## Keyboard Shortcuts

| Action | Windows/Linux | macOS |
|--------|---------------|-------|
| Fold | Ctrl+Shift+[ | Cmd+Option+[ |
| Unfold | Ctrl+Shift+] | Cmd+Option+] |
| Fold All | Ctrl+K Ctrl+0 | Cmd+K Cmd+0 |
| Unfold All | Ctrl+K Ctrl+J | Cmd+K Cmd+J |
| Fold Level 1 | Ctrl+K Ctrl+1 | Cmd+K Cmd+1 |
| Toggle Fold | Ctrl+K Ctrl+L | Cmd+K Cmd+L |

## Tips

- Fold all scenarios to get an overview
- Unfold only the scenario you're working on
- Use fold level commands for consistent views
- Folding state is preserved when switching tabs

## Related Features

- [Document Outline](outline.md) - Navigate folded sections
- [Syntax Highlighting](syntax.md) - Visual block structure
