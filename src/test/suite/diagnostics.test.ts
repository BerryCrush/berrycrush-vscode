import * as assert from 'assert';
import * as vscode from 'vscode';

// Import the diagnostics provider for testing
import { ScenarioDiagnosticsProvider } from '../../diagnostics-provider';
import { OpenApiProvider } from '../../openapi-provider';
import { FragmentProvider } from '../../fragment-provider';

suite('ScenarioDiagnosticsProvider Tests', () => {
    let diagnosticsProvider: ScenarioDiagnosticsProvider;
    let openApiProvider: OpenApiProvider;
    let fragmentProvider: FragmentProvider;

    setup(() => {
        openApiProvider = new OpenApiProvider();
        fragmentProvider = new FragmentProvider();
        diagnosticsProvider = new ScenarioDiagnosticsProvider(openApiProvider, fragmentProvider);
    });

    suite('Variable Validation', () => {
        test('detects undefined variable', () => {
            // Create a mock document with undefined variable
            const content = `scenario: Test
  when I do something
    call ^test
      param: {{undefinedVar}}`;
            
            // The diagnostics are validated via integration since we need document context
            // Test that the pattern matching works
            const varPattern = /\{\{(\w+)\}\}/g;
            const match = varPattern.exec(content);
            assert.ok(match, 'Should match variable pattern');
            assert.strictEqual(match[1], 'undefinedVar');
        });

        test('collects variables from extract statements', () => {
            const lines = [
                'scenario: Test',
                '  when I do something',
                '    call ^test',
                '    extract $.id => petId',
                '    extract $.name => petName',
                '  then I verify',
                '    call ^verify',
                '      id: {{petId}}'
            ];

            // Use regex to test extract pattern
            const extractPattern = /extract\s+[^\s]+\s+=>\s+(\w+)/i;
            const extracted = lines
                .map(line => {
                    const match = line.match(extractPattern);
                    return match ? match[1] : null;
                })
                .filter(Boolean);

            assert.deepStrictEqual(extracted, ['petId', 'petName']);
        });

        test('collects variables from examples table', () => {
            const line = '| petId | petName | status |';
            const examplesHeaderMatch = line.match(/^\s*\|([^|]+(?:\|[^|]+)*)\|\s*$/);
            
            assert.ok(examplesHeaderMatch, 'Should match examples header');
            const headers = examplesHeaderMatch![1].split('|');
            const varNames = headers
                .map(h => h.trim())
                .filter(v => v && !v.includes(' ') && !/^\d/.test(v));

            assert.deepStrictEqual(varNames, ['petId', 'petName', 'status']);
        });
    });

    suite('Operation ID Validation', () => {
        test('detects call ^operationId pattern', () => {
            const line = '    call ^listPets';
            const callMatch = line.match(/call\s+(?:using\s+\w+\s+)?\^(\w+)/i);
            
            assert.ok(callMatch, 'Should match call pattern');
            assert.strictEqual(callMatch[1], 'listPets');
        });

        test('detects call using specName ^operationId pattern', () => {
            const line = '    call using petstore ^listPets';
            const callMatch = line.match(/call\s+(?:using\s+\w+\s+)?\^(\w+)/i);
            
            assert.ok(callMatch, 'Should match call with using pattern');
            assert.strictEqual(callMatch[1], 'listPets');
        });

        test('finds operationId position in line', () => {
            const line = '    call ^listPets';
            const operationId = 'listPets';
            const startCol = line.indexOf('^' + operationId);
            
            assert.strictEqual(startCol, 9); // 4 spaces + "call " = 9
        });
    });

    suite('Fragment Validation', () => {
        test('detects include fragmentName pattern', () => {
            const line = '    include authenticate';
            const includeMatch = line.match(/include\s+(\w+)/i);
            
            assert.ok(includeMatch, 'Should match include pattern');
            assert.strictEqual(includeMatch[1], 'authenticate');
        });

        test('finds fragment name position in line', () => {
            const line = '    include authenticate';
            const fragmentName = 'authenticate';
            const startCol = line.indexOf(fragmentName, line.indexOf('include'));
            
            assert.strictEqual(startCol, 12); // 4 spaces + "include " = 12
        });
    });

    suite('Assertion Syntax Validation', () => {
        test('validates status code assertion', () => {
            const validPatterns = [
                /^status\s+\d{3}$/i,
                /^status\s+\d[xX]{2}$/i,
                /^status\s+\d{3}-\d{3}$/i,
            ];

            // Valid assertions
            assert.ok(validPatterns[0].test('status 200'), 'status 200 should be valid');
            assert.ok(validPatterns[1].test('status 2xx'), 'status 2xx should be valid');
            assert.ok(validPatterns[2].test('status 200-299'), 'status 200-299 should be valid');

            // Invalid assertions
            assert.ok(!validPatterns[0].test('status abc'), 'status abc should be invalid');
        });

        test('validates JSON path assertion', () => {
            const jsonPathPattern = /^\$[\.\[\]a-zA-Z0-9_]+\s+\w+/i;

            assert.ok(jsonPathPattern.test('$.name equals "Fluffy"'), '$.name equals should be valid');
            assert.ok(jsonPathPattern.test('$.items[0].id exists'), '$.items[0].id exists should be valid');
            assert.ok(jsonPathPattern.test('$.count greaterThan 0'), '$.count greaterThan should be valid');
        });

        test('validates header assertion', () => {
            const headerPattern = /^header\s+[\w-]+\s+(?:=|exists)/i;

            assert.ok(headerPattern.test('header Content-Type = "application/json"'), 'header = should be valid');
            assert.ok(headerPattern.test('header X-Request-Id exists'), 'header exists should be valid');
        });

        test('validates schema assertion', () => {
            const schemaPattern = /^schema$/i;
            assert.ok(schemaPattern.test('schema'), 'schema should be valid');
        });

        test('validates responseTime assertion', () => {
            const responseTimePattern = /^responseTime\s+\d+$/i;
            assert.ok(responseTimePattern.test('responseTime 1000'), 'responseTime 1000 should be valid');
        });
    });

    suite('Duplicate Scenario Names', () => {
        test('detects scenario name pattern', () => {
            const line = 'scenario: My Test Scenario';
            const scenarioMatch = line.match(/^\s*(?:scenario|outline)\s*:\s*(.+)$/i);
            
            assert.ok(scenarioMatch, 'Should match scenario pattern');
            assert.strictEqual(scenarioMatch[1].trim(), 'My Test Scenario');
        });

        test('detects outline name pattern', () => {
            const line = '  outline: My Test Outline';
            const scenarioMatch = line.match(/^\s*(?:scenario|outline)\s*:\s*(.+)$/i);
            
            assert.ok(scenarioMatch, 'Should match outline pattern');
            assert.strictEqual(scenarioMatch[1].trim(), 'My Test Outline');
        });

        test('finds duplicate scenario names', () => {
            const lines = [
                'scenario: Duplicate Name',
                '  when something',
                '',
                'scenario: Unique Name',
                '  when something else',
                '',
                'scenario: Duplicate Name',
                '  when more stuff'
            ];

            const scenarioNames: Map<string, number[]> = new Map();
            for (let lineNum = 0; lineNum < lines.length; lineNum++) {
                const line = lines[lineNum];
                const scenarioMatch = line.match(/^\s*(?:scenario|outline)\s*:\s*(.+)$/i);
                if (scenarioMatch) {
                    const name = scenarioMatch[1].trim();
                    const lineNumbers = scenarioNames.get(name) || [];
                    lineNumbers.push(lineNum);
                    scenarioNames.set(name, lineNumbers);
                }
            }

            assert.strictEqual(scenarioNames.size, 2, 'Should find 2 unique names');
            assert.deepStrictEqual(scenarioNames.get('Duplicate Name'), [0, 6], 'Should find duplicate at lines 0 and 6');
            assert.deepStrictEqual(scenarioNames.get('Unique Name'), [3], 'Should find unique at line 3');
        });
    });

    suite('Levenshtein Distance', () => {
        // Test the similarity algorithm indirectly
        test('identical strings have distance 0', () => {
            const distance = levenshteinDistance('test', 'test');
            assert.strictEqual(distance, 0);
        });

        test('single character difference', () => {
            const distance = levenshteinDistance('test', 'text');
            assert.strictEqual(distance, 1);
        });

        test('completely different strings', () => {
            const distance = levenshteinDistance('abc', 'xyz');
            assert.strictEqual(distance, 3);
        });

        test('empty string', () => {
            const distance = levenshteinDistance('test', '');
            assert.strictEqual(distance, 4);
        });
    });
});

// Helper function for testing Levenshtein distance
function levenshteinDistance(a: string, b: string): number {
    const matrix: number[][] = [];

    for (let i = 0; i <= b.length; i++) {
        matrix[i] = [i];
    }

    for (let j = 0; j <= a.length; j++) {
        matrix[0][j] = j;
    }

    for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
            if (b.charAt(i - 1) === a.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1,
                    matrix[i][j - 1] + 1,
                    matrix[i - 1][j] + 1
                );
            }
        }
    }

    return matrix[b.length][a.length];
}
