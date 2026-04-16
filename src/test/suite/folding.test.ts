import * as assert from 'assert';
import * as vscode from 'vscode';
import { ScenarioFoldingRangeProvider } from '../../folding-provider';

suite('ScenarioFoldingRangeProvider Tests', () => {
    let provider: ScenarioFoldingRangeProvider;

    suiteSetup(() => {
        provider = new ScenarioFoldingRangeProvider();
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

    // Helper to create mock folding context
    function createMockContext(): vscode.FoldingContext {
        return {} as vscode.FoldingContext;
    }

    // Helper to find fold range by start line
    function findRangeByStart(ranges: vscode.FoldingRange[], startLine: number): vscode.FoldingRange | undefined {
        return ranges.find(r => r.start === startLine);
    }

    suite('Feature Folding', () => {
        test('single feature folds to EOF', () => {
            const content = `feature: Pet Store
  scenario: List pets
    given some pets
      call ^listPets
    then pets are returned
      assert status 200`;
            
            const doc = createMockDocument(content);
            const ranges = provider.provideFoldingRanges(doc, createMockContext(), createMockToken());
            
            const featureRange = findRangeByStart(ranges, 0);
            assert.ok(featureRange, 'Feature should be foldable');
            assert.strictEqual(featureRange.start, 0);
            assert.strictEqual(featureRange.end, 5);
        });

        test('feature closes at next feature', () => {
            const content = `feature: First Feature
  scenario: Test 1
    given something
feature: Second Feature
  scenario: Test 2
    given something else`;
            
            const doc = createMockDocument(content);
            const ranges = provider.provideFoldingRanges(doc, createMockContext(), createMockToken());
            
            const feature1 = findRangeByStart(ranges, 0);
            const feature2 = findRangeByStart(ranges, 3);
            
            assert.ok(feature1, 'First feature should be foldable');
            assert.strictEqual(feature1.end, 2, 'First feature ends at line 2');
            assert.ok(feature2, 'Second feature should be foldable');
            assert.strictEqual(feature2.end, 5, 'Second feature ends at EOF');
        });
    });

    suite('Scenario Folding', () => {
        test('scenario folds independently', () => {
            const content = `scenario: First Test
  given something
    call ^doSomething
  then result
    assert status 200
scenario: Second Test
  given another thing`;
            
            const doc = createMockDocument(content);
            const ranges = provider.provideFoldingRanges(doc, createMockContext(), createMockToken());
            
            const scenario1 = findRangeByStart(ranges, 0);
            const scenario2 = findRangeByStart(ranges, 5);
            
            assert.ok(scenario1, 'First scenario should be foldable');
            assert.strictEqual(scenario1.end, 4, 'First scenario ends at line 4');
            assert.ok(scenario2, 'Second scenario should be foldable');
        });

        test('scenario inside feature', () => {
            const content = `feature: Tests
  scenario: Test 1
    given setup
      call ^setup
  scenario: Test 2
    given other setup`;
            
            const doc = createMockDocument(content);
            const ranges = provider.provideFoldingRanges(doc, createMockContext(), createMockToken());
            
            const scenario1 = findRangeByStart(ranges, 1);
            const scenario2 = findRangeByStart(ranges, 4);
            
            assert.ok(scenario1, 'First scenario should be foldable');
            assert.strictEqual(scenario1.end, 3, 'First scenario ends at line 3');
            assert.ok(scenario2, 'Second scenario should be foldable');
        });
    });

    suite('Fragment Folding', () => {
        test('fragment folds to EOF', () => {
            const content = `fragment: authenticate
  given user credentials
    call ^login
    extract $.token => authToken`;
            
            const doc = createMockDocument(content);
            const ranges = provider.provideFoldingRanges(doc, createMockContext(), createMockToken());
            
            const fragment = findRangeByStart(ranges, 0);
            assert.ok(fragment, 'Fragment should be foldable');
            assert.strictEqual(fragment.end, 3);
        });

        test('consecutive fragments fold independently', () => {
            const content = `fragment: first
  given step 1
    call ^first
fragment: second
  given step 2
    call ^second`;
            
            const doc = createMockDocument(content);
            const ranges = provider.provideFoldingRanges(doc, createMockContext(), createMockToken());
            
            const frag1 = findRangeByStart(ranges, 0);
            const frag2 = findRangeByStart(ranges, 3);
            
            assert.ok(frag1, 'First fragment should be foldable');
            assert.strictEqual(frag1.end, 2);
            assert.ok(frag2, 'Second fragment should be foldable');
        });
    });

    suite('Background Folding', () => {
        test('background folds until next block', () => {
            const content = `feature: Tests
  background:
    given authenticated user
      include authenticate
  scenario: Test
    when action`;
            
            const doc = createMockDocument(content);
            const ranges = provider.provideFoldingRanges(doc, createMockContext(), createMockToken());
            
            const background = findRangeByStart(ranges, 1);
            assert.ok(background, 'Background should be foldable');
            assert.strictEqual(background.end, 3);
        });
    });

    suite('Parameters Block Folding', () => {
        test('parameters block folds', () => {
            const content = `scenario: Parameterized test
  parameters:
    petId: 123
    name: "Fluffy"
  given a pet
    call ^getPetById`;
            
            const doc = createMockDocument(content);
            const ranges = provider.provideFoldingRanges(doc, createMockContext(), createMockToken());
            
            const params = findRangeByStart(ranges, 1);
            assert.ok(params, 'Parameters should be foldable');
            assert.strictEqual(params.end, 3);
        });
    });

    suite('Examples Table Folding', () => {
        test('examples block folds', () => {
            const content = `outline: Test with examples
  given pet <petId>
    call ^getPetById
      petId: <petId>
  examples:
    | petId | name    |
    | 1     | Fluffy  |
    | 2     | Buddy   |`;
            
            const doc = createMockDocument(content);
            const ranges = provider.provideFoldingRanges(doc, createMockContext(), createMockToken());
            
            const examples = findRangeByStart(ranges, 4);
            assert.ok(examples, 'Examples should be foldable');
            assert.strictEqual(examples.end, 7);
        });
    });

    suite('Conditional Block Folding', () => {
        test('if block folds', () => {
            const content = `scenario: Conditional test
  given a request
    call ^createPet
    if status 201
      assert $.id exists
      extract $.id => petId
    else
      fail "Creation failed"`;
            
            const doc = createMockDocument(content);
            const ranges = provider.provideFoldingRanges(doc, createMockContext(), createMockToken());
            
            const ifBlock = findRangeByStart(ranges, 3);
            assert.ok(ifBlock, 'If block should be foldable');
            assert.strictEqual(ifBlock.end, 5, 'If block ends before else');
            
            const elseBlock = findRangeByStart(ranges, 6);
            assert.ok(elseBlock, 'Else block should be foldable');
        });

        test('if-else if-else chain', () => {
            const content = `scenario: Status check
  given a request
    call ^getStatus
    if status 200
      assert $.status equals "ok"
    else if status 404
      assert $.error exists
    else
      fail "Unexpected status"`;
            
            const doc = createMockDocument(content);
            const ranges = provider.provideFoldingRanges(doc, createMockContext(), createMockToken());
            
            const ifBlock = findRangeByStart(ranges, 3);
            const elseIfBlock = findRangeByStart(ranges, 5);
            const elseBlock = findRangeByStart(ranges, 7);
            
            assert.ok(ifBlock, 'If block should be foldable');
            assert.ok(elseIfBlock, 'Else-if block should be foldable');
            assert.ok(elseBlock, 'Else block should be foldable');
        });
    });

    suite('Triple-Quote Block Folding', () => {
        test('triple-quoted body folds', () => {
            const content = `scenario: Body test
  given a request
    call ^createPet
      body:
        """
        {
          "name": "Fluffy",
          "status": "available"
        }
        """
    then created
      assert status 201`;
            
            const doc = createMockDocument(content);
            const ranges = provider.provideFoldingRanges(doc, createMockContext(), createMockToken());
            
            const tripleQuote = findRangeByStart(ranges, 4);
            assert.ok(tripleQuote, 'Triple-quoted block should be foldable');
            assert.strictEqual(tripleQuote.end, 9);
        });
    });

    suite('Comment Block Folding', () => {
        test('consecutive comments fold as block', () => {
            const content = `# This is a comment
# spanning multiple lines
# explaining the test
scenario: Test
  given something`;
            
            const doc = createMockDocument(content);
            const ranges = provider.provideFoldingRanges(doc, createMockContext(), createMockToken());
            
            const commentBlock = findRangeByStart(ranges, 0);
            assert.ok(commentBlock, 'Comment block should be foldable');
            assert.strictEqual(commentBlock.kind, vscode.FoldingRangeKind.Comment);
            assert.strictEqual(commentBlock.end, 2);
        });
    });

    suite('Body Block Folding', () => {
        test('indented body content folds', () => {
            const content = `scenario: Test
  given a request
    call ^createPet
      body:
        name: Fluffy
        status: available
        category:
          id: 1
          name: Dogs
    then success`;
            
            const doc = createMockDocument(content);
            const ranges = provider.provideFoldingRanges(doc, createMockContext(), createMockToken());
            
            const bodyBlock = findRangeByStart(ranges, 3);
            assert.ok(bodyBlock, 'Body block should be foldable');
            assert.strictEqual(bodyBlock.end, 8);
        });
    });

    suite('Step Folding', () => {
        test('given step folds with its contents', () => {
            const content = `scenario: Test
  given some precondition
    call ^setupData
    extract $.id => id
  when action happens
    call ^doAction`;
            
            const doc = createMockDocument(content);
            const ranges = provider.provideFoldingRanges(doc, createMockContext(), createMockToken());
            
            const givenStep = findRangeByStart(ranges, 1);
            assert.ok(givenStep, 'Given step should be foldable');
            assert.strictEqual(givenStep.end, 3, 'Given step ends before when');
        });

        test('when step folds with its contents', () => {
            const content = `scenario: Test
  given setup
    call ^setup
  when user creates pet
    call ^createPet
      body:
        name: Fluffy
  then pet is created
    assert status 201`;
            
            const doc = createMockDocument(content);
            const ranges = provider.provideFoldingRanges(doc, createMockContext(), createMockToken());
            
            const whenStep = findRangeByStart(ranges, 3);
            assert.ok(whenStep, 'When step should be foldable');
            assert.strictEqual(whenStep.end, 6, 'When step ends before then');
        });

        test('then step folds with its contents', () => {
            const content = `scenario: Test
  given setup
    call ^setup
  then response is valid
    assert status 200
    assert $.name equals "Fluffy"
    assert $.id exists`;
            
            const doc = createMockDocument(content);
            const ranges = provider.provideFoldingRanges(doc, createMockContext(), createMockToken());
            
            const thenStep = findRangeByStart(ranges, 3);
            assert.ok(thenStep, 'Then step should be foldable');
            assert.strictEqual(thenStep.end, 6, 'Then step ends at last assertion');
        });

        test('and step folds independently', () => {
            const content = `scenario: Test
  given first condition
    call ^first
  and second condition
    call ^second
  when action
    call ^action`;
            
            const doc = createMockDocument(content);
            const ranges = provider.provideFoldingRanges(doc, createMockContext(), createMockToken());
            
            const andStep = findRangeByStart(ranges, 3);
            assert.ok(andStep, 'And step should be foldable');
            assert.strictEqual(andStep.end, 4, 'And step ends before when');
        });

        test('but step folds independently', () => {
            const content = `scenario: Test
  given condition
    call ^setup
  but not another condition
    # comment about what we don't do
  when action
    call ^action`;
            
            const doc = createMockDocument(content);
            const ranges = provider.provideFoldingRanges(doc, createMockContext(), createMockToken());
            
            const butStep = findRangeByStart(ranges, 3);
            assert.ok(butStep, 'But step should be foldable');
            assert.strictEqual(butStep.end, 4, 'But step ends before when');
        });

        test('multiple consecutive steps fold separately', () => {
            const content = `scenario: Full test
  given precondition 1
    call ^setup1
  given precondition 2
    call ^setup2
  when action
    call ^action
  then result 1
    assert $.a exists
  then result 2
    assert $.b exists`;
            
            const doc = createMockDocument(content);
            const ranges = provider.provideFoldingRanges(doc, createMockContext(), createMockToken());
            
            const given1 = findRangeByStart(ranges, 1);
            const given2 = findRangeByStart(ranges, 3);
            const whenStep = findRangeByStart(ranges, 5);
            const then1 = findRangeByStart(ranges, 7);
            const then2 = findRangeByStart(ranges, 9);
            
            assert.ok(given1, 'First given should be foldable');
            assert.ok(given2, 'Second given should be foldable');
            assert.ok(whenStep, 'When should be foldable');
            assert.ok(then1, 'First then should be foldable');
            assert.ok(then2, 'Second then should be foldable');
        });

        test('steps inside feature > scenario fold correctly', () => {
            const content = `feature: Pet Store
  scenario: Create Pet
    given preconditions met
      call ^setup
      extract $.id => setupId
    when user creates pet
      call ^createPet
        body:
          name: Fluffy
    then pet is created
      assert status 201
      assert $.name equals "Fluffy"`;
            
            const doc = createMockDocument(content);
            const ranges = provider.provideFoldingRanges(doc, createMockContext(), createMockToken());
            
            // Steps should fold
            const givenStep = findRangeByStart(ranges, 2);
            const whenStep = findRangeByStart(ranges, 5);
            const thenStep = findRangeByStart(ranges, 9);
            
            assert.ok(givenStep, 'Given step inside feature>scenario should be foldable');
            assert.strictEqual(givenStep.end, 4, 'Given step ends before when');
            
            assert.ok(whenStep, 'When step inside feature>scenario should be foldable');
            assert.strictEqual(whenStep.end, 8, 'When step ends before then');
            
            assert.ok(thenStep, 'Then step inside feature>scenario should be foldable');
            assert.strictEqual(thenStep.end, 11, 'Then step ends at EOF');
        });

        test('steps inside background fold correctly', () => {
            const content = `feature: Pet Store
  background:
    given user is authenticated
      include authenticate
    and has admin permissions
      call ^setPermissions
        role: admin
  scenario: Test
    when action
      call ^action`;
            
            const doc = createMockDocument(content);
            const ranges = provider.provideFoldingRanges(doc, createMockContext(), createMockToken());
            
            const givenStep = findRangeByStart(ranges, 2);
            const andStep = findRangeByStart(ranges, 4);
            
            assert.ok(givenStep, 'Given step inside background should be foldable');
            assert.strictEqual(givenStep.end, 3, 'Given step ends before and');
            
            assert.ok(andStep, 'And step inside background should be foldable');
            assert.strictEqual(andStep.end, 6, 'And step ends before scenario');
        });

        test('steps with colon syntax fold correctly', () => {
            const content = `scenario: Test with colons
  when: I perform action
    call ^doAction
  then: result is verified
    assert status 200
    assert $.id exists`;
            
            const doc = createMockDocument(content);
            const ranges = provider.provideFoldingRanges(doc, createMockContext(), createMockToken());
            
            const whenStep = findRangeByStart(ranges, 1);
            const thenStep = findRangeByStart(ranges, 3);
            
            assert.ok(whenStep, 'When: step with colon should be foldable');
            assert.strictEqual(whenStep.end, 2, 'When: step ends before then:');
            
            assert.ok(thenStep, 'Then: step with colon should be foldable');
            assert.strictEqual(thenStep.end, 5, 'Then: step ends at EOF');
        });

        test('steps with colon inside feature > scenario fold correctly', () => {
            const content = `feature: Pet CRUD Operations
  scenario: Create a pet
    when: I create a new pet
      call ^createPet
        body: {"name": "Fluffy"}
    then: pet is created
      assert status 2xx
      extract $.id => petId`;
            
            const doc = createMockDocument(content);
            const ranges = provider.provideFoldingRanges(doc, createMockContext(), createMockToken());
            
            const whenStep = findRangeByStart(ranges, 2);
            const thenStep = findRangeByStart(ranges, 5);
            
            assert.ok(whenStep, 'When: inside feature>scenario should be foldable');
            assert.strictEqual(whenStep.end, 4, 'When: ends before then:');
            
            assert.ok(thenStep, 'Then: inside feature>scenario should be foldable');
            assert.strictEqual(thenStep.end, 7, 'Then: ends at EOF');
        });
    });

    suite('Complex Nested Structures', () => {
        test('feature with multiple scenarios and conditionals', () => {
            const content = `feature: Pet Management
  background:
    given authenticated user
      include authenticate

  scenario: Create pet
    given pet data
      call ^createPet
      if status 201
        extract $.id => petId
      else
        fail "Create failed"

  scenario: Update pet
    given existing pet
      call ^updatePet
    then updated`;
            
            const doc = createMockDocument(content);
            const ranges = provider.provideFoldingRanges(doc, createMockContext(), createMockToken());
            
            // Feature should fold entire content
            const feature = findRangeByStart(ranges, 0);
            assert.ok(feature, 'Feature should be foldable');
            assert.strictEqual(feature.end, 16);
            
            // Background should fold
            const background = findRangeByStart(ranges, 1);
            assert.ok(background, 'Background should be foldable');
            
            // Both scenarios should fold
            const scenario1 = findRangeByStart(ranges, 5);
            const scenario2 = findRangeByStart(ranges, 13);
            assert.ok(scenario1, 'First scenario should be foldable');
            assert.ok(scenario2, 'Second scenario should be foldable');
        });
    });
});
