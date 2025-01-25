import { Dirent } from "fs";
import { readdir } from "fs/promises";
import { join } from "path";

export default async function getPreloadFiles(rootPath: string) {
    let stack = (await readdir(rootPath, { withFileTypes: true })).map((dirent) => {
        return { dirent, parentPath: rootPath };
    });
    const preloadFiles = [] as Array<string>;

    while (stack.length > 0) {
        stack = (await Promise.all(
            stack.reduce((dirs, {
                dirent, parentPath
            }) => {
                const fullPath = join(parentPath, dirent.name);

                if (dirent.isDirectory()) {
                    if (dirent.name !== "node_modules") {
                        dirs.push(fullPath);
                    }
                } else if (dirent.isFile()) {
                    if (
                        dirent.name === "package.json" ||
                        dirent.name.endsWith(".ts") ||
                        dirent.name.endsWith(".riot")
                    ) {
                        preloadFiles.push(fullPath);
                    }
                }
                return dirs;
            }, [] as Array<string>).map(async dir => {
                return (await readdir(dir, { withFileTypes: true })).map((dirent) => {
                    return { dirent, parentPath: dir };
                });
            })
        )).flat();
    }

    return preloadFiles;
}