import * as vscode from 'vscode';
import * as fs from 'fs';

/**
 * Represents a custom step definition
 */
export interface StepDefinition {
    /** The pattern string from @Step annotation */
    pattern: string;
    /** Regex compiled from the pattern */
    regex: RegExp;
    /** Method name that implements this step */
    methodName: string;
    /** Method parameters */
    parameters: StepParameter[];
    /** Source file path */
    filePath: string;
    /** Line number in source file (0-based) */
    lineNumber: number;
    /** VS Code location */
    location: vscode.Location;
    /** Step type: 'step' or 'assertion' */
    type: 'step' | 'assertion';
    /** Documentation/description if available */
    description?: string;
}

/**
 * Represents a parameter in a step method
 */
export interface StepParameter {
    name: string;
    type: string;
}

/**
 * Placeholder patterns for step matching
 */
const PLACEHOLDER_PATTERNS: Record<string, string> = {
    '{int}': '(\\d+)',
    '{string}': '"([^"]*)"',
    '{word}': '(\\w+)',
    '{float}': '([\\d.]+)',
    '{any}': '(.+)'
};

/**
 * Provider for discovering custom steps and assertions
 */
export class StepProvider {
    private steps: Map<string, StepDefinition> = new Map();
    private assertions: Map<string, StepDefinition> = new Map();
    private _onDidChangeSteps = new vscode.EventEmitter<void>();
    public readonly onDidChangeSteps = this._onDidChangeSteps.event;

    constructor() {}

    /**
     * Refresh step definitions by scanning source files
     */
    async refresh(): Promise<void> {
        this.steps.clear();
        this.assertions.clear();

        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (!workspaceFolder) {
            return;
        }

        // Find all Kotlin and Java source files
        const sourceFiles = await vscode.workspace.findFiles(
            '**/*.{kt,java}',
            '{**/node_modules/**,**/build/**,**/out/**,**/target/**,**/.gradle/**}'
        );

        for (const file of sourceFiles) {
            await this.parseSourceFile(file.fsPath);
        }

        console.log(`StepProvider: Loaded ${this.steps.size} steps, ${this.assertions.size} assertions`);
        this._onDidChangeSteps.fire();
    }

    /**
     * Parse a Kotlin or Java source file for step/assertion annotations
     */
    private async parseSourceFile(filePath: string): Promise<void> {
        try {
            const content = fs.readFileSync(filePath, 'utf-8');
            const lines = content.split('\n');
            const isKotlin = filePath.endsWith('.kt');

            // Check for Step import
            const hasStepImport = content.includes('import org.berrycrush.step.Step') ||
                                  content.includes('import org.berrycrush.step.*');
            
            // Check for Assertion import
            const hasAssertionImport = content.includes('import org.berrycrush.assertion.Assertion') ||
                                       content.includes('import org.berrycrush.assertion.*');

            // Skip files that don't have any BerryCrush annotations
            if (!hasStepImport && !hasAssertionImport) {
                return;
            }

            // Parse @Step annotations if present
            if (hasStepImport) {
                this.parseAnnotations(filePath, lines, isKotlin, 'Step', this.steps);
            }
            
            // Parse @Assertion annotations if present
            if (hasAssertionImport) {
                this.parseAnnotations(filePath, lines, isKotlin, 'Assertion', this.assertions);
            }

        } catch (error) {
            console.error(`Error parsing ${filePath}:`, error);
        }
    }

    /**
     * Parse annotations of a specific type from source lines
     */
    private parseAnnotations(
        filePath: string,
        lines: string[],
        isKotlin: boolean,
        annotationType: 'Step' | 'Assertion',
        targetMap: Map<string, StepDefinition>
    ): void {
        // Pattern for @Step("pattern") or @Step(pattern = "pattern")
        const annotationPatterns = [
            // Kotlin style: @Step("pattern")
            new RegExp(`@${annotationType}\\s*\\(\\s*"([^"]+)"\\s*\\)`, 'g'),
            // Kotlin style with named parameter: @Step(pattern = "pattern")
            new RegExp(`@${annotationType}\\s*\\(\\s*pattern\\s*=\\s*"([^"]+)"\\s*\\)`, 'g'),
            // Multiline annotations - look for annotation followed by pattern
            new RegExp(`@${annotationType}\\s*\\(`, 'g')
        ];

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];

