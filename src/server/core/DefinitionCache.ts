import ts from "typescript";

import OffsetDefinitionResult from "../utils/definitions/OffsetDefinitionResult";

type TokenKey = {
    start: number; 
    end: number;
};

type ScopeInfo = {
    start: number;
    end: number;
    parent: ScopeInfo | null;
    children: ScopeInfo[];
    definitions: Array<[TokenKey, Array<OffsetDefinitionResult>]>
}

type Range = {
    start: number;
    end: number;
};

function createScope(start: number, end: number, parent: ScopeInfo | null = null): ScopeInfo {
    return { start, end, parent, children: [], definitions: [] };
}

function getBlockRange(
    node: ts.Node, sourceFile: ts.SourceFile
): { start: number; end: number } {
    const nodeEnd = node.getEnd();
    const nodeText = sourceFile.text.slice(node.getStart(), nodeEnd);
    const hasClosingBrace = nodeText.trimEnd().endsWith('}');

    if (ts.isBlock(node)) {
        return {
            start: node.statements.pos,
            end: hasClosingBrace ? nodeEnd - 1 : node.statements.end
        };
    }

    if (ts.isArrowFunction(node)) {
        const body = node.body;
        return {
            start: body.getStart(sourceFile),
            end: hasClosingBrace ? nodeEnd - 1 : body.getEnd()
        };
    }

    if (
        (
            ts.isFunctionDeclaration(node) ||
            ts.isMethodDeclaration(node)
        ) &&
        node.body
    ) {
        return {
            start: node.body.statements.pos,
            end: hasClosingBrace ? nodeEnd - 1 : node.body.statements.end
        };
    }

    if (
        ts.isIfStatement(node) || 
        ts.isWhileStatement(node) || 
        ts.isForStatement(node) ||
        ts.isForInStatement(node) ||
        ts.isForOfStatement(node)
    ) {
        const statement = 'thenStatement' in node ? node.thenStatement : node.statement;
        return {
            start: statement.getStart(sourceFile),
            end: hasClosingBrace ? nodeEnd - 1 : statement.getEnd()
        };
    }

    if (ts.isSwitchStatement(node)) {
        return {
            start: node.caseBlock.clauses.pos,
            end: hasClosingBrace ? nodeEnd - 1 : node.caseBlock.clauses.end
        };
    }

    if (ts.isCaseClause(node) || ts.isDefaultClause(node)) {
        return {
            start: node.statements.pos,
            end: hasClosingBrace ? nodeEnd - 1 : node.statements.end
        };
    }

    return {
        start: node.getStart(sourceFile),
        end: hasClosingBrace ? nodeEnd - 1 : node.getEnd()
    };
}

function shouldCreateNewScope(node: ts.Node): boolean {
    if (ts.isBlock(node)) {
        return true;
    }

    if (
        ts.isFunctionDeclaration(node) ||
        ts.isArrowFunction(node) ||
        ts.isMethodDeclaration(node) ||
        ts.isIfStatement(node) ||
        ts.isWhileStatement(node) ||
        ts.isForStatement(node) ||
        ts.isForInStatement(node) ||
        ts.isForOfStatement(node) ||
        ts.isSwitchStatement(node) ||
        ts.isCaseClause(node) ||
        ts.isDefaultClause(node)
    ) {
        let hasBlockChild = false;
        ts.forEachChild(node, child => {
            if (!ts.isBlock(child)) {
                return;
            }
            hasBlockChild = true;
            return true;
        });

        return !hasBlockChild;
    }
  
    return false;
}

function getFirstCommonParent(scopeA, scopeB) {
    if (scopeA === scopeB) {
        return scopeA;
    }

    do {
        scopeA = scopeA.parent;
        scopeB = scopeB.parent;

        if (scopeA == null || scopeB == null) {
            return null;
        }

        if (scopeA === scopeB) {
            return scopeA;
        }
    } while (true);
}

export default class DefinitionCache {
    private rootScope: ScopeInfo | null = null;

    clear() {
        this.rootScope = null;
    }

    private buildScopeTree(
        sourceFile: ts.SourceFile, 
        parentScope?: ScopeInfo,
        range?: { start: number; end: number },
        newDirectChildren?: Array<{
            start: number;
            end: number;
        }>
    ): ScopeInfo {
        const start = range?.start ?? 0;
        const end = range?.end ?? sourceFile.getEnd();
        const rootScope = parentScope ?? createScope(start, end);
        const queue: Array<[ts.Node, ScopeInfo]> = [];

        const addNodesToQueue = (node: ts.Node) => {
            if (
                node.getStart(sourceFile) > end ||
                node.getEnd() < start
            ) {
                return;
            }
            queue.push([node, rootScope]);
        };

        if (parentScope) {
            ts.forEachChild(sourceFile, addNodesToQueue);
        } else {
            ts.forEachChild(sourceFile, node => {
                queue.push([node, rootScope]);
            });
        }

        while (queue.length > 0) {
            const [node, currentScope] = queue.shift()!;

            if (shouldCreateNewScope(node)) {
                const { start, end } = getBlockRange(node, sourceFile);
                if (
                    (start > currentScope.start && end <= currentScope.end) ||
                    (start >= currentScope.start && end < currentScope.end)
                ) {
                    const newScope = createScope(start, end, currentScope);
                    currentScope.children.push(newScope);
                    if (
                        newDirectChildren != null &&
                        currentScope === rootScope
                    ) {
                        newDirectChildren.push({
                            start: newScope.start,
                            end: newScope.end
                        });
                    }

                    ts.forEachChild(node, child => {
                        queue.push([child, newScope]);
                    });
                    continue;
                }
            }

            ts.forEachChild(node, child => {
                queue.push([child, currentScope]);
            });
        }

        return rootScope;
    }

