import * as vscode from 'vscode';

/**
 * Provides document outline support for BerryCrush scenario and fragment files.
 * Shows hierarchical structure in VS Code's Outline panel and enables breadcrumbs.
 */
export class ScenarioDocumentSymbolProvider implements vscode.DocumentSymbolProvider {
    
    /**
     * Patterns for identifying BerryCrush elements.
     */
    private readonly patterns = {
        feature: /^((?:@[\w-]+\s*)*)feature:\s*(.+)$/,
        scenario: /^(\s*)((?:@[\w-]+\s*)*)scenario:\s*(.+)$/,
        outline: /^(\s*)((?:@[\w-]+\s*)*)outline:\s*(.+)$/,
        background: /^(\s*)background:\s*(.*)$/,
        fragment: /^((?:@[\w-]+\s*)*)fragment:\s*(.+)$/,
        parameters: /^(\s*)parameters:\s*(.*)$/,
        examples: /^(\s*)examples:\s*(.*)$/,
        step: /^(\s*)(given|when|then|and|but)[\s:]\s*(.*)$/i,
    };

    /**
     * Provide document symbols for outline and breadcrumbs.
     */
    provideDocumentSymbols(
        document: vscode.TextDocument,
        token: vscode.CancellationToken
    ): vscode.DocumentSymbol[] {
        const symbols: vscode.DocumentSymbol[] = [];
        const containerStack: { symbol: vscode.DocumentSymbol; indent: number; type: string }[] = [];

        for (let lineNum = 0; lineNum < document.lineCount; lineNum++) {
            if (token.isCancellationRequested) {
                break;
            }

            const line = document.lineAt(lineNum);
            const text = line.text;
            const trimmed = text.trim();

            // Skip empty lines and comments
            if (trimmed === '' || trimmed.startsWith('#')) {
                continue;
            }

            const indent = text.length - text.trimStart().length;

            // Feature (top-level)
            const featureMatch = trimmed.match(this.patterns.feature);
            if (featureMatch) {
                const tags = featureMatch[1].trim();
                const name = featureMatch[2];
                const displayName = tags ? `${tags} feature: ${name}` : `feature: ${name}`;
                const symbol = this.createSymbol(
                    displayName,
                    name,
                    vscode.SymbolKind.Class,
                    line,
                    document
                );
                // Close all previous containers
                this.finalizeSymbols(containerStack, document, lineNum);
                symbols.push(symbol);
                containerStack.push({ symbol, indent: 0, type: 'feature' });
                continue;
            }

            // Fragment (top-level)
            const fragmentMatch = trimmed.match(this.patterns.fragment);
            if (fragmentMatch) {
                const tags = fragmentMatch[1].trim();
                const name = fragmentMatch[2];
                const displayName = tags ? `${tags} fragment: ${name}` : `fragment: ${name}`;
                const symbol = this.createSymbol(
                    displayName,
                    name,
                    vscode.SymbolKind.Function,
                    line,
                    document
                );
                // Close all previous containers
                this.finalizeSymbols(containerStack, document, lineNum);
                symbols.push(symbol);
                containerStack.push({ symbol, indent: 0, type: 'fragment' });
                continue;
            }

            // Scenario
            const scenarioMatch = trimmed.match(this.patterns.scenario);
            if (scenarioMatch) {
                const leadingWhitespace = scenarioMatch[1];
                const tags = scenarioMatch[2].trim();
                const name = scenarioMatch[3];
                const displayName = tags ? `${tags} scenario: ${name}` : `scenario: ${name}`;
                const symbol = this.createSymbol(
                    displayName,
                    name,
                    vscode.SymbolKind.Method,
                    line,
                    document
                );
                this.closeContainersAtOrBeyondIndent(containerStack, indent, document, lineNum, ['scenario', 'outline', 'background']);
                const parent = this.findParentContainer(containerStack, indent, ['feature']);
                if (parent) {
                    parent.symbol.children.push(symbol);
                } else {
                    symbols.push(symbol);
                }
                containerStack.push({ symbol, indent, type: 'scenario' });
                continue;
            }

            // Outline
            const outlineMatch = trimmed.match(this.patterns.outline);
            if (outlineMatch) {
                const leadingWhitespace = outlineMatch[1];
                const tags = outlineMatch[2].trim();
                const name = outlineMatch[3];
                const displayName = tags ? `${tags} outline: ${name}` : `outline: ${name}`;
                const symbol = this.createSymbol(
                    displayName,
                    name,
                    vscode.SymbolKind.Method,
                    line,
                    document
                );
                this.closeContainersAtOrBeyondIndent(containerStack, indent, document, lineNum, ['scenario', 'outline', 'background']);
                const parent = this.findParentContainer(containerStack, indent, ['feature']);
                if (parent) {
                    parent.symbol.children.push(symbol);
                } else {
                    symbols.push(symbol);
                }
                containerStack.push({ symbol, indent, type: 'outline' });
                continue;
            }

            // Background
            const backgroundMatch = trimmed.match(this.patterns.background);
            if (backgroundMatch) {
                const description = backgroundMatch[2] || 'background';
                const symbol = this.createSymbol(
                    'background:',
                    description,
                    vscode.SymbolKind.Constructor,
                    line,
                    document
                );
                this.closeContainersAtOrBeyondIndent(containerStack, indent, document, lineNum, ['background', 'scenario', 'outline']);
                const parent = this.findParentContainer(containerStack, indent, ['feature']);
                if (parent) {
                    parent.symbol.children.push(symbol);
                } else {
                    symbols.push(symbol);
                }
                containerStack.push({ symbol, indent, type: 'background' });
                continue;
            }

            // Parameters
            const parametersMatch = trimmed.match(this.patterns.parameters);
            if (parametersMatch) {
                const symbol = this.createSymbol(
                    'parameters:',
                    'parameters',
                    vscode.SymbolKind.Struct,
                    line,
                    document
                );
                const parent = this.findParentContainer(containerStack, indent, ['scenario', 'outline', 'fragment']);
                if (parent) {
                    parent.symbol.children.push(symbol);
                } else {
                    symbols.push(symbol);
                }
                continue;
            }

            // Examples
            const examplesMatch = trimmed.match(this.patterns.examples);
            if (examplesMatch) {
                const symbol = this.createSymbol(
                    'examples:',
                    'examples',
                    vscode.SymbolKind.Array,
                    line,
                    document
                );
                const parent = this.findParentContainer(containerStack, indent, ['outline']);
                if (parent) {
                    parent.symbol.children.push(symbol);
                } else {
                    const scenarioParent = this.findParentContainer(containerStack, indent, ['scenario']);
                    if (scenarioParent) {
                        scenarioParent.symbol.children.push(symbol);
                    } else {
                        symbols.push(symbol);
                    }
                }
                continue;
            }

            // Steps (given, when, then, and, but)
            const stepMatch = trimmed.match(this.patterns.step);
            if (stepMatch) {
                const keyword = stepMatch[2].toLowerCase();
                const description = stepMatch[3] || '';
                const displayName = `${keyword}: ${description}`.trim();
                const symbol = this.createSymbol(
                    displayName,
                    description,
                    vscode.SymbolKind.Field,
                    line,
                    document
                );
                // Close any previous steps at same or greater indent
                this.closeContainersAtOrBeyondIndent(containerStack, indent, document, lineNum, ['step']);
                const parent = this.findParentContainer(containerStack, indent, ['scenario', 'outline', 'background', 'fragment']);
                if (parent) {
                    parent.symbol.children.push(symbol);
                } else {
                    symbols.push(symbol);
                }
                containerStack.push({ symbol, indent, type: 'step' });
                continue;
            }
        }

        // Finalize any remaining open containers
        this.finalizeSymbols(containerStack, document, document.lineCount - 1);

        return symbols;
    }

