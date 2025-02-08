import * as ts from "typescript";
import * as path from "path";
import * as fs from "fs";

import GlobalFileCache from "./GlobalFileCache";

namespace TypeScriptLanguageService {
    export type DocumentsHandler = {
        extension: string;
        doesFileExists(tsLanguageService: TypeScriptLanguageService, filePath: string): boolean;
        getDocumentContent(tsLanguageService: TypeScriptLanguageService, filePath: string): string | undefined;
        getDocumentVersion(tsLanguageService: TypeScriptLanguageService, filePath: string): any;
        handleDefinitionInfo(tsLanguageService: TypeScriptLanguageService, definition: ts.DefinitionInfo): boolean;
        handleReferenceEntry(tsLanguageService: TypeScriptLanguageService, reference: ts.ReferenceEntry): boolean;
        handleCompletionEntry(tsLanguageService: TypeScriptLanguageService, completionEntry: ts.CompletionEntry): boolean;
    }

    export type ServiceOptions = {
        currentDirectory?: string;
        compilerOptions?: ts.CompilerOptions;

        documentsHandlers?: Array<DocumentsHandler>
    }
}

class TypeScriptLanguageService {
    private languageService: ts.LanguageService;
    private program: ts.Program | null = null;
    private documents = new Map<string, {
        content: string,
        version: number
    }>;
    private libFolder: string;
    private currentDirectory: string;
    private compilerOptions: ts.CompilerOptions;

    private documentsHandlers: Array<TypeScriptLanguageService.DocumentsHandler>;

    private dependencies = new Map<string, Set<string>>();
    private allowedScripts: Set<string> | null = null;

    private static defaultCompilerOptions: ts.CompilerOptions = {
        target: ts.ScriptTarget.ESNext,
        module: ts.ModuleKind.ESNext,
        moduleResolution: ts.ModuleResolutionKind.NodeNext,
        allowJs: true,
        checkJs: true,
        strict: true,
        declaration: true,
        allowNonTsExtensions: true
    };

    constructor(options: TypeScriptLanguageService.ServiceOptions = {}) {
        this.currentDirectory = this.normalizePath(options.currentDirectory ?? process.cwd());
        this.compilerOptions = {
            ...TypeScriptLanguageService.defaultCompilerOptions,
            ...options.compilerOptions
        };

        this.documentsHandlers = options.documentsHandlers || [];

        this.libFolder = this.normalizePath(path.dirname(ts.sys.getExecutingFilePath()));
        this.languageService = this.createLanguageService();
    }

    private normalizePath(filePath: string) {
        return filePath.split(path.sep).join("/");
    }

    private createLanguageService(): ts.LanguageService {
        const compilerHost = ts.createCompilerHost(this.compilerOptions);
        const servicesHost = this.createServiceHost(compilerHost);

        const languageService = ts.createLanguageService(servicesHost);
        languageService.getProgram = ((getProgram) => () => {
            return this.program = getProgram.call(languageService);
        })(languageService.getProgram);

        return languageService;
    }

