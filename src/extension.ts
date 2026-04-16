import * as vscode from 'vscode';
import { OpenApiProvider } from './openapi-provider';
import { ScenarioCompletionProvider } from './completion-provider';
import { ScenarioDefinitionProvider } from './definition-provider';
import { ScenarioHoverProvider } from './hover-provider';
import { ScenarioDocumentLinkProvider } from './document-link-provider';
import { ScenarioReferenceProvider } from './reference-provider';
import { FragmentProvider } from './fragment-provider';
import { ScenarioFormattingProvider } from './formatting-provider';
import { ScenarioFoldingRangeProvider } from './folding-provider';
import { ScenarioDocumentSymbolProvider } from './symbol-provider';
import { StepProvider } from './step-provider';

let openApiProvider: OpenApiProvider;
let fragmentProvider: FragmentProvider;
let stepProvider: StepProvider;
let outputChannel: vscode.OutputChannel;

// Document selector for both scenario and fragment languages
const BERRYCRUSH_SELECTOR: vscode.DocumentSelector = [
    { language: 'berrycrush-scenario' },
    { language: 'berrycrush-fragment' }
];

export function activate(context: vscode.ExtensionContext) {
    // Create output channel for logging (only shown when explicitly opened)
    outputChannel = vscode.window.createOutputChannel('BerryCrush');
    outputChannel.appendLine('BerryCrush extension activated');

    // Initialize providers
    openApiProvider = new OpenApiProvider();
    fragmentProvider = new FragmentProvider();
    stepProvider = new StepProvider();

    // Register completion provider
    const completionProvider = new ScenarioCompletionProvider(openApiProvider, fragmentProvider, stepProvider);
    context.subscriptions.push(
        vscode.languages.registerCompletionItemProvider(
            BERRYCRUSH_SELECTOR,
            completionProvider,
            '^', // Trigger on ^operationId
            '@', // Trigger on @tag
            '$', // Trigger on $jsonpath or ${var}
            '{', // Trigger on {{var}}
            ' '  // Trigger on space after keywords
        )
    );

    // Register definition provider (Go to Definition / Ctrl+Click)
    const definitionProvider = new ScenarioDefinitionProvider(openApiProvider, fragmentProvider, stepProvider);
    context.subscriptions.push(
        vscode.languages.registerDefinitionProvider(BERRYCRUSH_SELECTOR, definitionProvider)
    );

    // Register document link provider (clickable links with underline)
    const documentLinkProvider = new ScenarioDocumentLinkProvider(openApiProvider, fragmentProvider);
    context.subscriptions.push(
        vscode.languages.registerDocumentLinkProvider(BERRYCRUSH_SELECTOR, documentLinkProvider)
    );

    // Register hover provider
    const hoverProvider = new ScenarioHoverProvider(openApiProvider, fragmentProvider, stepProvider);
    context.subscriptions.push(
        vscode.languages.registerHoverProvider(BERRYCRUSH_SELECTOR, hoverProvider)
    );

    // Register reference provider (Find All References / Shift+F12)
    const referenceProvider = new ScenarioReferenceProvider(fragmentProvider);
    context.subscriptions.push(
        vscode.languages.registerReferenceProvider(BERRYCRUSH_SELECTOR, referenceProvider)
    );

    // Register formatting providers
    const formattingProvider = new ScenarioFormattingProvider();
    context.subscriptions.push(
        vscode.languages.registerDocumentFormattingEditProvider(BERRYCRUSH_SELECTOR, formattingProvider)
    );
    context.subscriptions.push(
        vscode.languages.registerDocumentRangeFormattingEditProvider(BERRYCRUSH_SELECTOR, formattingProvider)
    );
    context.subscriptions.push(
        vscode.languages.registerOnTypeFormattingEditProvider(
            BERRYCRUSH_SELECTOR,
            formattingProvider,
            '\n' // Trigger on Enter
        )
    );

    // Register folding provider
    const foldingProvider = new ScenarioFoldingRangeProvider();
    context.subscriptions.push(
        vscode.languages.registerFoldingRangeProvider(BERRYCRUSH_SELECTOR, foldingProvider)
    );

    // Register document symbol provider (Outline panel)
    const symbolProvider = new ScenarioDocumentSymbolProvider();
    context.subscriptions.push(
        vscode.languages.registerDocumentSymbolProvider(BERRYCRUSH_SELECTOR, symbolProvider)
    );

    // Watch for OpenAPI spec changes
    const openApiWatcher = vscode.workspace.createFileSystemWatcher('**/*.{yaml,yml,json}');
    openApiWatcher.onDidChange(() => openApiProvider.refresh());
    openApiWatcher.onDidCreate(() => openApiProvider.refresh());
    openApiWatcher.onDidDelete(() => openApiProvider.refresh());
    context.subscriptions.push(openApiWatcher);

    // Watch for fragment file changes
    const fragmentWatcher = vscode.workspace.createFileSystemWatcher('**/*.fragment');
    fragmentWatcher.onDidChange(() => fragmentProvider.refresh());
    fragmentWatcher.onDidCreate(() => fragmentProvider.refresh());
    fragmentWatcher.onDidDelete(() => fragmentProvider.refresh());
    context.subscriptions.push(fragmentWatcher);

    // Watch for Kotlin/Java source file changes (for custom step discovery)
    const stepWatcher = vscode.workspace.createFileSystemWatcher('**/*.{kt,java}');
    stepWatcher.onDidChange(() => stepProvider.refresh());
    stepWatcher.onDidCreate(() => stepProvider.refresh());
    stepWatcher.onDidDelete(() => stepProvider.refresh());
    context.subscriptions.push(stepWatcher);

    // Initialize on startup
    openApiProvider.refresh().then(() => {
        const opCount = openApiProvider.getAllOperationIds().length;
        outputChannel.appendLine(`Loaded ${opCount} operations from OpenAPI specs`);
        if (opCount > 0) {
            vscode.window.setStatusBarMessage(`BerryCrush: ${opCount} operations loaded`, 3000);
        }
    }).catch((err) => {
        outputChannel.appendLine(`ERROR loading OpenAPI: ${err}`);
    });
    
    fragmentProvider.refresh().then(() => {
        const fragCount = fragmentProvider.getFragmentNames().length;
        outputChannel.appendLine(`Loaded ${fragCount} fragments`);
    }).catch((err) => {
        outputChannel.appendLine(`ERROR loading fragments: ${err}`);
    });

    stepProvider.refresh().then(() => {
        const stepCount = stepProvider.getAllSteps().length;
        const assertCount = stepProvider.getAllAssertions().length;
        outputChannel.appendLine(`Loaded ${stepCount} custom steps, ${assertCount} assertions`);
        if (stepCount > 0 || assertCount > 0) {
            vscode.window.setStatusBarMessage(`BerryCrush: ${stepCount} steps, ${assertCount} assertions`, 3000);
        }
    }).catch((err) => {
        outputChannel.appendLine(`ERROR loading steps: ${err}`);
    });

    // Command to refresh OpenAPI spec manually
    context.subscriptions.push(
        vscode.commands.registerCommand('berrycrush.refreshOpenApi', () => {
            openApiProvider.refresh();
            vscode.window.showInformationMessage('BerryCrush: OpenAPI specs refreshed');
        })
    );

    // Command to refresh fragments manually
    context.subscriptions.push(
        vscode.commands.registerCommand('berrycrush.refreshFragments', () => {
            fragmentProvider.refresh();
            vscode.window.showInformationMessage('BerryCrush: Fragments refreshed');
        })
    );

    // Command to refresh custom steps manually
    context.subscriptions.push(
        vscode.commands.registerCommand('berrycrush.refreshSteps', () => {
            stepProvider.refresh();
            vscode.window.showInformationMessage('BerryCrush: Custom steps refreshed');
        })
    );
}

export function deactivate() {
    // Cleanup if needed
}

/**
 * Get the StepProvider instance for use by other modules
 */
export function getStepProvider(): StepProvider | undefined {
    return stepProvider;
}
