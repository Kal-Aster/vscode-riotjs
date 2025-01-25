import path from "path";

import { ExtensionContext, window } from "vscode";
import { LanguageClient, TransportKind } from "vscode-languageclient/node";

import registerCommands from "./registerCommands";
import state from "./state";

import activateAutoClosing from "./auto-closing/activate";

import activateDefinitionCache from "./definition-cache/activateDefinitionCache";

import activateDocumentAutoProcessing from "./document-auto-processing/activateDocumentAutoProcessing";

export default async function activate(
    context: ExtensionContext
) {
    try {
        const outputChannel = window.createOutputChannel(
            "Riot.js Extension"
        );
        context.subscriptions.push(outputChannel);
        state.outputChannel = outputChannel;

        outputChannel.appendLine("Starting activation...");

        const serverModule = context.asAbsolutePath(
            path.join("build", "server.js")
        );
        outputChannel.appendLine(
            `Server module path: ${serverModule}`
        );

        const debugOptions = {
            execArgv: ["--nolazy", "--inspect=6009"]
        };

        const serverOptions = {
            run: {
                module: serverModule,
                transport: TransportKind.ipc
            },
            debug: {
                module: serverModule,
                transport: TransportKind.ipc,
                options: debugOptions,
            },
        };

        const clientOptions = {
            documentSelector: [{ scheme: "file", language: "riotjs" }]
        };

        if (!state.riotClient) {
            outputChannel.appendLine("Creating new client...");
            state.riotClient = new LanguageClient(
                "riotLanguageServer",
                "Riot Language Server",
                serverOptions,
                clientOptions
            );

            outputChannel.appendLine("Starting client...");
            await state.riotClient.start();
            outputChannel.appendLine("Client started successfully");

            activateDocumentAutoProcessing(context);

            activateDefinitionCache(context);

            activateAutoClosing(context);

            registerCommands(context);
        } else {
            outputChannel.appendLine("Riot Extension client already exists");
        }
    } catch (error) {
        if (state.outputChannel) {
            state.outputChannel.appendLine(
                `Activation error: ${error.message}\n` +
                `Stack trace: ${error.stack}`
            );
        }
        throw error;
    }
}