import ts from "typescript";

import { compile, CompilerOutput } from "@riotjs/compiler";
import { LanguageService, Stylesheet } from "vscode-css-languageservice";
import { Position, TextDocument } from "vscode-languageserver-textdocument"

import TypeScriptLanguageService from "../../../TypeScriptLanguageService";

import getDefaultExportedType from "../../features/ts/getDefaultExportedType";
import getInternalDeclarationOfSourceFile from "../../features/ts/getInternalDeclarationOfSourceFile";

import pathToUri from "../../utils/document/pathToUri";
import positionAtOffset from "../../utils/document/positionAtOffset";

import convertInternalDeclarationToExternal from "../../utils/riot/convertInternalDeclarationToExternal";

import ParserResult from "../../utils/riot-parser/ParserResult"
import parseContent from "../../utils/riot-parser/parseContent";

import expandTypeString from "../../utils/ts/expandTypeString";
import getParamsTypeStringOfSignature from "../../utils/ts/getParamsTypeStringOfSignature";
import getTypeWithFilteredUndefined from "../../utils/ts/getTypeWithFilteredUndefined";
import isPropertyAccessibleViaDotSyntax from "../../utils/ts/isPropertyAccessibleViaDotSyntax";

import DefinitionCache from "../definition-cache/DefinitionCache";

import defaultRiotComponentDeclaration from "./defaultRiotComponentDeclaration";
import RiotDeclarationDocumentsHandler from "./RiotDeclarationDocumentsHandler";

export default class RiotDocument {
    private parserResult: ParserResult;
    private scriptPosition: null | Position = null;

    private cssEmbeddedDocument: TextDocument | null;
    private stylesheet: Stylesheet | null = null;
    private cssPosition: null | Position = null;

    private componentProperties: Record<string, string> | null | undefined;
    private componentsProperty: ts.Type | null | undefined;
    
    private internalDeclaration: string | null = null;
    private externalDeclaration: string | null = null;

    private compiledDocument: CompilerOutput | null = null;

    readonly definitionCache: DefinitionCache;

    private version: number = 0;

    constructor(
        readonly filePath: string,
        content: string,
        tsLanguageService: TypeScriptLanguageService,
        otherRiotDocuments: Map<string, RiotDocument>
    ) {
        this.definitionCache = new DefinitionCache();
        this.update(content, tsLanguageService, otherRiotDocuments);
    }

    update(
        content: string,
        tsLanguageService: TypeScriptLanguageService,
        otherRiotDocuments: Map<string, RiotDocument>
    ) {
        this.version++;

        this.compiledDocument = null;
        this.deprecateDeclaration(tsLanguageService, otherRiotDocuments);

        const parsedContent = parseContent(content);

        if (
            parsedContent.output.javascript != null &&
            parsedContent.output.javascript.text != null
        ) {
            const {
                start, text
            } = parsedContent.output.javascript.text;
            this.scriptPosition = positionAtOffset(
                content, start
            );

            tsLanguageService.updateDocument(
                this.filePath, text
            );
        } else {
            this.scriptPosition = null;

            tsLanguageService.removeDocument(this.filePath);
        }
        
        this.cssEmbeddedDocument = null;
        this.stylesheet = null;
        this.cssPosition = null;
        if (
            parsedContent.output.css != null &&
            parsedContent.output.css.text != null
        ) {
            const {
                start, text
            } = parsedContent.output.css.text;

            this.cssEmbeddedDocument = TextDocument.create(
                pathToUri(this.filePath),
                "css", Date.now(), text
            );

            this.cssPosition = positionAtOffset(
                content, start
            );
        }

        this.parserResult = parsedContent;

        return this;
    }

    getVersion() {
        return this.version;
    }

    deprecateDeclaration(
        tsLanguageService: TypeScriptLanguageService,
        otherRiotDocuments: Map<string, RiotDocument>
    ) {
        this.componentProperties = undefined;

        this.internalDeclaration = null;
        this.externalDeclaration = null;
        [
            ...tsLanguageService.getRootFilesDependantOf(this.filePath),
            ...tsLanguageService.getRootFilesDependantOf(`${this.filePath}.d.ts`)
        ].forEach(rootFilePath => {
            const dependantRiotDocument = otherRiotDocuments.get(rootFilePath);
            if (dependantRiotDocument == null) {
                return;
            }

            dependantRiotDocument.deprecateDeclaration(
                tsLanguageService, otherRiotDocuments
            );
        });

        return this;
    }

    getCompiled() {
        if (this.compiledDocument != null) {
            return this.compiledDocument;
        }

        const compiledComponent = compile(this.getParserResult() as any);
        this.compiledDocument = compiledComponent;
        return compiledComponent;
    }

    getContent() {
        if (this.parserResult == null) {
            throw new Error("Invalid Riot Document");
        }

        return this.parserResult.data;
    }