    updateForChange(
        range: Range, newText: string,
        newSourceFile: ts.SourceFile
    ) {
        if (this.rootScope == null) {
            this.rootScope = this.buildScopeTree(newSourceFile);
            return {
                start: this.rootScope.start,
                end: this.rootScope.end
            };
        }

        const affectedScope = this.findAffectedScope(range);
        if (affectedScope == null) {
            return null;
        }

        const delta = newText.length - (range.end - range.start);

        const { parent } = affectedScope;
        if (parent != null) {
            parent.children = parent.children.filter(child => {
                return (
                    child.start !== affectedScope.start ||
                    child.end !== affectedScope.end
                );
            });
        } else {
            this.rootScope = this.buildScopeTree(newSourceFile);
            return {
                start: this.rootScope.start,
                end: this.rootScope.end,
            };
        }

        const adjustPosition = (scope: ScopeInfo) => {
            if (
                scope.start < range.end &&
                scope.end > range.end
            ) {
                scope.end += delta;
            } else if (scope.start >= range.end) {
                scope.start += delta;
                scope.end += delta;
            }

            scope.definitions.forEach((definitionCache) => {
                const [key] = definitionCache;
                if (key.start >= range.end) {
                    definitionCache[0] = { start: key.start + delta, end: key.end + delta };
                } else if (key.end > range.end) {
                    definitionCache[0] = { start: key.start, end: key.end + delta };
                }
            });

            scope.children.forEach(adjustPosition);
        };
        if (this.rootScope != null) {
            adjustPosition(this.rootScope);
        }

        const newDirectChildren: Array<{
            start: number;
            end: number;
        }> = [];

        this.buildScopeTree(
            newSourceFile,
            parent,
            {
                start: parent.start,
                end: parent.end
            },
            newDirectChildren
        );
        return newDirectChildren.reduce((acc, directChildren) => {
            if (acc == null) {
                return directChildren;
            }
            return {
                start: Math.min(acc.start, directChildren.start),
                end: Math.min(acc.end, directChildren.end)
            };
        }, null as { start: number; end: number } | null);
    }

    private findAffectedScope(range: Range): ScopeInfo | null {
        if (this.rootScope == null) {
            return null;
        }

        const startScope = this.findContainingScope(range.start);
        const endScope = this.findContainingScope(range.end);

        return getFirstCommonParent(startScope, endScope);
    }

    private findContainingScope(offset: number): ScopeInfo {
        if (this.rootScope == null) {
            throw new Error('Cache not initialized');
        }

        const findInScope = (scope: ScopeInfo): ScopeInfo | undefined => {
            if (offset < scope.start || offset >= scope.end) {
                return undefined;
            }

            for (const child of scope.children) {
                const found = findInScope(child);
                if (found) return found;
            }

            return scope;
        };

        const found = findInScope(this.rootScope);
        if (!found) {
            throw new Error(`No scope found for offset ${offset}`);
        }
        return found;
    }

    getDefinition(
        offset: number,
        getDefinition: () => {
            tokenKey: TokenKey,
            definitions: Array<OffsetDefinitionResult>
        }
    ): {
        tokenKey: {
            start: number,
            end: number
        },
        definitions: Array<OffsetDefinitionResult>
    } {
        if (this.rootScope == null) {
            return getDefinition();
        }

        const scope = this.findContainingScope(offset);
        if (scope == null) {
            return getDefinition();
        }

        let definitionsMatchingEnd: typeof scope.definitions[0] | null = null;
        const definitions = scope.definitions.find((definitions) => {
            const [key] = definitions;
            if (key.start > offset) {
                return false;
            }
            if (offset > key.end) {
                return false;
            }
            if (offset === key.end) {
                definitionsMatchingEnd = definitions;
                return false;
            }
            return true;
        });
        if (definitions != null) {
            return {
                tokenKey: definitions[0],
                definitions: definitions[1]
            };
        }

        if (definitionsMatchingEnd != null) {
            return {
                tokenKey: definitionsMatchingEnd[0],
                definitions: definitionsMatchingEnd[1]
            };
        }

        const {
            tokenKey,
            definitions: uncachedDefinitions
        } = getDefinition();
        scope.definitions.push([tokenKey, uncachedDefinitions]);

        return {
            tokenKey,
            definitions: uncachedDefinitions,
        };
    }
}