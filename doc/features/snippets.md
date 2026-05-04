# Code Snippets

Quick templates for common BerryCrush patterns.

## Using Snippets

1. Type the snippet prefix
2. Press **Tab** or **Enter** to expand
3. Fill in the placeholder values
4. Press **Tab** to move to the next placeholder

## Available Snippets

### Scenario Snippets

| Prefix | Description | Expands To |
|--------|-------------|------------|
| `scenario` | Basic scenario | Full scenario template |
| `feature` | Feature block | Feature with scenarios |
| `background` | Background block | Shared setup steps |
| `outline` | Scenario outline | Parameterized scenario |
| `examples` | Examples table | Examples for outline |

### Step Snippets

| Prefix | Description | Expands To |
|--------|-------------|------------|
| `given` | Given step | `given description` |
| `when` | When step | `when description` |
| `then` | Then step | `then description` |
| `and` | And step | `and description` |
| `but` | But step | `but description` |

### Directive Snippets

| Prefix | Description | Expands To |
|--------|-------------|------------|
| `call` | API call | `call ^operationId` |
| `callwith` | Call with params | Call with parameter table |
| `assert` | Basic assertion | `assert status 200` |
| `assertpath` | JSON path assertion | `assert $.path equals value` |
| `extract` | Extract value | `extract $.path => variable` |
| `include` | Include fragment | `include fragmentName` |
| `body` | Request body | `body: { }` |

### Fragment Snippets

| Prefix | Description | Expands To |
|--------|-------------|------------|
| `fragment` | Fragment definition | Full fragment template |
| `parameters` | Parameters block | Parameters section |

## Snippet Examples

### Scenario Snippet

Type `scenario` and press Tab:

```berrycrush
scenario: ${1:scenario name}
  given ${2:precondition}
    ${3:step}
  when ${4:action}
    ${5:step}
  then ${6:expected result}
    ${7:step}
```

### Call with Parameters

Type `callwith` and press Tab:

```berrycrush
call ^${1:operationId}
  | ${2:param} | ${3:value} |
```

### Fragment with Parameters

Type `fragment` and press Tab:

```berrycrush
fragment: ${1:name}
  parameters:
    ${2:param}: ${3:defaultValue}
  given ${4:description}
    ${5:step}
```

### JSON Path Assertion

Type `assertpath` and press Tab:

```berrycrush
assert $.${1:path} ${2|equals,exists,contains,matches|} ${3:value}
```

## Custom Snippets

Create your own snippets:

1. Open Command Palette
2. Run **Preferences: Configure User Snippets**
3. Select **berrycrush-scenario** or **berrycrush-fragment**
4. Add your snippet

Example custom snippet:

```json
{
  "Auth Flow": {
    "prefix": "authflow",
    "body": [
      "given user authenticates",
      "  include login"
    ],
    "description": "Authentication flow include"
  }
}
```

## Tips

- Use **Tab** to cycle through placeholders
- Use **Shift+Tab** to go back
- Use **Escape** to exit snippet mode
- Placeholders can have default values: `${1:default}`
- Placeholders can have choices: `${1|option1,option2,option3|}`

## Related Features

- [Completion](completion.md) - Auto-completion suggestions
- [Formatting](formatting.md) - Format snippet output
