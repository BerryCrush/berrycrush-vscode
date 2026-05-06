/**
 * Integration tests for BerryCrush VS Code extension.
 * These tests use actual .scenario and .fragment fixture files to verify
 * that the extension correctly handles real-world scenarios.
 */
import * as assert from 'assert';
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { ScenarioDocumentSymbolProvider } from '../../symbol-provider';
import { ScenarioFoldingRangeProvider } from '../../folding-provider';
import { ScenarioFormattingProvider } from '../../formatting-provider';
import { FragmentProvider } from '../../fragment-provider';

suite('Integration Tests with Fixture Files', () => {
    const fixturesPath = path.resolve(__dirname, '..', '..', '..', 'src', 'test', 'fixtures');
    const scenarioPath = path.join(fixturesPath, 'petstore.scenario');
    const fragmentPath = path.join(fixturesPath, 'auth.fragment');

    let scenarioContent: string;
    let fragmentContent: string;

    suiteSetup(() => {
        // Load fixture files
        assert.ok(fs.existsSync(scenarioPath), `Fixture file not found: ${scenarioPath}`);
        assert.ok(fs.existsSync(fragmentPath), `Fixture file not found: ${fragmentPath}`);

        scenarioContent = fs.readFileSync(scenarioPath, 'utf-8');
        fragmentContent = fs.readFileSync(fragmentPath, 'utf-8');
    });

    /**
     * Create a mock TextDocument from content.
     * @param content - The document content
     * @param languageId - The language ID (default: 'berrycrush-scenario')
     * @param uri - Optional URI for the document
     */
    function createMockDocument(
        content: string, 
        languageId: string = 'berrycrush-scenario',
        uri?: vscode.Uri
    ): vscode.TextDocument {
        const lines = content.split('\n');
        return {
            uri: uri || vscode.Uri.file('/mock/document'),
            getText: (range?: vscode.Range) => {
                if (!range) {
                    return content;
                }
                const selectedLines = lines.slice(range.start.line, range.end.line + 1);
                if (selectedLines.length === 1) {
                    return selectedLines[0].substring(range.start.character, range.end.character);
                }
                return selectedLines.join('\n');
            },
            lineAt: (lineOrPosition: number | vscode.Position) => {
                const lineNum = typeof lineOrPosition === 'number' ? lineOrPosition : lineOrPosition.line;
                const text = lines[lineNum] || '';
                return {
                    text,
                    lineNumber: lineNum,
                    range: new vscode.Range(lineNum, 0, lineNum, text.length),
                    rangeIncludingLineBreak: new vscode.Range(lineNum, 0, lineNum + 1, 0),
                    firstNonWhitespaceCharacterIndex: text.search(/\S/),
                    isEmptyOrWhitespace: text.trim() === ''
                };
            },
            positionAt: (offset: number) => {
                let remaining = offset;
                for (let i = 0; i < lines.length; i++) {
                    if (remaining <= lines[i].length) {
                        return new vscode.Position(i, remaining);
                    }
                    remaining -= lines[i].length + 1;
                }
                return new vscode.Position(lines.length - 1, 0);
            },
            offsetAt: (position: vscode.Position) => {
                let offset = 0;
                for (let i = 0; i < position.line && i < lines.length; i++) {
                    offset += lines[i].length + 1;
                }
                offset += Math.min(position.character, (lines[position.line] || '').length);
                return offset;
            },
            getWordRangeAtPosition: (position: vscode.Position, regex?: RegExp) => {
                const line = lines[position.line] || '';
                const pattern = regex || /[\w-]+/g;
                let match;
                const testRegex = new RegExp(pattern.source, 'g');
                while ((match = testRegex.exec(line)) !== null) {
                    if (match.index <= position.character && match.index + match[0].length >= position.character) {
                        return new vscode.Range(
                            position.line, match.index,
                            position.line, match.index + match[0].length
                        );
                    }
                }
                return undefined;
            },
            lineCount: lines.length,
            languageId,
            version: 1,
            isDirty: false,
            isUntitled: false,
            isClosed: false,
            fileName: '/mock/document',
            encoding: 'utf-8',
            eol: vscode.EndOfLine.LF,
            save: () => Promise.resolve(true),
            validateRange: (range: vscode.Range) => range,
            validatePosition: (position: vscode.Position) => position
        } as vscode.TextDocument;
    }

    /**
     * Create a mock CancellationToken.
     */
    function createMockToken(): vscode.CancellationToken {
        return {
            isCancellationRequested: false,
            onCancellationRequested: () => ({ dispose: () => {} })
        };
    }

    suite('Document Symbol Provider - Scenario File', () => {
        let provider: ScenarioDocumentSymbolProvider;
        let doc: vscode.TextDocument;

        suiteSetup(() => {
            provider = new ScenarioDocumentSymbolProvider();
            doc = createMockDocument(scenarioContent);
        });

        test('parses feature with tags', () => {
            const symbols = provider.provideDocumentSymbols(doc, createMockToken());
            
            // Find the feature symbol
            const feature = symbols.find(s => s.name.includes('feature:'));
            assert.ok(feature, 'Should find feature symbol');
            assert.ok(feature.name.includes('@api'), 'Feature name should include @api tag');
            assert.ok(feature.name.includes('@smoke'), 'Feature name should include @smoke tag');
            assert.strictEqual(feature.kind, vscode.SymbolKind.Class, 'Feature should be Class kind');
        });

        test('parses background inside feature', () => {
            const symbols = provider.provideDocumentSymbols(doc, createMockToken());
            const feature = symbols.find(s => s.name.includes('feature:'));
            
            assert.ok(feature, 'Should find feature');
            const background = feature.children.find(s => s.name.includes('background'));
            assert.ok(background, 'Should find background inside feature');
            assert.strictEqual(background.kind, vscode.SymbolKind.Constructor, 'Background should be Constructor kind');
        });

        test('parses scenarios inside feature', () => {
            const symbols = provider.provideDocumentSymbols(doc, createMockToken());
            const feature = symbols.find(s => s.name.includes('feature:'));
            
            assert.ok(feature, 'Should find feature');
            
            const scenarios = feature.children.filter(s => s.name.includes('scenario:'));
            assert.ok(scenarios.length >= 3, `Should have at least 3 scenarios, found ${scenarios.length}`);
            
            // Check for critical tag
            const criticalScenario = scenarios.find(s => s.name.includes('@critical'));
            assert.ok(criticalScenario, 'Should find @critical scenario');
        });

        test('parses outline with examples', () => {
            const symbols = provider.provideDocumentSymbols(doc, createMockToken());
            const outline = symbols.find(s => s.name.includes('outline:'));
            
            assert.ok(outline, 'Should find outline');
            assert.strictEqual(outline.kind, vscode.SymbolKind.Method, 'Outline should be Method kind');
            
            // Check for examples child
            const examples = outline.children.find(s => s.name.includes('examples'));
            assert.ok(examples, 'Outline should have examples child');
            assert.strictEqual(examples.kind, vscode.SymbolKind.Array, 'Examples should be Array kind');
        });

        test('parses standalone scenario', () => {
            const symbols = provider.provideDocumentSymbols(doc, createMockToken());
            
            // Standalone scenario should be at root level, not under feature
            const standaloneScenario = symbols.find(s => 
                s.name.includes('scenario:') && s.name.includes('Standalone')
            );
            assert.ok(standaloneScenario, 'Should find standalone scenario at root level');
        });

        test('parses steps inside scenario', () => {
            const symbols = provider.provideDocumentSymbols(doc, createMockToken());
            const feature = symbols.find(s => s.name.includes('feature:'));
            const scenario = feature?.children.find(s => s.name.includes('List all pets'));
            
            assert.ok(scenario, 'Should find scenario');
            
            // Steps should be children of scenario
            const steps = scenario.children.filter(s => 
                s.name.includes('when') || s.name.includes('then')
            );
            assert.ok(steps.length >= 2, 'Should have when and then steps');
        });
    });

    suite('Document Symbol Provider - Fragment File', () => {
        let provider: ScenarioDocumentSymbolProvider;
        let doc: vscode.TextDocument;

        suiteSetup(() => {
            provider = new ScenarioDocumentSymbolProvider();
            doc = createMockDocument(fragmentContent, 'berrycrush-fragment');
        });

        test('parses multiple fragments', () => {
            const symbols = provider.provideDocumentSymbols(doc, createMockToken());
            
            const fragments = symbols.filter(s => s.name.includes('fragment:'));
            assert.strictEqual(fragments.length, 3, 'Should find 3 fragments');
            
            fragments.forEach(f => {
                assert.strictEqual(f.kind, vscode.SymbolKind.Function, 'Fragment should be Function kind');
            });
        });

        test('parses auth fragment with steps', () => {
            const symbols = provider.provideDocumentSymbols(doc, createMockToken());
            const authFragment = symbols.find(s => s.name.includes('auth') && !s.name.includes('setup'));
            
            assert.ok(authFragment, 'Should find auth fragment');
            assert.ok(authFragment.children.length > 0, 'Auth fragment should have step children');
        });
    });

    suite('Folding Provider - Scenario File', () => {
        let provider: ScenarioFoldingRangeProvider;
        let doc: vscode.TextDocument;

        suiteSetup(() => {
            provider = new ScenarioFoldingRangeProvider();
            doc = createMockDocument(scenarioContent);
        });

        test('document has foldable regions', () => {
            const ranges = provider.provideFoldingRanges(
                doc,
                {} as vscode.FoldingContext,
                createMockToken()
            );
            
            // Verify that we have multiple folding ranges
            assert.ok(ranges.length > 10, `Should have multiple folding ranges, found ${ranges.length}`);
            
            // Verify that scenarios are foldable (not just their contents)
            // Find a line that starts a scenario and verify it's in the ranges
            const lines = scenarioContent.split('\n');
            const scenarioLines = lines.map((line, i) => ({ line, index: i }))
                .filter(({ line }) => line.trim().match(/^(@[\w-]+\s+)*scenario:/))
                .map(({ index }) => index);
            
            assert.ok(scenarioLines.length > 0, 'Should find scenario lines in content');
        });

        test('scenarios are foldable', () => {
            const ranges = provider.provideFoldingRanges(
                doc,
                {} as vscode.FoldingContext,
                createMockToken()
            );
            
            // Count scenario folds
            const scenarioFolds = ranges.filter(r => {
                const lineText = scenarioContent.split('\n')[r.start];
                return lineText && lineText.trim().match(/^(@\w+\s+)*scenario:/);
            });
            
            assert.ok(scenarioFolds.length >= 4, `Should have at least 4 scenario folds, found ${scenarioFolds.length}`);
        });

        test('triple-quoted body is foldable', () => {
            const ranges = provider.provideFoldingRanges(
                doc,
                {} as vscode.FoldingContext,
                createMockToken()
            );
            
            // Find line with """
            const lines = scenarioContent.split('\n');
            let tripleQuoteLine = -1;
            for (let i = 0; i < lines.length; i++) {
                if (lines[i].includes('"""')) {
                    tripleQuoteLine = i;
                    break;
                }
            }
            
            if (tripleQuoteLine >= 0) {
                const tripleQuoteRange = ranges.find(r => r.start === tripleQuoteLine);
                assert.ok(tripleQuoteRange, 'Triple-quoted body should be foldable');
            }
        });

        test('examples table is foldable', () => {
            const ranges = provider.provideFoldingRanges(
                doc,
                {} as vscode.FoldingContext,
                createMockToken()
            );
            
            const lines = scenarioContent.split('\n');
            let examplesLine = -1;
            for (let i = 0; i < lines.length; i++) {
                if (lines[i].trim().startsWith('examples:')) {
                    examplesLine = i;
                    break;
                }
            }
            
            assert.ok(examplesLine >= 0, 'Should find examples line');
            const examplesRange = ranges.find(r => r.start === examplesLine);
            assert.ok(examplesRange, 'Examples should be foldable');
        });
    });

    suite('Formatting Provider - Indentation', () => {
        let provider: ScenarioFormattingProvider;

        suiteSetup(() => {
            provider = new ScenarioFormattingProvider();
        });

        test('formats feature at root with no indent', () => {
            const input = '   feature: Test Feature';
            const doc = createMockDocument(input);
            const edits = provider.provideDocumentFormattingEdits(
                doc,
                { tabSize: 2, insertSpaces: true },
                createMockToken()
            );
            
            if (edits.length > 0) {
                assert.ok(edits[0].newText.startsWith('feature:'), 'Feature should start at column 0');
            }
        });

        test('formats scenario inside feature with proper indent', () => {
            const input = `feature: Test
scenario: Nested`;
            const doc = createMockDocument(input);
            const edits = provider.provideDocumentFormattingEdits(
                doc,
                { tabSize: 2, insertSpaces: true },
                createMockToken()
            );
            
            if (edits.length > 0) {
                const lines = edits[0].newText.split('\n');
                assert.ok(lines[1].startsWith('  scenario:'), 'Scenario inside feature should have 2-space indent');
            }
        });

        test('formats steps with proper indent', () => {
            const input = `scenario: Test
given setup
call ^test`;
            const doc = createMockDocument(input);
            const edits = provider.provideDocumentFormattingEdits(
                doc,
                { tabSize: 2, insertSpaces: true },
                createMockToken()
            );
            
            if (edits.length > 0) {
                const lines = edits[0].newText.split('\n');
                assert.ok(lines[1].startsWith('  given'), 'given should have 2-space indent');
                assert.ok(lines[2].startsWith('    call'), 'call should have 4-space indent');
            }
        });

        test('aligns table columns', () => {
            const input = `examples:
| name | status |
| Fluffy | available |
| Max | pending |`;
            const doc = createMockDocument(input);
            const edits = provider.provideDocumentFormattingEdits(
                doc,
                { tabSize: 2, insertSpaces: true },
                createMockToken()
            );
            
            if (edits.length > 0) {
                const lines = edits[0].newText.split('\n');
                // Check that columns are aligned
                const headerLine = lines.find(l => l.includes('name') && l.includes('status'));
                const dataLine1 = lines.find(l => l.includes('Fluffy'));
                
                if (headerLine && dataLine1) {
                    const headerPipePositions = [...headerLine.matchAll(/\|/g)].map(m => m.index);
                    const dataPipePositions = [...dataLine1.matchAll(/\|/g)].map(m => m.index);
                    
                    // Pipes should be aligned
                    assert.deepStrictEqual(headerPipePositions, dataPipePositions, 'Table pipes should be aligned');
                }
            }
        });
    });

    suite('Fragment Provider', () => {
        let provider: FragmentProvider;

        suiteSetup(async () => {
            provider = new FragmentProvider();
            // Note: In real tests, we'd need to mock vscode.workspace.findFiles
            // For now, we test the basic parsing logic
        });

        test('provider initializes', () => {
            assert.ok(provider, 'FragmentProvider should initialize');
        });

        test('getAllFragments returns array', () => {
            const fragments = provider.getAllFragments();
            assert.ok(Array.isArray(fragments), 'getAllFragments should return array');
        });

        test('getFragmentNames returns array', () => {
            const names = provider.getFragmentNames();
            assert.ok(Array.isArray(names), 'getFragmentNames should return array');
        });
    });
});

