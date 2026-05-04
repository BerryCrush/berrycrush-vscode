# Auto-Completion

Context-aware completions help you write scenarios faster with fewer errors.

## Triggering Completion

- **Automatic**: Completions appear as you type
- **Manual**: Press **Ctrl+Space** (or **Cmd+Space** on macOS)

## Completion Types

### Keywords

Step keywords are suggested at the start of lines:

```berrycrush
scenario: Test
  g|    # Suggests: given
  |     # Suggests: given, when, then, and, but
```

### Directives

Directives are suggested within steps:

```berrycrush
given user setup
  c|    # Suggests: call
  a|    # Suggests: assert
```

### Operation References

After typing `call ^`, operations from your OpenAPI spec are suggested:

```berrycrush
when creating user
  call ^|    # Suggests: createUser, getUserById, updateUser, etc.
```

### Fragment References

After typing `include`, available fragments are suggested:

```berrycrush
given user is ready
  include |    # Suggests: login, setup-user, auth-flow, etc.
```

### Assertion Keywords

After `assert`, assertion types are suggested:

```berrycrush
then response is valid
  assert |    # Suggests: status, header, schema, contains, $.path
```

### Variable References

Variables defined in scope are suggested:

```berrycrush
scenario: Test
  given extract user ID
    extract $.id => userId
  then use the ID
    call ^getUser
      id: {{|}}    # Suggests: userId
```

## Completion Details

Each completion shows:

- **Label**: The completion text
- **Kind**: Icon indicating the type (keyword, function, variable)
- **Detail**: Additional information (e.g., HTTP method for operations)
- **Documentation**: Description or usage example

## Examples

### Full Scenario with Completions

1. Type `scenario:` and a name
2. Press Enter, then `g` → select `given`
3. Type description, press Enter
4. Type `c` → select `call`
5. Type `^` → select an operation
6. Continue building your test

### Example Session

```
scenario: Create user test
  |           → Type 'g', select 'given'
  given |     → Type description
  given user data is ready
    |         → Type 'c', select 'call'
    call ^|   → Select 'createUser'
    call ^createUser
  |           → Type 't', select 'then'
  then |      → Type description
  then user is created
    |         → Type 'a', select 'assert'
    assert |  → Select 'status'
    assert status 201
```

## Configuration

### OpenAPI for Operations

Configure to enable operation completions:

```json
{
  "berrycrush.openapi.path": "api/openapi.yaml"
}
```

### Fragments Path

Configure where to find fragments:

```json
{
  "berrycrush.fragmentsPath": "src/test/resources"
}
```

## Refreshing Completions

If new operations or fragments aren't appearing:

1. Open Command Palette (**Ctrl+Shift+P** / **Cmd+Shift+P**)
2. Run:
   - **BerryCrush: Refresh OpenAPI** - For operations
   - **BerryCrush: Refresh Fragments** - For fragments
   - **BerryCrush: Refresh Custom Steps** - For custom steps

## Related Features

- [Navigation](navigation.md) - Navigate to definitions
- [Snippets](snippets.md) - Quick code templates