    private createServiceHost(compilerHost: ts.CompilerHost): ts.LanguageServiceHost {
        return {
            getScriptFileNames: () => {
                const rootFileNames = Array.from(
                    this.documents.keys()
                );
                if (this.allowedScripts != null) {
                    return rootFileNames.filter(fileName => {
                        return this.allowedScripts!.has(fileName);
                    });
                }
                return rootFileNames;
            },
            getScriptVersion: (fileName) => this.getScriptVersion(fileName),
            getScriptSnapshot: (fileName) => this.getFileSnapshot(fileName),
            getScriptKind: (fileName) => this.getScriptKind(fileName),
            getCurrentDirectory: () => this.currentDirectory,
            getCompilationSettings: () => this.compilerOptions,
            getDefaultLibFileName: (options) => {
                const libPath = ts.getDefaultLibFilePath(options);
                return this.normalizePath(libPath);
            },
            fileExists: (fileName) => this.doesFileExist(fileName),
            readFile: (fileName) => this.readFileContent(fileName),
            readDirectory: (path, extensions, exclude, include, depth) => {
                const results = compilerHost.readDirectory!(
                    path, extensions || [], exclude, include || [], depth
                );
                return results.map(result => this.normalizePath(result));
            },
            // resolveModuleNameLiterals(moduleLiterals, containingFile, redirectedReference, options, containingSourceFile, reusedNames) {
            //     console.log(containingFile);
            //     return moduleLiterals.map(({ text }) => {
            //         console.log(`resolve module literal "${text}"`);
            //         const result = ts.resolveModuleName(
            //             text,
            //             containingFile,
            //             this.compilerOptions,
            //             {
            //                 fileExists: fileName => this.doesFileExist(fileName),
            //                 readFile: fileName => this.readFileContent(fileName),
            //             }
            //         );
            
            //         return result;
            //     });
            // },
            resolveModuleNames: (moduleNames, containingFile, _, __, options) => {
                const dependencies = new Set<string>();
                const resolvedModules = moduleNames.map(moduleName => {
                    const result = ts.resolveModuleName(
                        moduleName,
                        containingFile,
                        this.compilerOptions,
                        {
                            fileExists: fileName => {
                                const doesFileExists = this.doesFileExist(fileName);
                                if (doesFileExists) {
                                    dependencies.add(fileName);
                                }
                                return doesFileExists;
                            },
                            readFile: fileName => {
                                return this.readFileContent(fileName)
                            },
                        }
                        /**
                         * , cache:
                         * 
                         * if (cache && !cache.isReadonly) {
                         *     cache.getOrCreateCacheForDirectory(containingDirectory, redirectedReference).set(moduleName, resolutionMode, result);
                         *     if (!isExternalModuleNameRelative(moduleName)) {
                         *         cache.getOrCreateCacheForNonRelativeName(moduleName, resolutionMode, redirectedReference).set(containingDirectory, result);
                         *     }
                         * }
                         */
                    );
                    
                    return result.resolvedModule;
                });
                this.dependencies.set(
                    containingFile, dependencies
                );

                return resolvedModules;
            },
            getDirectories: compilerHost.getDirectories?.bind(compilerHost)
        };
    }

    getScriptVersion(fileName: string): string {
        const normalizedFileName = this.normalizePath(fileName);

        const foundDocumentHandler = this.documentsHandlers.find(({
            extension
        }) => normalizedFileName.endsWith(extension));
        if (foundDocumentHandler != null) {
            const version = foundDocumentHandler.getDocumentVersion(this, normalizedFileName);
            if (version != null) {
                return version;
            }
        }

        if (this.documents.has(normalizedFileName)) {
            return `${this.documents.get(normalizedFileName)!.version}`;
        }

        try {
            if (fs.existsSync(normalizedFileName)) {
                return fs.statSync(normalizedFileName).mtimeMs.toString();
            }
        } catch (e) {
            console.warn(`Error accessing file ${normalizedFileName}:`, e);
        }

        return "0";
    }

    private getScriptKind(fileName: string): ts.ScriptKind {
        const normalizedFileName = this.normalizePath(fileName);
        const ext = path.extname(normalizedFileName);

        switch (ext.toLowerCase()) {
            case ".ts":
                return ts.ScriptKind.TS;
            case ".tsx":
                return ts.ScriptKind.TSX;
            case ".js":
                return ts.ScriptKind.JS;
            case ".jsx":
                return ts.ScriptKind.JSX;
            case ".json":
                return ts.ScriptKind.JSON;
            default: {
                if (this.documents.has(normalizedFileName)) {
                    return ts.ScriptKind.TS;
                }
                return ts.ScriptKind.Unknown;
            }
        }
    }

    private getFileSnapshot(fileName: string) {
        const normalizedFileName = this.normalizePath(fileName);
        const content = this.readFileContent(normalizedFileName);
        if (!content) {
            return undefined;
        }

        return ts.ScriptSnapshot.fromString(content);
    }

    private doesFileExist(fileName: string) {
        const normalizedFileName = this.normalizePath(fileName);

        const foundDocumentHandler = this.documentsHandlers.find(({
            extension
        }) => normalizedFileName.endsWith(extension));
        if (foundDocumentHandler != null) {
            if (foundDocumentHandler.doesFileExists(this, normalizedFileName)) {
                return true;
            }
        }

        if (this.documents.has(normalizedFileName)) {
            return true;
        }

        if (fs.existsSync(normalizedFileName)) {
            return true;
        }

        const libFile = this.tryGetLibFile(normalizedFileName);
        return libFile !== null;
    }

