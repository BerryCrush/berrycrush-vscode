# Contributing

Guidelines for contributing to the BerryCrush VS Code extension.

## Getting Started

1. Read [Development Setup](setup.md) to set up your environment
2. Review [Architecture](architecture.md) to understand the codebase
3. Check the issue tracker for open issues

## Contribution Process

### 1. Open an Issue

Before starting work:
- Check if an issue already exists
- Create a new issue describing the feature or bug
- Wait for feedback on your proposal

### 2. Fork and Branch

```bash
# Fork the repository on GitHub
git clone https://github.com/YOUR-USERNAME/berrycrush.git
cd berrycrush/vscode
git checkout -b feature/my-feature
```

### 3. Make Changes

- Write clean, readable code
- Follow existing code style
- Add tests for new features
- Update documentation as needed

### 4. Test

```bash
npm run lint
npm test
```

### 5. Commit

Write clear commit messages:

```
feat: add hover support for operations

- Show HTTP method and path on hover
- Include operation description if available
- Handle missing operation gracefully
```

Follow conventional commits:
- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation only
- `refactor:` Code refactoring
- `test:` Test changes
- `chore:` Build/tooling changes

### 6. Push and PR

```bash
git push origin feature/my-feature
```

Create a pull request on GitHub.

## Code Style

### TypeScript

- Use TypeScript strict mode
- Prefer `const` over `let`
- Use meaningful variable names
- Add JSDoc for public APIs

```typescript
/**
 * Finds the fragment definition at the given position.
 * @param document The document to search
 * @param position The cursor position
 * @returns The fragment location, or undefined if not found
 */
function findFragmentDefinition(
  document: vscode.TextDocument,
  position: vscode.Position
): vscode.Location | undefined {
  // Implementation
}
```

### Formatting

- Run ESLint: `npm run lint`
- Use 2-space indentation
- Use single quotes for strings
- Add trailing commas

### Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Files | kebab-case | `completion-provider.ts` |
| Classes | PascalCase | `CompletionProvider` |
| Functions | camelCase | `getOperationId()` |
| Constants | UPPER_SNAKE_CASE | `DEFAULT_INDENT_SIZE` |

## Testing

### Test Structure

Place tests in `src/test/`:

```
src/test/
├── suite/
│   ├── completion.test.ts
│   ├── definition.test.ts
│   └── formatting.test.ts
└── runTest.ts
```

### Writing Tests

```typescript
suite('Completion Provider', () => {
  test('completes keywords', async () => {
    // Arrange
    const doc = await openTestDocument('test.scenario');
    
    // Act
    const completions = await getCompletions(doc, position);
    
    // Assert
    assert.ok(completions.some(c => c.label === 'given'));
  });
});
```

## Documentation

### Code Comments

- Add JSDoc for exported functions and classes
- Explain complex logic with inline comments
- Keep comments up-to-date with code changes

### User Documentation

Update `doc/` when:
- Adding new features
- Changing existing behavior
- Adding new settings or commands

## Review Process

Pull requests are reviewed for:
- Code quality and style
- Test coverage
- Documentation updates
- Breaking changes

## Questions?

- Open a GitHub issue for questions
- Tag maintainers for help
