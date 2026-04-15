import * as vscode from 'vscode';

/**
 * Formatting provider for BerryCrush scenario and fragment files.
 * Handles document formatting, range formatting, and on-type formatting.
 */
export class ScenarioFormattingProvider implements 
    vscode.DocumentFormattingEditProvider,
    vscode.DocumentRangeFormattingEditProvider,
    vscode.OnTypeFormattingEditProvider {

    /**
     * Get indent size from VS Code settings.
     */
    private getIndentSize(): number {
        const config = vscode.workspace.getConfiguration('berrycrush');
        return config.get<number>('formatting.indentSize', 2);
    }

    /**
     * Check if table alignment is enabled.
     */
    private isTableAlignmentEnabled(): boolean {
        const config = vscode.workspace.getConfiguration('berrycrush');
        return config.get<boolean>('formatting.alignTables', true);
    }

    /**
     * Create indentation string for a given level.
     */
    private indent(level: number): string {
        const size = this.getIndentSize();
        return ' '.repeat(level * size);
    }

    /**
     * Format entire document.
     */
    provideDocumentFormattingEdits(
        document: vscode.TextDocument,
        options: vscode.FormattingOptions,
        token: vscode.CancellationToken
    ): vscode.TextEdit[] {
        const range = new vscode.Range(
            document.positionAt(0),
            document.positionAt(document.getText().length)
        );
        return this.formatRange(document, range);
    }

    /**
     * Format a range within the document.
     */
    provideDocumentRangeFormattingEdits(
        document: vscode.TextDocument,
        range: vscode.Range,
        options: vscode.FormattingOptions,
        token: vscode.CancellationToken
    ): vscode.TextEdit[] {
        // Expand range to full lines
        const fullRange = new vscode.Range(
            new vscode.Position(range.start.line, 0),
            document.lineAt(range.end.line).range.end
        );
        return this.formatRange(document, fullRange);
    }

    /**
     * Format on typing (auto-indent after Enter).
     */
    provideOnTypeFormattingEdits(
        document: vscode.TextDocument,
        position: vscode.Position,
        ch: string,
        options: vscode.FormattingOptions,
        token: vscode.CancellationToken
    ): vscode.TextEdit[] {
        if (ch !== '\n') {
            return [];
        }

        // Check the previous line to determine indent level
        if (position.line === 0) {
            return [];
        }

        const prevLine = document.lineAt(position.line - 1).text;
        const currentLine = document.lineAt(position.line).text;
        const trimmedPrev = prevLine.trim();

        // Determine expected indent based on previous line
        const expectedIndent = this.getExpectedIndentAfter(trimmedPrev, prevLine);
        const currentIndent = currentLine.length - currentLine.trimStart().length;

        if (currentIndent !== expectedIndent.length) {
            return [
                vscode.TextEdit.replace(
                    new vscode.Range(
                        new vscode.Position(position.line, 0),
                        new vscode.Position(position.line, currentIndent)
                    ),
                    expectedIndent
                )
            ];
        }

        return [];
    }

    /**
     * Get expected indentation after a given line.
     */
    private getExpectedIndentAfter(trimmedLine: string, fullLine: string): string {
        const currentIndent = fullLine.length - fullLine.trimStart().length;
        const indentSize = this.getIndentSize();

        // Lines that increase indent
        if (/^(feature|fragment):/.test(trimmedLine)) {
            return this.indent(1);
        }
        if (/^(scenario|outline):/.test(trimmedLine)) {
            // Inside feature: add another level
            return this.indent(currentIndent / indentSize + 1);
        }
        if (/^background:/.test(trimmedLine)) {
            return this.indent(currentIndent / indentSize + 1);
        }
        if (/^parameters:/.test(trimmedLine)) {
            return this.indent(currentIndent / indentSize + 1);
        }
        if (/^(given|when|then|and|but)\s/.test(trimmedLine) || /^(given|when|then|and|but):/.test(trimmedLine)) {
            return this.indent(currentIndent / indentSize + 1);
        }
        if (/^(call|body:|if\s|else\s*if|else$|else:)/.test(trimmedLine)) {
            return this.indent(currentIndent / indentSize + 1);
        }
        if (/^examples:/.test(trimmedLine)) {
            return this.indent(currentIndent / indentSize + 1);
        }

        // Maintain current indent for other lines
        return ' '.repeat(currentIndent);
    }

    /**
     * Format a range of the document.
     */
    private formatRange(document: vscode.TextDocument, range: vscode.Range): vscode.TextEdit[] {
        const edits: vscode.TextEdit[] = [];
        const lines = document.getText(range).split('\n');
        const formattedLines = this.formatLines(lines, range.start.line);

        // Create a single edit for the entire range
        if (formattedLines.join('\n') !== lines.join('\n')) {
            edits.push(vscode.TextEdit.replace(range, formattedLines.join('\n')));
        }

        return edits;
    }

    /**
     * Format an array of lines.
     */
    private formatLines(lines: string[], startLineNumber: number): string[] {
        const result: string[] = [];
        let context = createFormattingContext();

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            // Pass remaining lines for look-ahead (comments)
            const formatted = this.formatLine(line, context, lines.slice(i + 1));
            result.push(formatted);
            // Pass original line to detect standalone scenarios
            context = this.updateContext(context, formatted, line);
        }

        // Format tables if enabled
        if (this.isTableAlignmentEnabled()) {
            return this.alignTables(result);
        }

        return result;
    }

    /**
     * Format a single line based on context.
     */
    private formatLine(line: string, context: FormattingContext, remainingLines: string[] = []): string {
        const trimmed = line.trim();
        
        // Empty lines
        if (trimmed === '') {
            return '';
        }

        // Comments - align based on surrounding context
        // Priority: 1) Next non-empty line, 2) Previous line depth (context.depth)
        if (trimmed.startsWith('#')) {
            const commentIndent = this.getCommentIndent(remainingLines, context);
            return this.indent(commentIndent) + trimmed;
        }

        // Triple-quote handling
        if (context.inTripleQuote) {
            if (trimmed === '"""') {
                return this.indent(context.tripleQuoteBaseDepth) + trimmed;
            }
            // Preserve content inside triple quotes
            return line;
        }

        if (trimmed === '"""') {
            return this.indent(context.depth + 1) + trimmed;
        }

        // Determine line type and format
        const originalIndent = line.length - line.trimStart().length;
        return this.formatByType(trimmed, context, originalIndent);
    }

    /**
     * Get indent level for a comment based on surrounding lines.
     * Rule:
     * - If immediate next line has content → align with that content (comment above keyword)
     * - If immediate next line is empty → use previous depth (comment below keyword)
     * - If immediate next line is also a comment → look through consecutive comments,
     *   but if we hit an empty line, use previous depth
     */
    private getCommentIndent(remainingLines: string[], context: FormattingContext): number {
        const indentSize = this.getIndentSize();
        
        for (let i = 0; i < remainingLines.length; i++) {
            const nextTrimmed = remainingLines[i].trim();
            
            // Empty line - means this comment belongs to the line above
            if (nextTrimmed === '') {
                return context.depth;
            }
            
            // Another comment - keep looking
            if (nextTrimmed.startsWith('#')) {
                continue;
            }
            
            // Found content directly after comments - align with it
            const nextOriginalIndent = remainingLines[i].length - remainingLines[i].trimStart().length;
            const formatted = this.formatByType(nextTrimmed, context, nextOriginalIndent);
            return Math.floor((formatted.length - formatted.trimStart().length) / indentSize);
        }
        
        // No content found below - use previous line's depth
        return context.depth;
    }

    /**
     * Get indent level for the next non-empty, non-comment line (look-ahead).
     */
    private getNextContentIndent(remainingLines: string[], context: FormattingContext): number {
        for (const line of remainingLines) {
            const trimmed = line.trim();
            if (trimmed === '' || trimmed.startsWith('#')) {
                continue;
            }
            // Format this line to determine its indent
            const originalIndent = line.length - line.trimStart().length;
            const formatted = this.formatByType(trimmed, context, originalIndent);
            const indentSize = this.getIndentSize();
            return Math.floor((formatted.length - formatted.trimStart().length) / indentSize);
        }
        // Default to current depth if no next line found
        return context.depth;
    }

    /**
     * Format line based on its type.
     */
    private formatByType(trimmed: string, context: FormattingContext, originalIndent: number): string {
        // Top-level elements (always at root)
        if (/^(feature|fragment):/.test(trimmed)) {
            return trimmed;
        }

        // Scenario/outline at root level (originalIndent = 0) should be standalone
        // even if we're technically inside a feature context
        if (/^(scenario|outline):/.test(trimmed)) {
            // If original source has no indent, it's a standalone scenario outside feature
            const isInsideFeature = context.inFeature && originalIndent > 0;
            return this.indent(isInsideFeature ? 1 : 0) + trimmed;
        }

        // Tags - same logic: check original indent
        if (/^@\w+/.test(trimmed)) {
            const isInsideFeature = context.inFeature && originalIndent > 0;
            return this.indent(isInsideFeature ? 1 : 0) + trimmed;
        }

        // Parameters at file or feature level
        if (/^parameters:/.test(trimmed)) {
            const isInsideFeature = context.inFeature && originalIndent > 0;
            return this.indent(isInsideFeature ? 1 : 0) + trimmed;
        }

        // Scenario/outline (can be in feature or standalone)
        if (/^(scenario|outline):/.test(trimmed)) {
            return this.indent(context.inFeature ? 1 : 0) + trimmed;
        }

        // Background
        if (/^background:/.test(trimmed)) {
            return this.indent(1) + trimmed;
        }

        // Step keywords - same depth whether in scenario or background
        if (/^(given|when|then|and|but)\s/.test(trimmed) || /^(given|when|then|and|but):/.test(trimmed)) {
            const baseDepth = context.inFeature ? 2 : 1;
            return this.indent(baseDepth) + trimmed;
        }

        // Directives (call, assert, extract, include)
        // Use original indentation to preserve nesting inside if/else blocks
        if (/^(call|assert|extract|include)\s/.test(trimmed)) {
            const indentSize = this.getIndentSize();
            const originalLevel = Math.floor(originalIndent / indentSize);
            const minLevel = context.inFeature ? 3 : 2;
            // Use original level but ensure minimum directive level
            return this.indent(Math.max(minLevel, originalLevel)) + trimmed;
        }

        // Conditional keywords - if/else/else if
        // Use original indentation to preserve nesting structure
        // Minimum level is directive level (2 for standalone, 3 for feature)
        if (/^if\s/.test(trimmed)) {
            const indentSize = this.getIndentSize();
            const originalLevel = Math.floor(originalIndent / indentSize);
            const minLevel = context.inFeature ? 3 : 2;
            // Use original level but ensure minimum directive level
            return this.indent(Math.max(minLevel, originalLevel)) + trimmed;
        }
        if (/^else\s*if\s/.test(trimmed) || /^else$/.test(trimmed) || /^else:/.test(trimmed)) {
            // else/else if should be at same level as its corresponding if
            // The original indentation tells us which if it belongs to
            const indentSize = this.getIndentSize();
            const originalLevel = Math.floor(originalIndent / indentSize);
            const minLevel = context.inFeature ? 3 : 2;
            return this.indent(Math.max(minLevel, originalLevel)) + trimmed;
        }

        // Fail action - use original indentation to preserve nesting inside if/else blocks
        if (/^fail\s/.test(trimmed)) {
            const indentSize = this.getIndentSize();
            const originalLevel = Math.floor(originalIndent / indentSize);
            const minLevel = context.inFeature ? 3 : 2;
            return this.indent(Math.max(minLevel, originalLevel)) + trimmed;
        }

        // Body and bodyFile keywords - use original indentation to preserve nesting
        if (/^(body:|bodyFile\s)/.test(trimmed)) {
            const indentSize = this.getIndentSize();
            const originalLevel = Math.floor(originalIndent / indentSize);
            const minLevel = context.inFeature ? 4 : 3;
            return this.indent(Math.max(minLevel, originalLevel)) + trimmed;
        }

        // Examples
        if (/^examples:/.test(trimmed)) {
            const baseDepth = context.inFeature ? 2 : 1;
            return this.indent(baseDepth) + trimmed;
        }

        // Table rows (pipes)
        if (trimmed.startsWith('|')) {
            const baseDepth = context.inFeature ? 3 : 2;
            return this.indent(baseDepth) + trimmed;
        }

        // Parameter entries (key: value lines under parameters:)
        if (context.inParameters) {
            // One level deeper than parameters keyword
            return this.indent(context.parametersBaseDepth + 1) + trimmed;
        }

        // Body field entries (key: value lines under body:)
        if (context.inBody) {
            // One level deeper than body keyword
            return this.indent(context.bodyBaseDepth + 1) + trimmed;
        }

        // Parameters under a directive (call parameters like query, path, header)
        // Use original indentation to preserve nesting
        if (context.depth > 0) {
            const indentSize = this.getIndentSize();
            const originalLevel = Math.floor(originalIndent / indentSize);
            const minLevel = context.inFeature ? 4 : 3;
            return this.indent(Math.max(minLevel, originalLevel)) + trimmed;
        }

        // Default: preserve original indentation
        return trimmed;
    }

    /**
     * Update formatting context after processing a line.
     */
    private updateContext(context: FormattingContext, formattedLine: string, originalLine?: string): FormattingContext {
        const trimmed = formattedLine.trim();
        const newContext = { ...context };
        const indentSize = this.getIndentSize();
        
        // Calculate original indentation if originalLine provided
        const originalIndent = originalLine ? originalLine.length - originalLine.trimStart().length : -1;

        // Triple-quote handling
        if (trimmed === '"""') {
            if (context.inTripleQuote) {
                newContext.inTripleQuote = false;
            } else {
                newContext.inTripleQuote = true;
                newContext.tripleQuoteBaseDepth = (formattedLine.length - formattedLine.trimStart().length) / indentSize;
            }
            return newContext;
        }

        if (context.inTripleQuote) {
            return newContext;
        }

        // Parameters tracking
        if (/^parameters:/.test(trimmed)) {
            newContext.inParameters = true;
            newContext.parametersBaseDepth = (formattedLine.length - formattedLine.trimStart().length) / indentSize;
            return newContext;
        }

        // Exit parameters on any major keyword
        if (/^(feature|fragment|scenario|outline|background|given|when|then|and|but):?/.test(trimmed)) {
            newContext.inParameters = false;
        }

        // Body tracking - enter when seeing body:, exit on next directive/keyword
        if (/^body:/.test(trimmed)) {
            newContext.inBody = true;
            newContext.bodyBaseDepth = (formattedLine.length - formattedLine.trimStart().length) / indentSize;
        } else if (/^(call|assert|extract|include|if\s|else|bodyFile|given|when|then|and|but|scenario|outline|feature|fragment|background)/.test(trimmed)) {
            newContext.inBody = false;
        }

        // Feature tracking
        if (/^feature:/.test(trimmed)) {
            newContext.inFeature = true;
            newContext.inBackground = 0;
            newContext.conditionalDepth = 0;
            newContext.inParameters = false;
            return newContext;
        }

        // Reset feature context on new feature or fragment
        if (/^fragment:/.test(trimmed)) {
            newContext.inFeature = false;
            newContext.inBackground = 0;
            newContext.conditionalDepth = 0;
            newContext.inParameters = false;
            return newContext;
        }

        // Standalone scenario at root level resets feature context
        // Check original indent to detect root-level scenarios
        if (/^scenario:|^outline:/.test(trimmed)) {
            // If original line has no indent, it's a standalone scenario outside feature
            const isStandalone = originalIndent === 0;
            if (isStandalone) {
                newContext.inFeature = false;
            }
            newContext.inBackground = 0;
            newContext.conditionalDepth = 0;
            newContext.inParameters = false;
            return newContext;
        }

        // Background tracking
        if (/^background:/.test(trimmed)) {
            newContext.inBackground = 1;
            newContext.inParameters = false;
            return newContext;
        }

        // Conditional depth tracking
        if (/^if\s/.test(trimmed)) {
            newContext.conditionalDepth = context.conditionalDepth + 1;
            return newContext;
        }

        // Track depth based on indentation
        const currentIndent = formattedLine.length - formattedLine.trimStart().length;
        newContext.depth = Math.floor(currentIndent / indentSize);

        return newContext;
    }

    /**
     * Align tables within the formatted lines.
     */
    private alignTables(lines: string[]): string[] {
        const result: string[] = [...lines];
        let tableStart = -1;

        for (let i = 0; i <= lines.length; i++) {
            const line = i < lines.length ? lines[i] : '';
            const trimmed = line.trim();

            if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
                if (tableStart === -1) {
                    tableStart = i;
                }
            } else {
                if (tableStart !== -1) {
                    // We've found the end of a table, align it
                    const tableLines = lines.slice(tableStart, i);
                    const aligned = this.alignTable(tableLines);
                    for (let j = 0; j < aligned.length; j++) {
                        result[tableStart + j] = aligned[j];
                    }
                    tableStart = -1;
                }
            }
        }

        return result;
    }

    /**
     * Align a single table.
     */
    private alignTable(tableLines: string[]): string[] {
        if (tableLines.length === 0) {
            return tableLines;
        }

        // Get leading indent from first line
        const firstLine = tableLines[0];
        const indent = firstLine.substring(0, firstLine.length - firstLine.trimStart().length);

        // Parse cells and find column widths
        const rows: string[][] = tableLines.map(line => {
            const trimmed = line.trim();
            // Remove leading and trailing pipes, split by pipe
            const inner = trimmed.slice(1, -1);
            return inner.split('|').map(cell => cell.trim());
        });

        // Calculate max width for each column
        const colWidths: number[] = [];
        for (const row of rows) {
            for (let c = 0; c < row.length; c++) {
                const width = row[c].length;
                if (colWidths[c] === undefined || width > colWidths[c]) {
                    colWidths[c] = width;
                }
            }
        }

        // Detect if each column is numeric (for right-alignment)
        const isNumeric: boolean[] = colWidths.map(() => true);
        for (let r = 1; r < rows.length; r++) { // Skip header
            for (let c = 0; c < rows[r].length; c++) {
                const val = rows[r][c];
                if (val && isNaN(Number(val.replace(/[",]/g, '')))) {
                    isNumeric[c] = false;
                }
            }
        }

        // Format rows
        return rows.map((row, rowIndex) => {
            const cells = row.map((cell, colIndex) => {
                const width = colWidths[colIndex] || 0;
                // Header row is always left-aligned
                if (rowIndex === 0 || !isNumeric[colIndex]) {
                    return cell.padEnd(width);
                } else {
                    return cell.padStart(width);
                }
            });
            return indent + '| ' + cells.join(' | ') + ' |';
        });
    }
}

/**
 * Context for tracking formatting state.
 */
interface FormattingContext {
    /** Current indentation depth */
    depth: number;
    /** Whether we're inside a feature block */
    inFeature: boolean;
    /** Whether we're inside a background (adds +1 to step indent) */
    inBackground: number;
    /** Current conditional nesting depth */
    conditionalDepth: number;
    /** Whether we're inside triple-quoted string */
    inTripleQuote: boolean;
    /** Base depth when triple-quote started */
    tripleQuoteBaseDepth: number;
    /** Whether we're inside a parameters block */
    inParameters: boolean;
    /** Base depth of the parameters keyword */
    parametersBaseDepth: number;
    /** Whether we're inside a body block */
    inBody: boolean;
    /** Base depth of the body keyword */
    bodyBaseDepth: number;
}

/**
 * Create a new default formatting context.
 */
function createFormattingContext(): FormattingContext {
    return {
        depth: 0,
        inFeature: false,
        inBackground: 0,
        conditionalDepth: 0,
        inTripleQuote: false,
        tripleQuoteBaseDepth: 0,
        inParameters: false,
        parametersBaseDepth: 0,
        inBody: false,
        bodyBaseDepth: 0
    };
}