    private readFileContent(fileName: string) {
        const normalizedFileName = this.normalizePath(fileName);

        const foundDocumentHandler = this.documentsHandlers.find(({
            extension
        }) => normalizedFileName.endsWith(extension));
        if (foundDocumentHandler != null) {
            const content = foundDocumentHandler.getDocumentContent(this, normalizedFileName);
            if (content != null) {
                return content;
            }
        }

        // Check in-memory documents
        const inMemoryDocument = this.documents.get(normalizedFileName);
        if (inMemoryDocument) {
            return inMemoryDocument.content;
        }

        // Check filesystem
        if (fs.existsSync(normalizedFileName)) {
            try {
                return GlobalFileCache.getFileContent(normalizedFileName);
            } catch {
                return undefined;
            }
        }

        // Check lib files
        const libFileName = this.tryGetLibFile(normalizedFileName);
        if (!libFileName) {
            return undefined;
        }

        try {
            return GlobalFileCache.getFileContent(libFileName);
        } catch {
            return undefined;
        }
    }

    private tryGetLibFile(fileName: string) {
        const normalizedFileName = this.normalizePath(fileName);

        if (!normalizedFileName.includes(this.libFolder)) {
            return null;
        }

        const baseName = path.basename(normalizedFileName);
        if (baseName.startsWith("lib.")) {
            return null;
        }

        const libFileName = this.normalizePath(path.join(this.libFolder, `lib.${baseName}`));
        if (!fs.existsSync(libFileName)) {
            return null;
        }

        return libFileName;
    }

    public getFullDependenciesOf(
        script: string,
        fullDependenciesOfScript = new Set<string>()
    ) {
        script = this.normalizePath(script);
        if (!this.dependencies.has(script)) {
            return new Set<string>();
        }

        this.dependencies.get(script)!.forEach(dependency => {
            if (fullDependenciesOfScript.has(dependency)) {
                return;
            }
            fullDependenciesOfScript.add(dependency);
            const dependenciesOfDependency = this.getFullDependenciesOf(
                dependency, fullDependenciesOfScript
            );
            dependenciesOfDependency.forEach(dependencyOfDependency => {
                if (
                    dependencyOfDependency == script ||
                    fullDependenciesOfScript.has(dependencyOfDependency)
                ) {
                    return;
                }
                fullDependenciesOfScript.add(dependencyOfDependency);
            });
        });
        return fullDependenciesOfScript;
    }

    public restrictProgramToScripts(
        scripts: Array<string>
    ) {
        this.allowedScripts = new Set();
        scripts.forEach(script => {
            this.allowedScripts!.add(script);
            this.getFullDependenciesOf(script).forEach(dependency => {
                this.allowedScripts!.add(dependency);
            });
        });
        this.program = null;
    }

    public clearProgramRestriction() {
        this.allowedScripts = null;
        this.program = null;
    }

    public getScriptsDependantOf(fileName: string) {
        const normalizedFileName = this.normalizePath(fileName);
        const scriptsToCheck = [ normalizedFileName ];
        const scriptChecked = new Set<string>();

        const dependantScripts = new Set<string>();
        while (scriptsToCheck.length > 0) {
            const script = scriptsToCheck.shift()!;

            if (scriptChecked.has(script)) {
                continue;
            }
            scriptChecked.add(script);

            this.dependencies.forEach((deps, possibleDependant) => {
                if (!deps.has(script)) {
                    return;
                }

                dependantScripts.add(possibleDependant);
                scriptsToCheck.push(possibleDependant);
            });
        }

        return dependantScripts;
    }

    public getRootFilesDependantOf(fileName: string) {
        const dependantsScripts = this.getScriptsDependantOf(fileName);

        return new Set(
            Array.from(dependantsScripts).filter(script => this.documents.has(script))
        );
    }

    public updateDocument(fileName: string, content: string) {
        const normalizedFileName = this.normalizePath(fileName);
        if (this.documents.has(normalizedFileName)) {
            const document = this.documents.get(normalizedFileName)!;
            document.content = content;
            document.version++;
            this.documents.set(normalizedFileName, document);
        } else {
            this.documents.set(normalizedFileName, {
                content, version: 0
            });
        }
        this.program = null;
    }

    public hasDocument(fileName: string) {
        return this.documents.has(
            this.normalizePath(fileName)
        );
    }

    public removeDocument(fileName: string) {
        this.documents.delete(
            this.normalizePath(fileName)
        );
        this.program = null;
    }

    public clearDocuments() {
        this.documents.clear();
        this.program = null;
    }

    public getSourceFile(fileName: string) {
        return this.languageService.getProgram()!.getSourceFile(
            this.normalizePath(fileName)
        );
    }