    /**
     * Create a DocumentSymbol with proper range.
     */
    private createSymbol(
        name: string,
        detail: string,
        kind: vscode.SymbolKind,
        line: vscode.TextLine,
        document: vscode.TextDocument
    ): vscode.DocumentSymbol {
        const range = line.range;
        const selectionRange = new vscode.Range(
            line.range.start,
            line.range.end
        );
        return new vscode.DocumentSymbol(
            name,
            detail,
            kind,
            range,
            selectionRange
        );
    }

    /**
     * Close containers at or beyond a certain indent level.
     */
    private closeContainersAtOrBeyondIndent(
        stack: { symbol: vscode.DocumentSymbol; indent: number; type: string }[],
        currentIndent: number,
        document: vscode.TextDocument,
        currentLine: number,
        typesToClose: string[]
    ): void {
        while (stack.length > 0) {
            const top = stack[stack.length - 1];
            if (typesToClose.includes(top.type) && top.indent >= currentIndent) {
                this.updateSymbolRange(top.symbol, document, currentLine - 1);
                stack.pop();
            } else if (top.type === 'step' && top.indent >= currentIndent) {
                this.updateSymbolRange(top.symbol, document, currentLine - 1);
                stack.pop();
            } else {
                break;
            }
        }
    }

    /**
     * Find the nearest parent container of specified types.
     */
    private findParentContainer(
        stack: { symbol: vscode.DocumentSymbol; indent: number; type: string }[],
        currentIndent: number,
        parentTypes: string[]
    ): { symbol: vscode.DocumentSymbol; indent: number; type: string } | undefined {
        for (let i = stack.length - 1; i >= 0; i--) {
            if (parentTypes.includes(stack[i].type) && stack[i].indent < currentIndent) {
                return stack[i];
            }
        }
        return undefined;
    }

    /**
     * Finalize all remaining symbols at end of document.
     */
    private finalizeSymbols(
        stack: { symbol: vscode.DocumentSymbol; indent: number; type: string }[],
        document: vscode.TextDocument,
        endLine: number
    ): void {
        while (stack.length > 0) {
            const container = stack.pop()!;
            this.updateSymbolRange(container.symbol, document, endLine);
        }
    }

    /**
     * Update symbol range to extend to end line.
     */
    private updateSymbolRange(
        symbol: vscode.DocumentSymbol,
        document: vscode.TextDocument,
        endLine: number
    ): void {
        const newRange = new vscode.Range(
            symbol.range.start,
            document.lineAt(Math.min(endLine, document.lineCount - 1)).range.end
        );
        // TypeScript doesn't allow direct range modification, but the object is mutable
        (symbol as any).range = newRange;
    }
}
