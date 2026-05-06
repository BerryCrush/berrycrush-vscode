import * as assert from 'assert';
import * as vscode from 'vscode';
import { ScenarioDocumentSymbolProvider } from '../../symbol-provider';

suite('ScenarioDocumentSymbolProvider Tests', () => {
    let provider: ScenarioDocumentSymbolProvider;

    suiteSetup(() => {
        provider = new ScenarioDocumentSymbolProvider();
    });

    // Helper to create a mock document
    function createMockDocument(content: string): vscode.TextDocument {
        const lines = content.split('\n');
        return {
            getText: (range?: vscode.Range) => {
                if (!range) {
                    return content;
                }
                const selectedLines = lines.slice(range.start.line, range.end.line + 1);
                return selectedLines.join('\n');
            },
            lineAt: (lineOrPosition: number | vscode.Position) => {
                const lineNum = typeof lineOrPosition === 'number' ? lineOrPosition : lineOrPosition.line;
                const text = lines[lineNum] || '';
                return {
                    text,
                    range: new vscode.Range(
                        new vscode.Position(lineNum, 0),
                        new vscode.Position(lineNum, text.length)
                    ),
                    isEmptyOrWhitespace: text.trim() === ''
                };
            },
            positionAt: (offset: number) => {
                let line = 0;
                let char = 0;
                for (let i = 0; i < offset && i < content.length; i++) {
                    if (content[i] === '\n') {
                        line++;
                        char = 0;
                    } else {
                        char++;
                    }
                }
                return new vscode.Position(line, char);
            },
            lineCount: lines.length
        } as vscode.TextDocument;
    }

    // Helper to create mock cancellation token
    function createMockToken(): vscode.CancellationToken {
        return {
            isCancellationRequested: false,
            onCancellationRequested: () => ({ dispose: () => {} })
        };
    }

    suite('Feature Parsing', () => {
        test('parses simple feature', () => {
            const content = `feature: Pet Store API
  scenario: List pets
    given setup
      call ^listPets`;
            
            const doc = createMockDocument(content);
            const symbols = provider.provideDocumentSymbols(doc, createMockToken());
            
            assert.strictEqual(symbols.length, 1, 'Should have 1 top-level symbol');
            assert.ok(symbols[0].name.includes('feature:'), 'Should be a feature');
            assert.strictEqual(symbols[0].kind, vscode.SymbolKind.Class, 'Feature should be Class kind');
        });

        test('parses feature with tags', () => {
            const content = `@api @smoke feature: Tagged Feature
  scenario: Test`;
            
            const doc = createMockDocument(content);
            const symbols = provider.provideDocumentSymbols(doc, createMockToken());
            
            assert.ok(symbols[0].name.includes('@api'), 'Should include tags');
            assert.ok(symbols[0].name.includes('@smoke'), 'Should include all tags');
        });
    });

    suite('Scenario Parsing', () => {
        test('parses standalone scenario', () => {
            const content = `scenario: Create Pet
  given setup
    call ^setup
  when creating
    call ^createPet
  then created
    assert status 201`;
            
            const doc = createMockDocument(content);
            const symbols = provider.provideDocumentSymbols(doc, createMockToken());
            
            assert.strictEqual(symbols.length, 1, 'Should have 1 top-level symbol');
            assert.ok(symbols[0].name.includes('scenario:'), 'Should be a scenario');
            assert.strictEqual(symbols[0].kind, vscode.SymbolKind.Method, 'Scenario should be Method kind');
        });

        test('parses scenario inside feature', () => {
            const content = `feature: Pet Store
  scenario: Create Pet
    given setup
  scenario: Delete Pet
    when delete`;
            
            const doc = createMockDocument(content);
            const symbols = provider.provideDocumentSymbols(doc, createMockToken());
            
            assert.strictEqual(symbols.length, 1, 'Should have 1 feature');
            assert.strictEqual(symbols[0].children.length, 2, 'Feature should have 2 scenarios');
            assert.ok(symbols[0].children[0].name.includes('Create Pet'), 'First scenario');
            assert.ok(symbols[0].children[1].name.includes('Delete Pet'), 'Second scenario');
        });

        test('parses scenario with tags', () => {
            const content = `@smoke @critical scenario: Important Test
  given precondition`;
            
            const doc = createMockDocument(content);
            const symbols = provider.provideDocumentSymbols(doc, createMockToken());
            
            assert.ok(symbols[0].name.includes('@smoke'), 'Should include tags');
        });
    });

    suite('Outline Parsing', () => {
        test('parses outline with examples', () => {
            const content = `outline: Parameterized test
  given pet <petId>
    call ^getPet
  examples:
    | petId |
    | 1     |
    | 2     |`;
            
            const doc = createMockDocument(content);
            const symbols = provider.provideDocumentSymbols(doc, createMockToken());
            
            assert.strictEqual(symbols.length, 1, 'Should have 1 outline');
            assert.ok(symbols[0].name.includes('outline:'), 'Should be an outline');
            
            const examples = symbols[0].children.find(c => c.name.includes('examples'));
            assert.ok(examples, 'Should have examples child');
            assert.strictEqual(examples.kind, vscode.SymbolKind.Array, 'Examples should be Array kind');
        });
    });

    suite('Background Parsing', () => {
        test('parses background in feature', () => {
            const content = `feature: Test
  background:
    given authenticated
      include auth
  scenario: Test
    when action`;
            
            const doc = createMockDocument(content);
            const symbols = provider.provideDocumentSymbols(doc, createMockToken());
            
            const background = symbols[0].children.find(c => c.name.includes('background'));
            assert.ok(background, 'Should have background');
            assert.strictEqual(background.kind, vscode.SymbolKind.Constructor, 'Background should be Constructor kind');
        });
    });

    suite('Fragment Parsing', () => {
        test('parses fragment', () => {
            const content = `fragment: authenticate
  given user credentials
    call ^login
    extract $.token => token`;
            
            const doc = createMockDocument(content);
            const symbols = provider.provideDocumentSymbols(doc, createMockToken());
            
            assert.strictEqual(symbols.length, 1, 'Should have 1 fragment');
            assert.ok(symbols[0].name.includes('fragment:'), 'Should be a fragment');
            assert.strictEqual(symbols[0].kind, vscode.SymbolKind.Function, 'Fragment should be Function kind');
        });

        test('parses fragment with tags', () => {
            const content = `@auth fragment: authenticate
  given credentials`;
            
            const doc = createMockDocument(content);
            const symbols = provider.provideDocumentSymbols(doc, createMockToken());
            
            assert.ok(symbols[0].name.includes('@auth'), 'Should include tag');
        });
    });

    suite('Step Parsing', () => {
        test('parses steps under scenario', () => {
            const content = `scenario: Test
  given precondition
    call ^setup
  when action happens
    call ^action
  then result verified
    assert status 200`;
            
            const doc = createMockDocument(content);
            const symbols = provider.provideDocumentSymbols(doc, createMockToken());
            
            const scenario = symbols[0];
            assert.ok(scenario.children.length >= 3, 'Should have at least 3 steps');
            
            const given = scenario.children.find(c => c.name.includes('given'));
            const when = scenario.children.find(c => c.name.includes('when'));
            const then = scenario.children.find(c => c.name.includes('then'));
            
            assert.ok(given, 'Should have given step');
            assert.ok(when, 'Should have when step');
            assert.ok(then, 'Should have then step');
        });

        test('parses steps with colon syntax', () => {
            const content = `scenario: Test
  when: I perform action
    call ^action
  then: result is verified
    assert status 200`;
            
            const doc = createMockDocument(content);
            const symbols = provider.provideDocumentSymbols(doc, createMockToken());
            
            const scenario = symbols[0];
            const when = scenario.children.find(c => c.name.includes('when'));
            const then = scenario.children.find(c => c.name.includes('then'));
            
            assert.ok(when, 'Should parse when: syntax');
            assert.ok(then, 'Should parse then: syntax');
        });

        test('parses and/but steps', () => {
            const content = `scenario: Test
  given first condition
  and second condition
  but not third`;
            
            const doc = createMockDocument(content);
            const symbols = provider.provideDocumentSymbols(doc, createMockToken());
            
            const scenario = symbols[0];
            const andStep = scenario.children.find(c => c.name.includes('and'));
            const butStep = scenario.children.find(c => c.name.includes('but'));
            
            assert.ok(andStep, 'Should have and step');
            assert.ok(butStep, 'Should have but step');
        });
    });

    suite('Parameters Parsing', () => {
        test('parses parameters block', () => {
            const content = `scenario: Parameterized
  parameters:
    petId: 123
    name: Fluffy
  given setup`;
            
            const doc = createMockDocument(content);
            const symbols = provider.provideDocumentSymbols(doc, createMockToken());
            
            const params = symbols[0].children.find(c => c.name.includes('parameters'));
            assert.ok(params, 'Should have parameters');
            assert.strictEqual(params.kind, vscode.SymbolKind.Struct, 'Parameters should be Struct kind');
        });
    });

    suite('Complex Structures', () => {
        test('parses feature with background, scenarios, and steps', () => {
            const content = `@api feature: Pet Store
  background:
    given authenticated
      include auth
  
  @smoke scenario: Create Pet
    given pet data
      call ^createPet
    then created
      assert status 201
  
  @regression scenario: Delete Pet
    given existing pet
      call ^deletePet
    then deleted
      assert status 204`;
            
            const doc = createMockDocument(content);
            const symbols = provider.provideDocumentSymbols(doc, createMockToken());
            
            assert.strictEqual(symbols.length, 1, 'Should have 1 feature');
            const feature = symbols[0];
            
            // Feature should contain background and 2 scenarios
            const background = feature.children.find(c => c.name.includes('background'));
            const scenarios = feature.children.filter(c => c.name.includes('scenario'));
            
            assert.ok(background, 'Should have background');
            assert.strictEqual(scenarios.length, 2, 'Should have 2 scenarios');
            
            // Scenarios should have steps
            assert.ok(scenarios[0].children.length >= 2, 'First scenario should have steps');
            assert.ok(scenarios[1].children.length >= 2, 'Second scenario should have steps');
        });

        test('parses multiple fragments', () => {
            const content = `fragment: authenticate
  given credentials
    call ^login

fragment: cleanup
  given teardown
    call ^cleanup`;
            
            const doc = createMockDocument(content);
            const symbols = provider.provideDocumentSymbols(doc, createMockToken());
            
            assert.strictEqual(symbols.length, 2, 'Should have 2 fragments');
            assert.ok(symbols[0].name.includes('authenticate'), 'First fragment');
            assert.ok(symbols[1].name.includes('cleanup'), 'Second fragment');
        });
    });
});
