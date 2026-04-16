import * as vscode from 'vscode';
import { OpenApiProvider } from './openapi-provider';
import { FragmentProvider } from './fragment-provider';

/**
 * Provides quick fix code actions for BerryCrush diagnostics
 */
export class ScenarioCodeActionProvider implements vscode.CodeActionProvider {
    public static readonly providedCodeActionKinds = [
        vscode.CodeActionKind.QuickFix
    ];

    constructor(
        private openApiProvider: OpenApiProvider,
        private fragmentProvider: FragmentProvider
    ) {}

    provideCodeActions(
        document: vscode.TextDocument,
        range: vscode.Range | vscode.Selection,
        context: vscode.CodeActionContext,
        _token: vscode.CancellationToken
    ): vscode.CodeAction[] {
        const actions: vscode.CodeAction[] = [];

        for (const diagnostic of context.diagnostics) {
            if (diagnostic.source !== 'berrycrush') {
                continue;
            }

            switch (diagnostic.code) {
                case 'unknown-fragment':
                    actions.push(...this.createFragmentActions(document, diagnostic));
                    break;
                case 'unknown-operation':
                    actions.push(...this.createOperationActions(document, diagnostic));
                    break;
                case 'undefined-variable':
                    actions.push(...this.createVariableActions(document, diagnostic));
                    break;
            }
        }

        return actions;
    }

    /**
     * Create quick fix actions for unknown fragment
     */
    private createFragmentActions(
        document: vscode.TextDocument,
        diagnostic: vscode.Diagnostic
    ): vscode.CodeAction[] {
        const actions: vscode.CodeAction[] = [];
        const line = document.lineAt(diagnostic.range.start.line).text;
        const includeMatch = line.match(/include\s+(\w+)/i);
        
        if (!includeMatch) {
            return actions;
        }

        const fragmentName = includeMatch[1];
        const fragmentNames = this.fragmentProvider.getFragmentNames();

        // "Did you mean?" suggestions
        const similar = this.findSimilar(fragmentName, fragmentNames, 3);
        for (const suggestion of similar) {
            const action = new vscode.CodeAction(
                `Change to '${suggestion}'`,
                vscode.CodeActionKind.QuickFix
            );
            action.diagnostics = [diagnostic];
            action.edit = new vscode.WorkspaceEdit();
            action.edit.replace(document.uri, diagnostic.range, suggestion);
            action.isPreferred = similar[0] === suggestion; // Mark first as preferred
            actions.push(action);
        }

        // "Create fragment" quick fix
        const createFragmentAction = new vscode.CodeAction(
            `Create fragment '${fragmentName}'`,
            vscode.CodeActionKind.QuickFix
        );
        createFragmentAction.diagnostics = [diagnostic];
        createFragmentAction.command = {
            title: 'Create Fragment',
            command: 'berrycrush.createFragment',
            arguments: [fragmentName]
        };
        actions.push(createFragmentAction);

        return actions;
    }

    /**
     * Create quick fix actions for unknown operation
     */
    private createOperationActions(
        document: vscode.TextDocument,
        diagnostic: vscode.Diagnostic
    ): vscode.CodeAction[] {
        const actions: vscode.CodeAction[] = [];
        const line = document.lineAt(diagnostic.range.start.line).text;
        const callMatch = line.match(/call\s+(?:using\s+\w+\s+)?\^(\w+)/i);
        
        if (!callMatch) {
            return actions;
        }

        const operationId = callMatch[1];
        const availableOps = this.openApiProvider.getAllOperationIds();

        // "Did you mean?" suggestions
        const similar = this.findSimilar(operationId, availableOps, 5);
        for (const suggestion of similar) {
            const action = new vscode.CodeAction(
                `Change to '^${suggestion}'`,
                vscode.CodeActionKind.QuickFix
            );
            action.diagnostics = [diagnostic];
            action.edit = new vscode.WorkspaceEdit();
            
            // Replace the operationId part (^operationId)
            const startCol = line.indexOf('^' + operationId);
            const endCol = startCol + operationId.length + 1;
            const replaceRange = new vscode.Range(
                diagnostic.range.start.line,
                startCol,
                diagnostic.range.start.line,
                endCol
            );
            action.edit.replace(document.uri, replaceRange, '^' + suggestion);
            action.isPreferred = similar[0] === suggestion;
            actions.push(action);
        }

        return actions;
    }

    /**
     * Create quick fix actions for undefined variable
     */
    private createVariableActions(
        document: vscode.TextDocument,
        diagnostic: vscode.Diagnostic
    ): vscode.CodeAction[] {
        const actions: vscode.CodeAction[] = [];
        
        // Extract variable name from diagnostic message
        const varMatch = diagnostic.message.match(/\{\{(\w+)\}\}/);
        if (!varMatch) {
            return actions;
        }

        const varName = varMatch[1];

        // Find defined variables in the document
        const text = document.getText();
        const lines = text.split('\n');
        const definedVariables = this.collectDefinedVariables(lines);

        // "Did you mean?" suggestions
        const similar = this.findSimilar(varName, Array.from(definedVariables), 3);
        for (const suggestion of similar) {
            const action = new vscode.CodeAction(
                `Change to '{{${suggestion}}}'`,
                vscode.CodeActionKind.QuickFix
            );
            action.diagnostics = [diagnostic];
            action.edit = new vscode.WorkspaceEdit();
            action.edit.replace(document.uri, diagnostic.range, `{{${suggestion}}}`);
            action.isPreferred = similar[0] === suggestion;
            actions.push(action);
        }

        // Add "Create extract statement" action
        const createExtractAction = new vscode.CodeAction(
            `Add extract statement for '${varName}'`,
            vscode.CodeActionKind.QuickFix
        );
        createExtractAction.diagnostics = [diagnostic];
        createExtractAction.command = {
            title: 'Insert Extract Statement',
            command: 'berrycrush.insertExtract',
            arguments: [document.uri, diagnostic.range.start.line, varName]
        };
        actions.push(createExtractAction);

        return actions;
    }

    /**
     * Collect defined variables from document lines
     */
    private collectDefinedVariables(lines: string[]): Set<string> {
        const variables = new Set<string>();

        for (const line of lines) {
            const extractMatch = line.match(/extract\s+[^\s]+\s+=>\s+(\w+)/i);
            if (extractMatch) {
                variables.add(extractMatch[1]);
            }

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
                        matrix[i - 1][j - 1] + 1,
                        matrix[i][j - 1] + 1,
                        matrix[i - 1][j] + 1
                    );
                }
            }
        }

        return matrix[b.length][a.length];
    }
}