    public getCompletionsAtPosition(
        fileName: string,
        position: number
    ) {
        const normalizedFileName = this.normalizePath(fileName);
        const completions = this.languageService.getCompletionsAtPosition(
            normalizedFileName,
            position,
            {
                includeCompletionsForModuleExports: true,
                includeCompletionsWithInsertText: true,
                includeAutomaticOptionalChainCompletions: true,
                includeCompletionsWithObjectLiteralMethodSnippets: true,
                includeCompletionsWithClassMemberSnippets: true,
                includeCompletionsForImportStatements: true,
                includeCompletionsWithSnippetText: true,
                includeInlayEnumMemberValueHints: true,
                includeInlayFunctionLikeReturnTypeHints: true,
                includeInlayFunctionParameterTypeHints: true,
                includeInlayParameterNameHints: "all",
                includeInlayParameterNameHintsWhenArgumentMatchesName: true,
                includeInlayPropertyDeclarationTypeHints: true,
                includeInlayVariableTypeHints: true,
                includeInlayVariableTypeHintsWhenTypeMatchesName: true,
                includePackageJsonAutoImports: "on"
            }
        );

        if (completions != null) {
            for (
                let i = completions.entries.length - 1;
                i >= 0; i--
            ) {
                const completionEntry = completions[i];

                const fileName = completionEntry.data?.fileName;
                if (fileName == null) {
                    continue;
                }

                const foundDocumentHandler = this.documentsHandlers.find(({
                    extension
                }) => fileName.endsWith(extension));
                if (foundDocumentHandler == null) {
                    continue;
                }

                const shouldKeep = foundDocumentHandler.handleCompletionEntry(
                    this, completionEntry
                );
                if (shouldKeep) {
                    continue;
                }

                completions.entries.splice(i, 1);
            }
        }

        return completions;
    }

    getCompletionEntryDetails(
        fileName,
        position,
        completionEntryName,
        formatOptions,
        source,
        preferences,
        data
    ) {
        return this.languageService?.getCompletionEntryDetails(
            this.normalizePath(fileName),
            position,
            completionEntryName,
            formatOptions,
            source,
            preferences,
            data
        );
    }
    getCompletionEntrySymbol(
        fileName,
        position,
        completionEntryName,
        formatOptions
    ) {
        return this.languageService?.getCompletionEntrySymbol(
            this.normalizePath(fileName),
            position,
            completionEntryName,
            formatOptions
        );
    }

    getQuickInfoAtPosition(
        fileName: string, position: number
    ) {
        return this.languageService?.getQuickInfoAtPosition(
            this.normalizePath(fileName),
            position
        );
    }

    getDefinitionAtPosition(fileName: string, position: number) {
        const definitionArray = this.languageService?.getDefinitionAtPosition(fileName, position);

        return definitionArray?.filter(definition => {
            const foundDocumentHandler = this.documentsHandlers.find(({
                extension
            }) => definition.fileName.endsWith(extension));
            if (foundDocumentHandler == null) {
                return true;;
            }

            return foundDocumentHandler.handleDefinitionInfo(
                this, definition
            );
        });
    }

    getReferencesAtPosition(fileName: string, position: number) {
        const referencesArray = this.languageService?.getReferencesAtPosition(fileName, position);

        return referencesArray?.filter(reference => {
            const foundDocumentHandler = this.documentsHandlers.find(({
                extension
            }) => reference.fileName.endsWith(extension));
            if (foundDocumentHandler == null) {
                return true;
            }

            return foundDocumentHandler.handleReferenceEntry(
                this, reference
            );
        });
    }

    getTypeDefinitionAtPosition(fileName: string, position: number) {
        const definitionArray = this.languageService?.getTypeDefinitionAtPosition(fileName, position);

        return definitionArray?.filter(definition => {
            const foundDocumentHandler = this.documentsHandlers.find(({
                extension
            }) => definition.fileName.endsWith(extension));
            if (foundDocumentHandler == null) {
                return true;;
            }

            return foundDocumentHandler.handleDefinitionInfo(
                this, definition
            );
        });
    }

    public dispose() {
        this.program = null;
        this.languageService.dispose();
        this.documents.clear();
        this.dependencies.clear();
        this.allowedScripts?.clear();
    }

    public getProgram() {
        if (this.program == null) {
            this.languageService!.getProgram();
        }
        return this.program!;
    }
}

export default TypeScriptLanguageService;