    // should fallback to basic riot component properties!
    getComponentProperties(tsLanguageService: TypeScriptLanguageService) {
        if (this.componentProperties !== undefined) {
            return this.componentProperties;
        }

        this.componentsProperty = null;

        const sourceFile = tsLanguageService.getSourceFile(
            this.filePath
        );
        if (sourceFile == null) {
            return this.componentProperties = null;
        }

        const typeChecker = (
            tsLanguageService.getProgram().getTypeChecker()
        );

        const defaultExportedType = getDefaultExportedType(
            sourceFile, typeChecker
        );
        if (defaultExportedType == null) {
            return this.componentProperties = null;
        }

        const componentProperties: Record<string, string> = {};
        const seenTypes = new Map<number, string>();
        typeChecker.getPropertiesOfType(defaultExportedType).forEach(prop => {
            const propertyName = isPropertyAccessibleViaDotSyntax(prop.name) ? prop.name : `"${prop.name}"`;

            const isOptional = (prop.flags & ts.SymbolFlags.Optional) !== 0;
            const propType = (isOptional ?
                getTypeWithFilteredUndefined(
                    typeChecker.getTypeOfSymbolAtLocation(
                        prop,
                        prop.valueDeclaration!
                    )
                ) :
                typeChecker.getTypeOfSymbolAtLocation(
                    prop,
                    prop.valueDeclaration!
                )
            );

            if (prop.name === "components") {
                this.componentsProperty = propType;
            }

            const declaration = (
                prop.valueDeclaration ||
                prop.declarations?.[0] ||
                null
            );

            if (
                declaration != null &&
                (
                    ts.isMethodDeclaration(declaration) ||
                    ts.isMethodSignature(declaration)
                )
            ) {
                const signature = (
                    propType.getCallSignatures()[0] ||
                    typeChecker.getSignatureFromDeclaration(declaration)
                );
                if (signature) {
                    const params = getParamsTypeStringOfSignature(signature, sourceFile, typeChecker, seenTypes);
    
                    const returnType = typeChecker.getReturnTypeOfSignature(signature);
                    componentProperties[prop.name] = (`${propertyName}${isOptional ? "?" : ""}(${params}): ${expandTypeString(returnType, typeChecker, sourceFile, seenTypes)}`);
                    return;
                }
            }

            componentProperties[prop.name] = `${propertyName}${isOptional ? "?" : ""}: ${expandTypeString(propType, typeChecker, sourceFile, seenTypes)}`;
        });
        return this.componentProperties = componentProperties;
    }

    getComponentsProperty(tsLanguageService: TypeScriptLanguageService) {
        if (this.componentsProperty !== undefined) {
            return this.componentsProperty;
        }

        this.getComponentProperties(tsLanguageService);
        return this.componentsProperty!;
    }

    getCssEmbeddedDocument() {
        return this.cssEmbeddedDocument;
    }

    getCssPosition() {
        return this.cssPosition;
    }

    getInternalDeclaration() {
        if (this.internalDeclaration != null) {
            return this.internalDeclaration;
        }

        if (
            this.parserResult.output.javascript == null ||
            this.parserResult.output.javascript.text == null
        ) {
            return (
                this.internalDeclaration = defaultRiotComponentDeclaration
            );
        }

        const tsLanguageService = new TypeScriptLanguageService({
            documentsHandlers: [RiotDeclarationDocumentsHandler]
        });
        tsLanguageService.updateDocument(
            this.filePath,
            this.parserResult.output.javascript.text.text
        );
        const sourceFile = tsLanguageService.getSourceFile(this.filePath);
        if (sourceFile == null) {
            tsLanguageService.dispose();
            return (
                this.internalDeclaration = defaultRiotComponentDeclaration
            );
        }

        const internalDeclaration = getInternalDeclarationOfSourceFile(
            sourceFile, tsLanguageService.getProgram()
        ) || defaultRiotComponentDeclaration;
        this.internalDeclaration = internalDeclaration;

        tsLanguageService.dispose();
        return internalDeclaration;
    }

    getExternalDeclaration() {
        if (this.externalDeclaration != null) {
            return this.externalDeclaration;
        }
        const internalDeclaration = this.getInternalDeclaration();

        const externalDeclaration = convertInternalDeclarationToExternal(
            internalDeclaration
        );
        this.externalDeclaration = externalDeclaration;

        return externalDeclaration;
    }

    getParserResult() {
        return this.parserResult;
    }

    getScriptPosition() {
        return this.scriptPosition;
    }

    getStylesheet(
        cssLanguageService: LanguageService
    ) {
        if (this.stylesheet != null) {
            return this.stylesheet;
        }

        if (this.cssEmbeddedDocument == null) {
            return null;
        }
        
        return this.stylesheet = cssLanguageService.parseStylesheet(
            this.cssEmbeddedDocument
        );
    }

    getText() {
        return this.parserResult.data;
    }
}