            // Check for annotation
            for (const pattern of annotationPatterns) {
                pattern.lastIndex = 0; // Reset regex
                const match = pattern.exec(line);
                
                if (match) {
                    let stepPattern: string | null;

                    if (match[1]) {
                        // Direct match with pattern
                        stepPattern = match[1];
                    } else {
                        // Multi-line annotation - need to find pattern
                        stepPattern = this.extractMultilinePattern(lines, i);
                    }

                    if (stepPattern) {
                        // Find the method definition (next non-annotation line with function/fun/public/etc.)
                        const methodInfo = this.findMethodDefinition(lines, i + 1, isKotlin);
                        
                        if (methodInfo) {
                            const stepDef: StepDefinition = {
                                pattern: stepPattern,
                                regex: this.patternToRegex(stepPattern),
                                methodName: methodInfo.name,
                                parameters: methodInfo.parameters,
                                filePath,
                                lineNumber: i,
                                location: new vscode.Location(
                                    vscode.Uri.file(filePath),
                                    new vscode.Position(i, 0)
                                ),
                                type: annotationType === 'Step' ? 'step' : 'assertion',
                                description: this.extractDocumentation(lines, i)
                            };

                            targetMap.set(stepPattern, stepDef);
                        }
                    }
                }
            }
        }
    }

    /**
     * Extract pattern from multi-line annotation
     */
    private extractMultilinePattern(lines: string[], startLine: number): string | null {
        let combined = '';
        for (let i = startLine; i < Math.min(startLine + 5, lines.length); i++) {
            combined += lines[i];
            const patternMatch = combined.match(/pattern\s*=\s*"([^"]+)"|"([^"]+)"/);
            if (patternMatch) {
                return patternMatch[1] || patternMatch[2];
            }
            if (combined.includes(')')) {
                break;
            }
        }
        return null;
    }

    /**
     * Find method definition after annotation
     */
    private findMethodDefinition(
        lines: string[],
        startLine: number,
        isKotlin: boolean
    ): { name: string; parameters: StepParameter[] } | null {
        for (let i = startLine; i < Math.min(startLine + 5, lines.length); i++) {
            const line = lines[i];
            
            // Kotlin: fun methodName(params)
            // Java: public void methodName(params) or void methodName(params)
            let methodMatch: RegExpMatchArray | null;
            
            if (isKotlin) {
                methodMatch = line.match(/fun\s+(\w+)\s*\(([^)]*)\)/);
            } else {
                methodMatch = line.match(/(?:public|private|protected)?\s*(?:static)?\s*\w+\s+(\w+)\s*\(([^)]*)\)/);
            }

            if (methodMatch) {
                const name = methodMatch[1];
                const paramsStr = methodMatch[2];
                const parameters = this.parseParameters(paramsStr, isKotlin);
                return { name, parameters };
            }
        }
        return null;
    }

    /**
     * Parse method parameters
     */
    private parseParameters(paramsStr: string, isKotlin: boolean): StepParameter[] {
        const params: StepParameter[] = [];
        if (!paramsStr.trim()) {
            return params;
        }

        // Split by comma, handling generic types
        const paramParts = paramsStr.split(',');
        
        for (const part of paramParts) {
            const trimmed = part.trim();
            if (!trimmed) {
                continue;
            }

            // Skip StepContext and AssertionContext parameters
            if (trimmed.includes('StepContext') || trimmed.includes('AssertionContext')) {
                continue;
            }

            if (isKotlin) {
                // Kotlin: name: Type
                const match = trimmed.match(/(\w+)\s*:\s*(\w+)/);
                if (match) {
                    params.push({ name: match[1], type: match[2] });
                }
            } else {
                // Java: Type name
                const match = trimmed.match(/(\w+)\s+(\w+)\s*$/);
                if (match) {
                    params.push({ name: match[2], type: match[1] });
                }
            }
        }

        return params;
    }

    /**
     * Extract documentation comment before annotation
     */
    private extractDocumentation(lines: string[], annotationLine: number): string | undefined {
        const docLines: string[] = [];
        
        for (let i = annotationLine - 1; i >= 0; i--) {
            const line = lines[i].trim();
            
            if (line.startsWith('*/')) {
                // End of Javadoc/KDoc
                continue;
            } else if (line.startsWith('*')) {
                // Inside Javadoc/KDoc
                docLines.unshift(line.substring(1).trim());
            } else if (line.startsWith('/**') || line.startsWith('/*')) {
                // Start of Javadoc/KDoc
                break;
            } else if (line.startsWith('//')) {
                // Single line comment
                docLines.unshift(line.substring(2).trim());
            } else if (line.length > 0 && !line.startsWith('@')) {
                // Non-comment, non-annotation line
                break;
            }
        }

        return docLines.length > 0 ? docLines.join(' ').trim() : undefined;
    }

    /**
     * Convert step pattern to regex
     */
    public patternToRegex(pattern: string): RegExp {
        let regexStr = pattern;
        
        // Escape regex special characters (except our placeholders)
        regexStr = regexStr.replace(/[.*+?^${}()|[\]\\]/g, (match) => {
            // Don't escape our placeholder braces
            if (match === '{' || match === '}') {
                return match;
            }
            return '\\' + match;
        });

        // Replace placeholders with regex patterns
        for (const [placeholder, regex] of Object.entries(PLACEHOLDER_PATTERNS)) {
            regexStr = regexStr.replace(new RegExp(this.escapeRegex(placeholder), 'g'), regex);
        }

        return new RegExp('^' + regexStr + '$', 'i');
    }

    /**
     * Escape string for use in regex
     */
    private escapeRegex(str: string): string {
        return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    /**
     * Find a step definition that matches the given text
     */
    public findMatchingStep(text: string): StepDefinition | undefined {
        for (const step of this.steps.values()) {
            if (step.regex.test(text)) {
                return step;
            }
        }
        return undefined;
    }

    /**
     * Find an assertion definition that matches the given text
     */
    public findMatchingAssertion(text: string): StepDefinition | undefined {
        for (const assertion of this.assertions.values()) {
            if (assertion.regex.test(text)) {
                return assertion;
            }
        }
        return undefined;
    }

    /**
     * Get all step definitions
     */
    public getAllSteps(): StepDefinition[] {
        return Array.from(this.steps.values());
    }

    /**
     * Get all assertion definitions
     */
    public getAllAssertions(): StepDefinition[] {
        return Array.from(this.assertions.values());
    }

    /**
     * Get step patterns for auto-completion
     */
    public getStepPatterns(): string[] {
        return Array.from(this.steps.keys());
    }

    /**
     * Get assertion patterns for auto-completion
     */
    public getAssertionPatterns(): string[] {
        return Array.from(this.assertions.keys());
    }
}
