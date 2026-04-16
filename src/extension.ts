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
// TODO: Diagnostics on hold until custom step detection is implemented
// See: .copilot/vscode-custom-steps/requirements.md
// import { ScenarioDiagnosticsProvider } from './diagnostics-provider';
// import { ScenarioCodeActionProvider } from './code-action-provider';

let openApiProvider: OpenApiProvider;
let fragmentProvider: FragmentProvider;
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

    // Register completion provider
    const completionProvider = new ScenarioCompletionProvider(openApiProvider, fragmentProvider);
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
    const definitionProvider = new ScenarioDefinitionProvider(openApiProvider, fragmentProvider);
    context.subscriptions.push(
        vscode.languages.registerDefinitionProvider(BERRYCRUSH_SELECTOR, definitionProvider)
    );

    // Register document link provider (clickable links with underline)
    const documentLinkProvider = new ScenarioDocumentLinkProvider(openApiProvider, fragmentProvider);
    context.subscriptions.push(
        vscode.languages.registerDocumentLinkProvider(BERRYCRUSH_SELECTOR, documentLinkProvider)
    );

    // Register hover provider
    const hoverProvider = new ScenarioHoverProvider(openApiProvider, fragmentProvider);
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
}

export function deactivate() {
    // Cleanup if needed
}
