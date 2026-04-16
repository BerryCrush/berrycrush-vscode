import * as vscode from 'vscode';

/**
 * Block type for tracking fold regions.
 */
interface FoldBlock {
    /** Start line of the block (0-indexed) */
    startLine: number;
    /** Indentation level of the block */
    indent: number;
    /** Type of block for determining fold kind */
    type: 'feature' | 'scenario' | 'fragment' | 'background' | 'parameters' | 'examples' | 'step' | 'body' | 'conditional' | 'tripleQuote' | 'comment';
}

/**
 * Provides code folding for BerryCrush scenario and fragment files.
 * 
 * Foldable regions:
 * - feature: - folds until next feature or EOF
 * - scenario: / outline: - folds until next scenario/outline or parent ends
 * - fragment: - folds until next fragment or EOF
 * - background: - folds until content at same/lower indent
 * - parameters: - folds until content at same/lower indent
 * - examples: - folds until content at same/lower indent
 * - given/when/then/and/but with body - folds the body content
 * - body: with indented content - folds the body
 * - Triple-quoted strings ("""...""") - folds between triple quotes
 * - if/else if/else blocks - folds individually
 */
export class ScenarioFoldingRangeProvider implements vscode.FoldingRangeProvider {
    
    /**
     * Patterns for block detection.
     */
    private readonly patterns = {
        feature: /^feature:/,
        scenario: /^\s*(scenario|outline):/,
        fragment: /^fragment:/,
        background: /^\s*background:/,
        parameters: /^\s*parameters:/,
        examples: /^\s*examples:/,
        step: /^\s*(given|when|then|and|but)[\s:]/,  // Match space or colon after keyword
        ifBlock: /^\s*if\s/,
        elseIfBlock: /^\s*else\s+if\s/,
        elseBlock: /^\s*else\s*$/,
        body: /^\s*body:/,
        bodyFile: /^\s*bodyFile:/,
        tripleQuoteStart: /^\s*"""/,
        comment: /^\s*#/,
    };

    /**
     * Provide folding ranges for the document.
     */
    provideFoldingRanges(
        document: vscode.TextDocument,
        context: vscode.FoldingContext,
        token: vscode.CancellationToken
    ): vscode.FoldingRange[] {
        const ranges: vscode.FoldingRange[] = [];
        const blockStack: FoldBlock[] = [];
        let inTripleQuote = false;
        let tripleQuoteStart = -1;
        let commentBlockStart = -1;
        
        for (let lineNum = 0; lineNum < document.lineCount; lineNum++) {
            if (token.isCancellationRequested) {
                break;
            }

            const line = document.lineAt(lineNum);
            const text = line.text;
            const trimmed = text.trim();
            const indent = text.length - text.trimStart().length;

            // Handle triple-quoted blocks (must be handled first as they can span multiple lines)
            if (this.patterns.tripleQuoteStart.test(trimmed)) {
                if (inTripleQuote) {
                    // End of triple-quote block
                    if (tripleQuoteStart < lineNum - 1) {
                        ranges.push(new vscode.FoldingRange(
                            tripleQuoteStart,
                            lineNum,
                            vscode.FoldingRangeKind.Region
                        ));
                    }
                    inTripleQuote = false;
                    tripleQuoteStart = -1;
                } else {
                    // Start of triple-quote block
                    inTripleQuote = true;
                    tripleQuoteStart = lineNum;
                }
                continue;
            }

            // Skip lines inside triple-quoted blocks
            if (inTripleQuote) {
                continue;
            }

            // Skip empty lines for most processing but track for block ends
            if (trimmed === '') {
                continue;
            }

            // Handle comment blocks (consecutive comment lines)
            if (this.patterns.comment.test(trimmed)) {
                if (commentBlockStart === -1) {
                    commentBlockStart = lineNum;
                }
                continue;
            } else if (commentBlockStart !== -1) {
                // End of comment block (if it spans multiple lines)
                const commentBlockEnd = lineNum - 1;
                if (commentBlockStart < commentBlockEnd) {
                    ranges.push(new vscode.FoldingRange(
                        commentBlockStart,
                        commentBlockEnd,
                        vscode.FoldingRangeKind.Comment
                    ));
                }
                commentBlockStart = -1;
            }

            // Close blocks that should end based on indentation
            this.closeBlocksByIndent(blockStack, ranges, lineNum, indent);

            // Feature - starts a top-level block
            if (this.patterns.feature.test(trimmed)) {
                this.closeAllTopLevel(blockStack, ranges, lineNum);
                blockStack.push({ startLine: lineNum, indent: 0, type: 'feature' });
                continue;
            }

            // Fragment - starts a top-level block
            if (this.patterns.fragment.test(trimmed)) {
                this.closeAllTopLevel(blockStack, ranges, lineNum);
                blockStack.push({ startLine: lineNum, indent: 0, type: 'fragment' });
                continue;
            }

            // Scenario/Outline - block within feature or standalone
            if (this.patterns.scenario.test(trimmed)) {
                // Close previous scenarios at same or lower indent
                this.closeScenarioLevelBlocks(blockStack, ranges, lineNum, indent);
                blockStack.push({ startLine: lineNum, indent, type: 'scenario' });
                continue;
            }

            // Background - similar to scenario
            if (this.patterns.background.test(trimmed)) {
                this.closeScenarioLevelBlocks(blockStack, ranges, lineNum, indent);
                blockStack.push({ startLine: lineNum, indent, type: 'background' });
                continue;
            }

            // Parameters block
            if (this.patterns.parameters.test(trimmed)) {
                this.closeBlocksSameOrLowerIndent(blockStack, ranges, lineNum, indent, ['parameters', 'examples']);
                blockStack.push({ startLine: lineNum, indent, type: 'parameters' });
                continue;
            }

            // Examples block
            if (this.patterns.examples.test(trimmed)) {
                this.closeBlocksSameOrLowerIndent(blockStack, ranges, lineNum, indent, ['parameters', 'examples']);
                blockStack.push({ startLine: lineNum, indent, type: 'examples' });
                continue;
            }

            // Step keywords (given, when, then, and, but) - foldable with their contents
            if (this.patterns.step.test(trimmed)) {
                this.closeStepBlocks(blockStack, ranges, lineNum, indent);
                blockStack.push({ startLine: lineNum, indent, type: 'step' });
                continue;
            }

            // If block
            if (this.patterns.ifBlock.test(trimmed) && !this.patterns.elseIfBlock.test(trimmed)) {
                blockStack.push({ startLine: lineNum, indent, type: 'conditional' });
                continue;
            }

            // Else-if block - closes previous else-if/if at same indent
            if (this.patterns.elseIfBlock.test(trimmed)) {
                this.closeConditionalBlock(blockStack, ranges, lineNum, indent);
                blockStack.push({ startLine: lineNum, indent, type: 'conditional' });
                continue;
            }

            // Else block - closes previous else-if/if at same indent
            if (this.patterns.elseBlock.test(trimmed)) {
                this.closeConditionalBlock(blockStack, ranges, lineNum, indent);
                blockStack.push({ startLine: lineNum, indent, type: 'conditional' });
                continue;
            }

            // Body block (inline body: with indented content following)
            if (this.patterns.body.test(trimmed)) {
                // Check if there's content on the same line
                const bodyMatch = trimmed.match(/^body:\s*(.*)$/);
                if (!bodyMatch || !bodyMatch[1]) {
                    // Body with indented content on following lines
                    blockStack.push({ startLine: lineNum, indent, type: 'body' });
                }
                continue;
            }
        }

        // Close any remaining blocks at EOF
        this.closeAllBlocks(blockStack, ranges, document.lineCount - 1);

        // Handle trailing comment block
        if (commentBlockStart !== -1 && commentBlockStart < document.lineCount - 1) {
            ranges.push(new vscode.FoldingRange(
                commentBlockStart,
                document.lineCount - 1,
                vscode.FoldingRangeKind.Comment
            ));
        }

        return ranges;
    }

    /**
     * Close blocks based on indentation (blocks with higher indent than current line).
     */
    private closeBlocksByIndent(
        stack: FoldBlock[],
        ranges: vscode.FoldingRange[],
        currentLine: number,
        currentIndent: number
    ): void {
        while (stack.length > 0) {
            const top = stack[stack.length - 1];
            // Close blocks with higher indentation than current line
            // But not top-level blocks (feature, fragment) - they close on same-level keywords
            if (top.type !== 'feature' && top.type !== 'fragment' && top.indent >= currentIndent) {
                this.emitFoldRange(stack.pop()!, ranges, currentLine - 1);
            } else {
                break;
            }
        }
    }

    /**
     * Close scenario-level blocks (scenario, background, outline) at same or lower indent.
     */
    private closeScenarioLevelBlocks(
        stack: FoldBlock[],
        ranges: vscode.FoldingRange[],
        currentLine: number,
        currentIndent: number
    ): void {
        while (stack.length > 0) {
            const top = stack[stack.length - 1];
            if ((top.type === 'scenario' || top.type === 'background') && top.indent >= currentIndent) {
                this.emitFoldRange(stack.pop()!, ranges, currentLine - 1);
            } else if (top.type !== 'feature' && top.type !== 'fragment' && top.indent >= currentIndent) {
                // Close any nested blocks too
                this.emitFoldRange(stack.pop()!, ranges, currentLine - 1);
            } else {
                break;
            }
        }
    }

    /**
     * Close blocks of specific types at same or lower indent.
     */
    private closeBlocksSameOrLowerIndent(
        stack: FoldBlock[],
        ranges: vscode.FoldingRange[],
        currentLine: number,
        currentIndent: number,
        types: FoldBlock['type'][]
    ): void {
        while (stack.length > 0) {
            const top = stack[stack.length - 1];
            if (types.includes(top.type) && top.indent >= currentIndent) {
                this.emitFoldRange(stack.pop()!, ranges, currentLine - 1);
            } else if (top.type !== 'feature' && top.type !== 'fragment' && top.type !== 'scenario' && top.type !== 'background' && top.indent > currentIndent) {
                this.emitFoldRange(stack.pop()!, ranges, currentLine - 1);
            } else {
                break;
            }
        }
    }

    /**
     * Close step blocks (given, when, then, and, but) at same indent.
     */
    private closeStepBlocks(
        stack: FoldBlock[],
        ranges: vscode.FoldingRange[],
        currentLine: number,
        currentIndent: number
    ): void {
        while (stack.length > 0) {
            const top = stack[stack.length - 1];
            // Close steps at same or higher indent
            if (top.type === 'step' && top.indent >= currentIndent) {
                this.emitFoldRange(stack.pop()!, ranges, currentLine - 1);
            } else if (top.type !== 'feature' && top.type !== 'fragment' && top.type !== 'scenario' && top.type !== 'background' && top.indent > currentIndent) {
                // Close nested blocks (body, conditional) with higher indent
                this.emitFoldRange(stack.pop()!, ranges, currentLine - 1);
            } else {
                break;
            }
        }
    }

    /**
     * Close conditional block (if/else if/else) at same indent.
     */
    private closeConditionalBlock(
        stack: FoldBlock[],
        ranges: vscode.FoldingRange[],
        currentLine: number,
        currentIndent: number
    ): void {
        while (stack.length > 0) {
            const top = stack[stack.length - 1];
            if (top.type === 'conditional' && top.indent === currentIndent) {
                this.emitFoldRange(stack.pop()!, ranges, currentLine - 1);
                break;
            } else if (top.indent > currentIndent) {
                this.emitFoldRange(stack.pop()!, ranges, currentLine - 1);
            } else {
                break;
            }
        }
    }

    /**
     * Close all top-level blocks (feature, fragment).
     */
    private closeAllTopLevel(
        stack: FoldBlock[],
        ranges: vscode.FoldingRange[],
        currentLine: number
    ): void {
        while (stack.length > 0) {
            const top = stack[stack.length - 1];
            if (top.type === 'feature' || top.type === 'fragment') {
                this.emitFoldRange(stack.pop()!, ranges, currentLine - 1);
            } else {
                this.emitFoldRange(stack.pop()!, ranges, currentLine - 1);
            }
        }
    }

    /**
     * Close all remaining blocks at end of document.
     */
    private closeAllBlocks(
        stack: FoldBlock[],
        ranges: vscode.FoldingRange[],
        lastLine: number
    ): void {
        while (stack.length > 0) {
            this.emitFoldRange(stack.pop()!, ranges, lastLine);
        }
    }

    /**
     * Emit a fold range if the block spans multiple lines.
     */
    private emitFoldRange(
        block: FoldBlock,
        ranges: vscode.FoldingRange[],
        endLine: number
    ): void {
        if (block.startLine < endLine) {
            const kind = block.type === 'comment' 
                ? vscode.FoldingRangeKind.Comment 
                : vscode.FoldingRangeKind.Region;
            ranges.push(new vscode.FoldingRange(block.startLine, endLine, kind));
        }
    }
}