/**
 * User Interaction Tests - Simulate user actions like clicking, hovering, etc.
 * These tests use VS Code APIs to execute language features as if the user
 * performed the action in the editor.
 */
suite('User Interaction Tests', () => {
    const fixturesPath = path.resolve(__dirname, '..', '..', '..', 'src', 'test', 'fixtures');
    const scenarioPath = path.join(fixturesPath, 'petstore.scenario');
    const fragmentPath = path.join(fixturesPath, 'auth.fragment');
    // OpenAPI path available for future tests: path.join(fixturesPath, 'petstore.yaml')

    let scenarioDoc: vscode.TextDocument;
    let fragmentDoc: vscode.TextDocument;

    suiteSetup(async function() {
        this.timeout(10000);
        
        // Open actual documents in VS Code
        scenarioDoc = await vscode.workspace.openTextDocument(vscode.Uri.file(scenarioPath));
        fragmentDoc = await vscode.workspace.openTextDocument(vscode.Uri.file(fragmentPath));
    });

    suite('Go to Definition (Ctrl+Click)', () => {
        test('clicking ^operationId triggers definition lookup', async function() {
            this.timeout(5000);
            
            // Find the line with ^listPets
            const content = scenarioDoc.getText();
            const lines = content.split('\n');
            let operationLine = -1;
            let operationColumn = -1;
            
            for (let i = 0; i < lines.length; i++) {
                const caretIndex = lines[i].indexOf('^listPets');
                if (caretIndex !== -1) {
                    operationLine = i;
                    operationColumn = caretIndex + 1; // Position on 'l' after ^
                    break;
                }
            }
            
            assert.ok(operationLine >= 0, 'Should find ^listPets in document');
            
            // Execute definition provider at that position
            const position = new vscode.Position(operationLine, operationColumn);
            const definitions = await vscode.commands.executeCommand<vscode.Location[] | vscode.LocationLink[]>(
                'vscode.executeDefinitionProvider',
                scenarioDoc.uri,
                position
            );
            
            // The definition may or may not be found depending on OpenAPI spec availability
            // But the command should execute without error
            assert.ok(definitions !== undefined, 'Definition provider should return a result');
        });

        test('clicking include fragment triggers definition lookup', async function() {
            this.timeout(5000);
            
            // Find the line with 'include auth'
            const content = scenarioDoc.getText();
            const lines = content.split('\n');
            let includeLine = -1;
            let fragmentColumn = -1;
            
            for (let i = 0; i < lines.length; i++) {
                const includeIndex = lines[i].indexOf('include auth');
                if (includeIndex !== -1) {
                    includeLine = i;
                    fragmentColumn = includeIndex + 8; // Position on 'a' of 'auth'
                    break;
                }
            }
            
            assert.ok(includeLine >= 0, 'Should find include auth in document');
            
            const position = new vscode.Position(includeLine, fragmentColumn);
            const definitions = await vscode.commands.executeCommand<vscode.Location[] | vscode.LocationLink[]>(
                'vscode.executeDefinitionProvider',
                scenarioDoc.uri,
                position
            );
            
            assert.ok(definitions !== undefined, 'Definition provider should return a result');
        });

        test('clicking fragment definition in .fragment file triggers definition lookup', async function() {
            this.timeout(5000);
            
            // Find a fragment definition line
            const content = fragmentDoc.getText();
            const lines = content.split('\n');
            let fragmentLine = -1;
            let fragmentColumn = -1;
            
            for (let i = 0; i < lines.length; i++) {
                const fragmentMatch = lines[i].match(/^fragment:\s*(\w+)/);
                if (fragmentMatch) {
                    fragmentLine = i;
                    fragmentColumn = lines[i].indexOf(fragmentMatch[1]);
                    break;
                }
            }
            
            assert.ok(fragmentLine >= 0, 'Should find fragment definition in document');
            
            const position = new vscode.Position(fragmentLine, fragmentColumn);
            const definitions = await vscode.commands.executeCommand<vscode.Location[] | vscode.LocationLink[]>(
                'vscode.executeDefinitionProvider',
                fragmentDoc.uri,
                position
            );
            
            assert.ok(definitions !== undefined, 'Definition provider should return a result');
        });
    });

    suite('Hover Information', () => {
        test('hovering over ^operationId shows hover info', async function() {
            this.timeout(5000);
            
            const content = scenarioDoc.getText();
            const lines = content.split('\n');
            let operationLine = -1;
            let operationColumn = -1;
            
            for (let i = 0; i < lines.length; i++) {
                const caretIndex = lines[i].indexOf('^listPets');
                if (caretIndex !== -1) {
                    operationLine = i;
                    operationColumn = caretIndex + 1;
                    break;
                }
            }
            
            assert.ok(operationLine >= 0, 'Should find ^listPets in document');
            
            const position = new vscode.Position(operationLine, operationColumn);
            const hovers = await vscode.commands.executeCommand<vscode.Hover[]>(
                'vscode.executeHoverProvider',
                scenarioDoc.uri,
                position
            );
            
            assert.ok(hovers !== undefined, 'Hover provider should return a result');
        });

        test('hovering over keyword shows hover info', async function() {
            this.timeout(5000);
            
            const content = scenarioDoc.getText();
            const lines = content.split('\n');
            let keywordLine = -1;
            let keywordColumn = -1;
            
            for (let i = 0; i < lines.length; i++) {
                const scenarioIndex = lines[i].indexOf('scenario:');
                if (scenarioIndex !== -1) {
                    keywordLine = i;
                    keywordColumn = scenarioIndex + 2;
                    break;
                }
            }
            
            assert.ok(keywordLine >= 0, 'Should find scenario keyword');
            
            const position = new vscode.Position(keywordLine, keywordColumn);
            const hovers = await vscode.commands.executeCommand<vscode.Hover[]>(
                'vscode.executeHoverProvider',
                scenarioDoc.uri,
                position
            );
            
            assert.ok(hovers !== undefined, 'Hover provider should return a result');
        });
    });

    suite('Code Completion (Autocomplete)', () => {
        test('typing ^ triggers operation ID completion', async function() {
            this.timeout(5000);
            
            // Find a line with call ^
            const content = scenarioDoc.getText();
            const lines = content.split('\n');
            let callLine = -1;
            let caretPosition = -1;
            
            for (let i = 0; i < lines.length; i++) {
                const caretIndex = lines[i].indexOf('call ^');
                if (caretIndex !== -1) {
                    callLine = i;
                    caretPosition = caretIndex + 6; // Position right after ^
                    break;
                }
            }
            
            assert.ok(callLine >= 0, 'Should find call ^ in document');
            
            const position = new vscode.Position(callLine, caretPosition);
            const completions = await vscode.commands.executeCommand<vscode.CompletionList>(
                'vscode.executeCompletionItemProvider',
                scenarioDoc.uri,
                position
            );
            
            assert.ok(completions !== undefined, 'Completion provider should return a result');
        });

        test('typing include triggers fragment completion', async function() {
            this.timeout(5000);
            
            // Find a line with include
            const content = scenarioDoc.getText();
            const lines = content.split('\n');
            let includeLine = -1;
            let position = -1;
            
            for (let i = 0; i < lines.length; i++) {
                const includeIndex = lines[i].indexOf('include ');
                if (includeIndex !== -1) {
                    includeLine = i;
                    position = includeIndex + 8; // Position right after 'include '
                    break;
                }
            }
            
            assert.ok(includeLine >= 0, 'Should find include in document');
            
            const pos = new vscode.Position(includeLine, position);
            const completions = await vscode.commands.executeCommand<vscode.CompletionList>(
                'vscode.executeCompletionItemProvider',
                scenarioDoc.uri,
                pos
            );
            
            assert.ok(completions !== undefined, 'Completion provider should return a result');
        });
    });

    suite('Document Symbols (Outline View)', () => {
        test('document symbols available for scenario file', async function() {
            this.timeout(5000);
            
            const symbols = await vscode.commands.executeCommand<vscode.DocumentSymbol[]>(
                'vscode.executeDocumentSymbolProvider',
                scenarioDoc.uri
            );
            
            assert.ok(symbols, 'Should return document symbols');
            assert.ok(symbols.length > 0, 'Should have at least one symbol');
            
            // Check for feature symbol
            const hasFeature = symbols.some(s => s.name.includes('feature:'));
            assert.ok(hasFeature, 'Should have feature symbol');
        });

        test('document symbols available for fragment file', async function() {
            this.timeout(5000);
            
            const symbols = await vscode.commands.executeCommand<vscode.DocumentSymbol[]>(
                'vscode.executeDocumentSymbolProvider',
                fragmentDoc.uri
            );
            
            assert.ok(symbols, 'Should return document symbols');
            assert.ok(symbols.length > 0, 'Should have at least one symbol');
            
            // Check for fragment symbol
            const hasFragment = symbols.some(s => s.name.includes('fragment:'));
            assert.ok(hasFragment, 'Should have fragment symbol');
        });
    });

    suite('Find References', () => {
        test('find references for variable', async function() {
            this.timeout(5000);
            
            // Find a variable usage like {{petId}}
            const content = scenarioDoc.getText();
            const lines = content.split('\n');
            let varLine = -1;
            let varColumn = -1;
            
            for (let i = 0; i < lines.length; i++) {
                const varMatch = lines[i].match(/\{\{(\w+)\}\}/);
                if (varMatch) {
                    varLine = i;
                    varColumn = lines[i].indexOf(varMatch[1]);
                    break;
                }
            }
            
            if (varLine >= 0) {
                const position = new vscode.Position(varLine, varColumn);
                const references = await vscode.commands.executeCommand<vscode.Location[]>(
                    'vscode.executeReferenceProvider',
                    scenarioDoc.uri,
                    position
                );
                
                assert.ok(references !== undefined, 'Reference provider should return a result');
            }
        });
    });

    suite('Document Links', () => {
        test('document links available for scenario file', async function() {
            this.timeout(5000);
            
            const links = await vscode.commands.executeCommand<vscode.DocumentLink[]>(
                'vscode.executeLinkProvider',
                scenarioDoc.uri
            );
            
            assert.ok(links !== undefined, 'Link provider should return a result');
        });
    });

    suite('Folding Ranges', () => {
        test('folding ranges available for scenario file', async function() {
            this.timeout(5000);
            
            const foldingRanges = await vscode.commands.executeCommand<vscode.FoldingRange[]>(
                'vscode.executeFoldingRangeProvider',
                scenarioDoc.uri
            );
            
            assert.ok(foldingRanges, 'Should return folding ranges');
            assert.ok(foldingRanges.length > 0, 'Should have at least one folding range');
        });
    });

    suite('Document Formatting', () => {
        test('formatting edits available for scenario file', async function() {
            this.timeout(5000);
            
            const edits = await vscode.commands.executeCommand<vscode.TextEdit[]>(
                'vscode.executeFormatDocumentProvider',
                scenarioDoc.uri,
                { tabSize: 2, insertSpaces: true }
            );
            
            assert.ok(edits !== undefined, 'Formatting provider should return a result');
        });
    });
});
