import * as vscode from 'vscode';
import { OpenApiProvider } from './openapi-provider';
import { FragmentProvider } from './fragment-provider';

export interface DiagnosticRule {
    validate(document: vscode.TextDocument): vscode.Diagnostic[];
}

/**
 * Provides real-time diagnostics for BerryCrush files
 */
export class ScenarioDiagnosticsProvider {
    private diagnosticCollection: vscode.DiagnosticCollection;
    private debounceTimer: NodeJS.Timeout | undefined;
    private readonly debounceDelay = 300; // ms

    constructor(
        private openApiProvider: OpenApiProvider,
        private fragmentProvider: FragmentProvider
    ) {
        this.diagnosticCollection = vscode.languages.createDiagnosticCollection('berrycrush');
    }

    /**
     * Register document change listeners
     */
    public register(context: vscode.ExtensionContext): void {
        // Validate on document change
        context.subscriptions.push(
            vscode.workspace.onDidChangeTextDocument(event => {
                if (this.isBerryCrushDocument(event.document)) {
                    this.scheduleValidation(event.document);
                }
            })
        );

        // Validate on document open
        context.subscriptions.push(
            vscode.workspace.onDidOpenTextDocument(document => {
                if (this.isBerryCrushDocument(document)) {
                    this.validateDocument(document);
                }
            })
        );

        // Clear diagnostics on document close
        context.subscriptions.push(
            vscode.workspace.onDidCloseTextDocument(document => {
                this.diagnosticCollection.delete(document.uri);
            })
        );

        // Register the diagnostic collection for disposal
        context.subscriptions.push(this.diagnosticCollection);

        // Validate all open documents
        vscode.workspace.textDocuments.forEach(document => {
            if (this.isBerryCrushDocument(document)) {
                this.validateDocument(document);
            }
        });
    }

    private isBerryCrushDocument(document: vscode.TextDocument): boolean {
        return document.languageId === 'berrycrush-scenario' || 
               document.languageId === 'berrycrush-fragment';
    }

    /**
     * Schedule validation with debounce
     */
    private scheduleValidation(document: vscode.TextDocument): void {
        if (this.debounceTimer) {
            clearTimeout(this.debounceTimer);
        }
        this.debounceTimer = setTimeout(() => {
            this.validateDocument(document);
        }, this.debounceDelay);
    }

    /**
     * Validate a document and update diagnostics
     */
    public validateDocument(document: vscode.TextDocument): void {
        const diagnostics: vscode.Diagnostic[] = [];
        const text = document.getText();
        const lines = text.split('\n');

        // Collect defined variables in this document
        const definedVariables = this.collectDefinedVariables(lines);

        // Run all validation rules
        for (let lineNum = 0; lineNum < lines.length; lineNum++) {
            const line = lines[lineNum];

            // Validate operation IDs
            diagnostics.push(...this.validateOperationId(line, lineNum));

            // Validate fragment references
            diagnostics.push(...this.validateFragmentReference(line, lineNum));

            // Validate variable references
            diagnostics.push(...this.validateVariableReferences(line, lineNum, definedVariables));

            // Validate assertion syntax
            diagnostics.push(...this.validateAssertionSyntax(line, lineNum));
        }

        // Check for duplicate scenario names
        diagnostics.push(...this.validateDuplicateScenarioNames(lines));

        this.diagnosticCollection.set(document.uri, diagnostics);
    }

    /**
     * Collect all defined variables in the document
     */
    private collectDefinedVariables(lines: string[]): Set<string> {
        const variables = new Set<string>();

        for (const line of lines) {
            // Extract from "extract ... => variableName"
            const extractMatch = line.match(/extract\s+[^\s]+\s+=>\s+(\w+)/i);
            if (extractMatch) {
                variables.add(extractMatch[1]);
            }

            // Variables from examples table header
            // Examples:
            //   | var1 | var2 |
            const examplesHeaderMatch = line.match(/^\s*\|([^|]+(?:\|[^|]+)*)\|\s*$/);
            if (examplesHeaderMatch) {
                const headers = examplesHeaderMatch[1].split('|');
                for (const header of headers) {
                    const varName = header.trim();
                    if (varName && !varName.includes(' ') && !/^\d/.test(varName)) {
                        variables.add(varName);
                    }
                }
            }
        }

        return variables;
    }

