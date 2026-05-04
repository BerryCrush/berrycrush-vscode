# Getting Started

This guide will help you create your first BerryCrush scenario file in VS Code.

## Create a Scenario File

1. Create a new file with the `.scenario` extension (e.g., `my-first-test.scenario`)
2. The BerryCrush extension will automatically activate

## Basic Syntax

A simple scenario file looks like this:

```berrycrush
# My first scenario
@smoke
scenario: Get user by ID
  given user exists with ID 123
    call ^getUser
      | id | 123 |
  then response is successful
    assert status 200
    assert $.name exists
```

### Key Elements

| Element | Description | Example |
|---------|-------------|---------|
| Comments | Lines starting with `#` | `# This is a comment` |
| Tags | Start with `@` | `@smoke`, `@critical` |
| Scenario | Block starting with `scenario:` | `scenario: Test name` |
| Steps | Keywords: `given`, `when`, `then`, `and`, `but` | `given user exists` |
| Directives | Actions: `call`, `assert`, `extract`, `include` | `call ^operationId` |
| Parameters | Key-value pairs | `name: value` |

## Create a Fragment

Fragments are reusable step sequences. Create a `.fragment` file:

```berrycrush
# Authentication fragment
fragment: login
  given user credentials
    call ^authenticate
      username: admin
      password: secret
  then authentication succeeds
    assert status 200
    extract $.token => authToken
```

## Use the Fragment

Include the fragment in your scenario:

```berrycrush
scenario: Create post with authentication
  given user is authenticated
    include login
  when creating a new post
    call ^createPost
      body: {"title": "My Post"}
  then post is created
    assert status 201
```

## OpenAPI Integration

To enable operation completion and navigation:

1. Open VS Code settings (Ctrl+, / Cmd+,)
2. Search for "berrycrush"
3. Set `berrycrush.openapi.path` to your OpenAPI spec file

Or add to `.vscode/settings.json`:

```json
{
  "berrycrush.openapi.path": "api/openapi.yaml"
}
```

## Useful Commands

Open the Command Palette (Ctrl+Shift+P / Cmd+Shift+P) and search for:

| Command | Description |
|---------|-------------|
| BerryCrush: Refresh OpenAPI | Reload OpenAPI spec |
| BerryCrush: Refresh Fragments | Rescan fragment files |
| BerryCrush: Refresh Custom Steps | Reload custom step definitions |

## Features to Explore

- **Auto-completion** - Press Ctrl+Space for suggestions
- **Go to Definition** - Ctrl+Click on fragment names or operation IDs
- **Find References** - Right-click > Find All References
- **Format Document** - Alt+Shift+F / Option+Shift+F
- **Document Outline** - View > Open View > Outline

## Next Steps

- [Features](features/syntax.md) - Explore all extension features
- [Configuration](configuration/settings.md) - Customize settings
- [BerryCrush Documentation](https://berrycrush.github.io/) - Learn more about BerryCrush
