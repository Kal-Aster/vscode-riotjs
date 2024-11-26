import { URI } from "vscode-uri";

import { getState } from "../state";

export default function removeRiotDocument(
    filePath: string,
    riotDocumentsRemovedInThisCall: Set<string> = new Set()
) {
    const {
        connection,
        documents,
        riotDocuments,
        tsLanguageService
    } = getState();

    
    connection.console.log(`Requested removal of "${filePath}":\n(already removed in this call:\n${[
        ...riotDocumentsRemovedInThisCall
    ].map(script => `    ${script}`).join("\n")}\n)`);
    
    if (!riotDocuments.has(filePath)) {
        connection.console.error(`Document "${filePath}" not present`);
        return;
    }

    const dependants = [
        ...tsLanguageService.getRootFilesDependantOf(filePath),
        ...tsLanguageService.getRootFilesDependantOf(`${filePath}.d.ts`)
    ].filter(script => !riotDocumentsRemovedInThisCall.has(script));
    if (dependants.length > 0) {
        connection.console.log(`Removal not possible: ${dependants.length} root files depend on "${filePath}"`);
        return filePath;
    }
    
    const dependencies = [
        ...tsLanguageService.getFullDependenciesOf(filePath),
        ...tsLanguageService.getFullDependenciesOf(`${filePath}`)
    ].filter(script => !riotDocumentsRemovedInThisCall.has(script));
    
    tsLanguageService.removeDocument(`${filePath}.d.ts`);
    tsLanguageService.removeDocument(filePath);
    riotDocuments.delete(filePath);

    riotDocumentsRemovedInThisCall.add(`${filePath}.d.ts`);
    riotDocumentsRemovedInThisCall.add(filePath);

    dependencies.forEach(dependency => {
        dependency = dependency.replace(/\.riot\.d\.ts$/, ".riot");
        if (
            !dependency.match(/\.riot$/) ||
            riotDocumentsRemovedInThisCall.has(dependency)
        ) {
            return;
        }

        const depUri = URI.file(dependency).toString();

        const depDocument = documents.get(depUri);
        if (depDocument != null) {
            return;
        }

        removeRiotDocument(
            dependency, riotDocumentsRemovedInThisCall
        );
    });

    connection.console.log(`Full removal done for "${filePath}"`);
    return filePath;
}