    /**
     * Validate operation ID references (call ^operationId)
     */
    private validateOperationId(
        line: string,
        lineNum: number
    ): vscode.Diagnostic[] {
        const diagnostics: vscode.Diagnostic[] = [];

        // Match "call ^operationId" or "call using specName ^operationId"
        const callMatch = line.match(/call\s+(?:using\s+\w+\s+)?\^(\w+)/i);
        if (callMatch) {
            const operationId = callMatch[1];
            const startCol = line.indexOf('^' + operationId);
            const endCol = startCol + operationId.length + 1;

            const availableOps = this.openApiProvider.getAllOperationIds();
            
            if (availableOps.length > 0) {
                // Check if operation exists
                if (!availableOps.includes(operationId)) {
                    const range = new vscode.Range(lineNum, startCol, lineNum, endCol);
                    const message = `Unknown operation: ^${operationId}`;
                    const diagnostic = new vscode.Diagnostic(
                        range,
                        message,
                        vscode.DiagnosticSeverity.Error
                    );
                    diagnostic.code = 'unknown-operation';
                    diagnostic.source = 'berrycrush';
                    
                    // Add related info with suggestions
                    const similar = this.findSimilar(operationId, availableOps, 3);
                    if (similar.length > 0) {
                        diagnostic.relatedInformation = [
                            new vscode.DiagnosticRelatedInformation(
                                new vscode.Location(vscode.Uri.parse(''), new vscode.Position(0, 0)),
                                `Did you mean: ${similar.join(', ')}?`
                            )
                        ];
                    }
                    diagnostics.push(diagnostic);
                }
            } else {
                // No spec loaded - info message
                const range = new vscode.Range(lineNum, startCol, lineNum, endCol);
                const diagnostic = new vscode.Diagnostic(
                    range,
                    `Cannot validate operation ^${operationId}: No OpenAPI spec loaded`,
                    vscode.DiagnosticSeverity.Information
                );
                diagnostic.code = 'no-spec';
                diagnostic.source = 'berrycrush';
                diagnostics.push(diagnostic);
            }
        }

        return diagnostics;
    }

    /**
     * Validate fragment references (include fragmentName)
     */
    private validateFragmentReference(
        line: string,
        lineNum: number
    ): vscode.Diagnostic[] {
        const diagnostics: vscode.Diagnostic[] = [];

        // Match "include fragmentName"
        const includeMatch = line.match(/include\s+(\w+)/i);
        if (includeMatch) {
            const fragmentName = includeMatch[1];
            const startCol = line.indexOf(fragmentName, line.indexOf('include'));
            const endCol = startCol + fragmentName.length;

            const fragmentNames = this.fragmentProvider.getFragmentNames();
            const fragmentExists = fragmentNames.includes(fragmentName);

            if (!fragmentExists) {
                const range = new vscode.Range(lineNum, startCol, lineNum, endCol);
                const message = `Unknown fragment: ${fragmentName}`;
                const diagnostic = new vscode.Diagnostic(
                    range,
                    message,
                    vscode.DiagnosticSeverity.Warning
                );
                diagnostic.code = 'unknown-fragment';
                diagnostic.source = 'berrycrush';

                // Suggest similar fragment names
                const similar = this.findSimilar(fragmentName, fragmentNames, 3);
                if (similar.length > 0) {
                    diagnostic.relatedInformation = [
                        new vscode.DiagnosticRelatedInformation(
                            new vscode.Location(vscode.Uri.parse(''), new vscode.Position(0, 0)),
                            `Did you mean: ${similar.join(', ')}?`
                        )
                    ];
                }
                diagnostics.push(diagnostic);
            }
        }

        return diagnostics;
    }

    /**
     * Validate variable references ({{variable}})
     */
    private validateVariableReferences(
        line: string,
        lineNum: number,
        definedVariables: Set<string>
    ): vscode.Diagnostic[] {
        const diagnostics: vscode.Diagnostic[] = [];

        // Find all {{variable}} references
        const varPattern = /\{\{(\w+)\}\}/g;
        let match;

        while ((match = varPattern.exec(line)) !== null) {
            const varName = match[1];
            const startCol = match.index;
            const endCol = startCol + match[0].length;

            if (!definedVariables.has(varName)) {
                const range = new vscode.Range(lineNum, startCol, lineNum, endCol);
                const diagnostic = new vscode.Diagnostic(
                    range,
                    `Undefined variable: {{${varName}}}`,
                    vscode.DiagnosticSeverity.Warning
                );
                diagnostic.code = 'undefined-variable';
                diagnostic.source = 'berrycrush';
                diagnostics.push(diagnostic);
            }
        }

        return diagnostics;
    }

