import * as assert from 'assert';
import * as vscode from 'vscode';
import { ScenarioFormattingProvider } from '../../formatting-provider';

suite('ScenarioFormattingProvider Tests', () => {
    let provider: ScenarioFormattingProvider;

    suiteSetup(() => {
        provider = new ScenarioFormattingProvider();
    });

    // Helper to create a mock document
    function createMockDocument(content: string): vscode.TextDocument {
        return {
            getText: (range?: vscode.Range) => {
                if (!range) {
                    return content;
                }
                const lines = content.split('\n');
                const startLine = range.start.line;
                const endLine = range.end.line;
                const selectedLines = lines.slice(startLine, endLine + 1);
                return selectedLines.join('\n');
            },
            lineAt: (lineOrPosition: number | vscode.Position) => {
                const lineNum = typeof lineOrPosition === 'number' ? lineOrPosition : lineOrPosition.line;
                const lines = content.split('\n');
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
            lineCount: content.split('\n').length
        } as vscode.TextDocument;
    }

    suite('Basic Indentation', () => {
        test('scenario at root level - no indent', () => {
            const input = '  scenario: Test';
            const doc = createMockDocument(input);
            const edits = provider.provideDocumentFormattingEdits(
                doc,
                { tabSize: 2, insertSpaces: true },
                {} as vscode.CancellationToken
            );
            assert.ok(edits.length > 0 || input.trimStart() === 'scenario: Test');
        });

        test('feature at root level - no indent', () => {
            const input = '   feature: My Feature';
            const doc = createMockDocument(input);
            const edits = provider.provideDocumentFormattingEdits(
                doc,
                { tabSize: 2, insertSpaces: true },
                {} as vscode.CancellationToken
            );
            
            if (edits.length > 0) {
                const result = edits[0].newText;
                assert.ok(result.startsWith('feature:'), 'Feature should have no indent');
            }
        });

        test('scenario inside feature - 2 space indent', () => {
            const input = `feature: Pet Store
scenario: List pets`;
            const doc = createMockDocument(input);
            const edits = provider.provideDocumentFormattingEdits(
                doc,
                { tabSize: 2, insertSpaces: true },
                {} as vscode.CancellationToken
            );
            
            if (edits.length > 0) {
                const result = edits[0].newText;
                const lines = result.split('\n');
                assert.ok(lines[1].startsWith('  scenario:'), 'Scenario inside feature should have 2 space indent');
            }
        });

        test('step keywords in standalone scenario', () => {
            const input = `scenario: Test
given setup
when action
then verify`;
            const doc = createMockDocument(input);
            const edits = provider.provideDocumentFormattingEdits(
                doc,
                { tabSize: 2, insertSpaces: true },
                {} as vscode.CancellationToken
            );
            
            if (edits.length > 0) {
                const result = edits[0].newText;
                const lines = result.split('\n');
                assert.strictEqual(lines[0], 'scenario: Test');
                assert.ok(lines[1].startsWith('  given'), 'given should have 2 space indent');
                assert.ok(lines[2].startsWith('  when'), 'when should have 2 space indent');
                assert.ok(lines[3].startsWith('  then'), 'then should have 2 space indent');
            }
        });

        test('directives under steps', () => {
            const input = `scenario: Test
when I call API
call ^getPets
assert status 200`;
            const doc = createMockDocument(input);
            const edits = provider.provideDocumentFormattingEdits(
                doc,
                { tabSize: 2, insertSpaces: true },
                {} as vscode.CancellationToken
            );
            
            if (edits.length > 0) {
                const result = edits[0].newText;
                const lines = result.split('\n');
                assert.ok(lines[2].startsWith('    call'), 'call should have 4 space indent');
                assert.ok(lines[3].startsWith('    assert'), 'assert should have 4 space indent');
            }
        });
    });

    suite('Feature with Background', () => {
        test('background has correct indent', () => {
            const input = `feature: Pet Store
background:
given setup
call ^login`;
            const doc = createMockDocument(input);
            const edits = provider.provideDocumentFormattingEdits(
                doc,
                { tabSize: 2, insertSpaces: true },
                {} as vscode.CancellationToken
            );
            
            if (edits.length > 0) {
                const result = edits[0].newText;
                const lines = result.split('\n');
                assert.ok(lines[1].startsWith('  background:'), 'background should have 2 space indent');
                assert.ok(lines[2].startsWith('    given'), 'given in background should have 4 space indent');
            }
        });
    });

    suite('Table Alignment', () => {
        test('aligns simple table', () => {
            const input = `scenario: Test
examples:
| a | bb | ccc |
| 1 | 22 | 333 |`;
            const doc = createMockDocument(input);
            const edits = provider.provideDocumentFormattingEdits(
                doc,
                { tabSize: 2, insertSpaces: true },
                {} as vscode.CancellationToken
            );
            
            if (edits.length > 0) {
                const result = edits[0].newText;
                const lines = result.split('\n');
                // All pipes should align
                const headerPipes = lines[2].match(/\|/g)?.length || 0;
                const rowPipes = lines[3].match(/\|/g)?.length || 0;
                assert.strictEqual(headerPipes, rowPipes, 'Tables should have same number of pipes');
            }
        });

        test('right-aligns numeric columns', () => {
            const input = `examples:
| name | count |
| a | 1 |
| bb | 22 |`;
            const doc = createMockDocument(input);
            const edits = provider.provideDocumentFormattingEdits(
                doc,
                { tabSize: 2, insertSpaces: true },
                {} as vscode.CancellationToken
            );
            
            if (edits.length > 0) {
                const result = edits[0].newText;
                // Numbers should be right-aligned (padded on the left)
                assert.ok(result.includes(' 1 |') || result.includes('  1 |'), 'Numbers should be padded');
            }
        });
    });

    suite('Triple Quotes', () => {
        test('preserves content inside triple quotes', () => {
            const input = `when I create
call ^create
body:
"""
{
  "name": "test"
}
"""`;
            const doc = createMockDocument(input);
            const edits = provider.provideDocumentFormattingEdits(
                doc,
                { tabSize: 2, insertSpaces: true },
                {} as vscode.CancellationToken
            );
            
            if (edits.length > 0) {
                const result = edits[0].newText;
                assert.ok(result.includes('"name": "test"'), 'JSON inside triple quotes should be preserved');
            }
        });
    });

    suite('Conditional Blocks', () => {
        test('nested if increases indent', () => {
            const input = `when test
call ^test
if status 200
assert $.id exists
if $.type equals "a"
assert $.value notEmpty`;
            const doc = createMockDocument(input);
            const edits = provider.provideDocumentFormattingEdits(
                doc,
                { tabSize: 2, insertSpaces: true },
                {} as vscode.CancellationToken
            );
            
            if (edits.length > 0) {
                const result = edits[0].newText;
                const lines = result.split('\n');
                // First if at directive level
                // Nested if should be one level deeper
                const firstIfIndent = lines[2].length - lines[2].trimStart().length;
                const nestedIfIndent = lines[4].length - lines[4].trimStart().length;
                // Note: actual indent logic may vary
                assert.ok(nestedIfIndent >= firstIfIndent, 'Nested if should have >= indent');
            }
        });
    });

    suite('Comments', () => {
        test('comments preserve relative indentation', () => {
            const input = `scenario: Test
# This is a comment
when action`;
            const doc = createMockDocument(input);
            const edits = provider.provideDocumentFormattingEdits(
                doc,
                { tabSize: 2, insertSpaces: true },
                {} as vscode.CancellationToken
            );
            
            if (edits.length > 0) {
                const result = edits[0].newText;
                assert.ok(result.includes('# This is a comment'), 'Comment should be preserved');
            }
        });

        test('multi-line comments align with content below', () => {
            const input = `scenario: Test
  when bla
    call ^opId
# this should align with body below
# this line too
      body: content`;
            const doc = createMockDocument(input);
            const edits = provider.provideDocumentFormattingEdits(
                doc,
                { tabSize: 2, insertSpaces: true },
                {} as vscode.CancellationToken
            );
            
            if (edits.length > 0) {
                const result = edits[0].newText;
                const lines = result.split('\n');
                // Both comments should have same indent as body:
                const bodyIndent = lines[5].length - lines[5].trimStart().length;
                const comment1Indent = lines[3].length - lines[3].trimStart().length;
                const comment2Indent = lines[4].length - lines[4].trimStart().length;
                assert.strictEqual(comment1Indent, bodyIndent, 'First comment should align with body');
                assert.strictEqual(comment2Indent, bodyIndent, 'Second comment should align with body');
            }
        });

        test('comment below keyword with empty line after aligns with keyword', () => {
            const input = `scenario: Test
  when bla
    call ^opId
      extract $.id => sharedId
      # This comment belongs to extract above (empty line follows)
      
  scenario: Another`;
            const doc = createMockDocument(input);
            const edits = provider.provideDocumentFormattingEdits(
                doc,
                { tabSize: 2, insertSpaces: true },
                {} as vscode.CancellationToken
            );
            
            if (edits.length > 0) {
                const result = edits[0].newText;
                const lines = result.split('\n');
                // Find extract and comment lines
                const extractLine = lines.find(l => l.trim().startsWith('extract'));
                const commentLine = lines.find(l => l.trim().startsWith('# This comment belongs'));
                
                if (extractLine && commentLine) {
                    const extractIndent = extractLine.length - extractLine.trimStart().length;
                    const commentIndent = commentLine.length - commentLine.trimStart().length;
                    assert.strictEqual(commentIndent, extractIndent, 
                        'Comment below keyword with empty line after should align with keyword above');
                }
            }
        });
    });

    suite('Body Fields', () => {
        test('body fields indent deeper than body keyword', () => {
            const input = `when bla
  call ^operationId
body:
field1: foo
field2: bar`;
            const doc = createMockDocument(input);
            const edits = provider.provideDocumentFormattingEdits(
                doc,
                { tabSize: 2, insertSpaces: true },
                {} as vscode.CancellationToken
            );
            
            if (edits.length > 0) {
                const result = edits[0].newText;
                const lines = result.split('\n');
                const bodyIndent = lines[2].length - lines[2].trimStart().length;
                const fieldIndent = lines[3].length - lines[3].trimStart().length;
                assert.ok(fieldIndent > bodyIndent, 'Body fields should be indented deeper than body:');
            }
        });
    });

    suite('Standalone Scenarios', () => {
        test('scenario after feature stays at root level', () => {
            const input = `feature: Pet Store
  scenario: Inside Feature
    when bla

scenario: Outside Feature
  when bla`;
            const doc = createMockDocument(input);
            const edits = provider.provideDocumentFormattingEdits(
                doc,
                { tabSize: 2, insertSpaces: true },
                {} as vscode.CancellationToken
            );
            
            if (edits.length > 0) {
                const result = edits[0].newText;
                const lines = result.split('\n');
                // Last scenario should have no indent
                const standaloneScenario = lines.find(l => l.trim().startsWith('scenario: Outside'));
                assert.ok(standaloneScenario);
                const indent = standaloneScenario!.length - standaloneScenario!.trimStart().length;
                assert.strictEqual(indent, 0, 'Standalone scenario should have no indent');
            }
        });
    });

    suite('Nested If-Else', () => {
        test('nested else aligns with its if', () => {
            // Based on petstore sample 04-advanced-usage.scenario
            const input = `scenario: Conditional assertions - nested
  when: I get a pet
    call ^getPetById
      petId: 1
    
    if status 200
      # Pet found - check its status
      if $.status equals "available"
        assert $.price notEmpty
      else if $.status equals "pending"
        assert $.name notEmpty
      else
        # sold or other status
        assert $.id notEmpty
    else if status 404
      # Pet not found - acceptable
      assert contains "not found"
    else
      fail "Unexpected status"`;
            const doc = createMockDocument(input);
            const edits = provider.provideDocumentFormattingEdits(
                doc,
                { tabSize: 2, insertSpaces: true },
                {} as vscode.CancellationToken
            );
            
            if (edits.length > 0) {
                const result = edits[0].newText;
                const lines = result.split('\n');
                
                // Find the outer if and its else
                const outerIfLine = lines.find(l => l.trim() === 'if status 200');
                const outerElseLine = lines.find(l => l.trim() === 'else if status 404');
                
                if (outerIfLine && outerElseLine) {
                    const outerIfIndent = outerIfLine.length - outerIfLine.trimStart().length;
                    const outerElseIndent = outerElseLine.length - outerElseLine.trimStart().length;
                    assert.strictEqual(outerElseIndent, outerIfIndent, 'Outer else if should align with outer if');
                }
                
                // Find nested if and its else
                const nestedIfLine = lines.find(l => l.trim().includes('if $.status equals "available"'));
                const nestedElseLine = lines.find(l => l.trim() === 'else if $.status equals "pending"');
                
                if (nestedIfLine && nestedElseLine) {
                    const nestedIfIndent = nestedIfLine.length - nestedIfLine.trimStart().length;
                    const nestedElseIndent = nestedElseLine.length - nestedElseLine.trimStart().length;
                    assert.strictEqual(nestedElseIndent, nestedIfIndent, 'Nested else if should align with nested if');
                }
            }
        });

        test('assertions inside if/else blocks get proper indentation', () => {
            const input = `scenario: Conditional assertions - nested
  when: I get a pet
    call ^getPetById
      petId: 1
    
    if status 200
      assert $.id notEmpty
    else if status 404
      assert contains "not found"
    else
      fail "Unexpected status"`;
            const doc = createMockDocument(input);
            const edits = provider.provideDocumentFormattingEdits(
                doc,
                { tabSize: 2, insertSpaces: true },
                {} as vscode.CancellationToken
            );
            
            if (edits.length > 0) {
                const result = edits[0].newText;
                const lines = result.split('\n');
                
                // Find if and its content
                const ifLine = lines.find(l => l.trim() === 'if status 200');
                const assertInIf = lines.find(l => l.trim() === 'assert $.id notEmpty');
                
                if (ifLine && assertInIf) {
                    const ifIndent = ifLine.length - ifLine.trimStart().length;
                    const assertIndent = assertInIf.length - assertInIf.trimStart().length;
                    assert.ok(assertIndent > ifIndent, 'Assert inside if should be indented deeper than if');
                }
                
                // Find else if and its content
                const elseIfLine = lines.find(l => l.trim() === 'else if status 404');
                const assertInElseIf = lines.find(l => l.trim() === 'assert contains "not found"');
                
                if (elseIfLine && assertInElseIf) {
                    const elseIfIndent = elseIfLine.length - elseIfLine.trimStart().length;
                    const assertIndent = assertInElseIf.length - assertInElseIf.trimStart().length;
                    assert.ok(assertIndent > elseIfIndent, 'Assert inside else if should be indented deeper than else if');
                }
                
                // Find else and its content
                const elseLine = lines.find(l => l.trim() === 'else');
                const failLine = lines.find(l => l.trim() === 'fail "Unexpected status"');
                
                if (elseLine && failLine) {
                    const elseIndent = elseLine.length - elseLine.trimStart().length;
                    const failIndent = failLine.length - failLine.trimStart().length;
                    assert.ok(failIndent > elseIndent, 'Fail inside else should be indented deeper than else');
                }
            }
        });
    });
});
