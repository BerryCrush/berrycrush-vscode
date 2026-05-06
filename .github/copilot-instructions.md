# BerryCrush VS Code Extension Development Guidelines

## Overview

This is a VS Code extension for BerryCrush that provides IDE support for `.scenario` and `.fragment` files.

## Technology Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| TypeScript | 6.0 | Primary language |
| VS Code API | ^1.118.0 | Extension host |
| Node.js | 25 | Runtime |
| ESLint | 10.x | Linting |
| Mocha | 11.x | Testing |

## Project Structure

```
vscode/
├── src/
│   ├── extension.ts           # Entry point
│   ├── *-provider.ts          # Language providers
│   └── test/                  # Tests
├── syntaxes/                  # TextMate grammar
├── snippets/                  # Code snippets
├── resources/                 # Icons
└── package.json               # Manifest
```

## Build Commands

```bash
npm run compile    # Compile TypeScript
npm run watch      # Watch mode
npm run lint       # Run ESLint
npm run test       # Run tests
npx vsce package   # Package extension
```

## Code Quality Requirements

### Testing

**Every new feature MUST have corresponding tests:**

1. Create test file: `src/test/suite/{feature}.test.ts`
2. Use Mocha TDD style (`suite`, `test`, `setup`)
3. Test both happy paths and edge cases
4. Use mock documents and tokens for unit tests

Example test structure:
```typescript
suite('FeatureName Test Suite', () => {
    test('should handle basic case', () => {
        // Arrange, Act, Assert
    });

    test('should handle edge case', () => {
        // Test null/empty/invalid inputs
    });
});
```

### Documentation

**Every public API MUST have JSDoc comments:**

```typescript
/**
 * Brief description of the class/function.
 * 
 * @param param1 - Description of parameter
 * @returns Description of return value
 */
```

### Code Style

1. **No `any` types** - Use explicit types
2. **Null safety** - Check for null/undefined explicitly
3. **Async/await** - Prefer over Promise chains
4. **Disposables** - Always track and dispose VS Code resources
5. **Unused parameters** - Prefix with `_` (e.g., `_token`)
6. **Error handling** - Use try-catch, never throw in providers

### Linting

- All code must pass `npm run lint` with zero warnings
- Do not use lint ignore comments (`// eslint-disable`)
- Fix lint warnings properly, don't suppress them

## Definition of Done

A feature is complete when:

1. ✅ Implementation is finished
2. ✅ All existing tests pass (`npm run test`)
3. ✅ New tests are written for the feature
4. ✅ Lint passes with zero warnings (`npm run lint`)
5. ✅ JSDoc comments are added for public APIs
6. ✅ Code compiles without errors (`npm run compile`)

## Approval and Feedback

When all tasks are finished, the agent MUST ask for approval and feedback via the `vscode_askQuestions` tool. Request:

1. Code review approval
2. Feedback on implementation
3. Any additional improvements needed