    /**
     * Validate assertion syntax
     */
    private validateAssertionSyntax(
        line: string,
        lineNum: number
    ): vscode.Diagnostic[] {
        const diagnostics: vscode.Diagnostic[] = [];

        // Match assert lines
        const assertMatch = line.match(/^\s*assert\s+(.+)$/i);
        if (assertMatch) {
            const assertContent = assertMatch[1].trim();
            
            // Valid assertion patterns
            const validPatterns = [
                /^status\s+\d{3}$/i,                     // assert status 200
                /^status\s+\d[xX]{2}$/i,                 // assert status 2xx
                /^status\s+\d{3}-\d{3}$/i,              // assert status 200-299
                /^\$[\.\[\]a-zA-Z0-9_]+\s+\w+/i,        // assert $.path operator ...
                /^header\s+[\w-]+\s+(?:=|exists)/i,     // assert header X-Foo = ...
                /^schema$/i,                             // assert schema
                /^responseTime\s+\d+$/i,                // assert responseTime 1000
            ];

            const isValidAssertion = validPatterns.some(pattern => pattern.test(assertContent));
            
            if (!isValidAssertion) {
                const startCol = line.indexOf('assert');
                const range = new vscode.Range(lineNum, startCol, lineNum, line.length);
                const diagnostic = new vscode.Diagnostic(
                    range,
                    `Invalid assertion syntax: "${assertContent}"`,
                    vscode.DiagnosticSeverity.Error
                );
                diagnostic.code = 'invalid-assertion';
                diagnostic.source = 'berrycrush';
                diagnostics.push(diagnostic);
            }
        }

        return diagnostics;
    }

    /**
     * Check for duplicate scenario names
     */
    private validateDuplicateScenarioNames(lines: string[]): vscode.Diagnostic[] {
        const diagnostics: vscode.Diagnostic[] = [];
        const scenarioNames: Map<string, number[]> = new Map();

        // Collect all scenario names and their line numbers
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

        // Report duplicates
        for (const [name, lineNumbers] of scenarioNames) {
            if (lineNumbers.length > 1) {
                for (const lineNum of lineNumbers) {
                    const line = lines[lineNum];
                    const startCol = line.indexOf(name);
                    const endCol = startCol + name.length;
                    const range = new vscode.Range(lineNum, startCol, lineNum, endCol);
                    
                    const diagnostic = new vscode.Diagnostic(
                        range,
                        `Duplicate scenario name: "${name}"`,
                        vscode.DiagnosticSeverity.Warning
                    );
                    diagnostic.code = 'duplicate-scenario';
                    diagnostic.source = 'berrycrush';
                    diagnostics.push(diagnostic);
                }
            }
        }

        return diagnostics;
    }

    /**
     * Find similar strings using Levenshtein distance
     */
    private findSimilar(target: string, candidates: string[], maxResults: number): string[] {
        const scored = candidates.map(candidate => ({
            name: candidate,
            score: this.levenshteinDistance(target.toLowerCase(), candidate.toLowerCase())
        }));

        return scored
            .filter(item => item.score <= Math.max(3, target.length / 2))
            .sort((a, b) => a.score - b.score)
            .slice(0, maxResults)
            .map(item => item.name);
    }

    /**
     * Calculate Levenshtein distance between two strings
     */
    private levenshteinDistance(a: string, b: string): number {
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
                        matrix[i - 1][j - 1] + 1, // substitution
                        matrix[i][j - 1] + 1,     // insertion
                        matrix[i - 1][j] + 1      // deletion
                    );
                }
            }
        }

        return matrix[b.length][a.length];
    }

    /**
     * Dispose of resources
     */
    public dispose(): void {
        if (this.debounceTimer) {
            clearTimeout(this.debounceTimer);
        }
        this.diagnosticCollection.dispose();
    }
}
