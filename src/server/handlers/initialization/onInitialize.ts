import {
    InitializeParams,
    InitializeResult,
    TextDocumentSyncKind
} from "vscode-languageserver/node";

import GlobalFileCache from "../../../GlobalFileCache";

import { getState } from "../../core/state";

import uriToPath from "../../utils/document/uriToPath";

import getPreloadFiles from "../../utils/getPreloadFiles";

export default async function onInitialize(
    params: InitializeParams
): Promise<InitializeResult> {
    const state = getState();
    state.connection.console.log("Initializing Language Server");

    await new Promise(resolve => setTimeout(resolve, 3000));

    state.connection.console.log("Awaited 3 seconds");

    // const rootPath = uriToPath(params.workspaceFolders != null ?
    //     params.workspaceFolders[0]!.uri :
    //     params.rootUri!
    // );
    // const start = performance.now();
    // const preloadFiles = await getPreloadFiles(rootPath);
    // await GlobalFileCache.preload(preloadFiles);
    // const end = performance.now();
    // const delta = end - start;
    // debugger;

    const { capabilities } = params;

    state.hasConfigurationCapability = !!(
        capabilities.workspace &&
        !!capabilities.workspace.configuration
    );
    state.hasWorkspaceFolderCapability = !!(
        capabilities.workspace &&
        !!capabilities.workspace.workspaceFolders
    );
    state.hasDiagnosticRelatedInformationCapability = !!(
        capabilities.textDocument &&
        capabilities.textDocument.publishDiagnostics &&
        capabilities.textDocument.publishDiagnostics.relatedInformation
    );

    return {
        capabilities: {
            textDocumentSync: TextDocumentSyncKind.Incremental,
            completionProvider: {
                resolveProvider: true,
                triggerCharacters: ["<", " ", ":", "{", "."],
            },
            hoverProvider: true,
            definitionProvider: true
        },
    };
}