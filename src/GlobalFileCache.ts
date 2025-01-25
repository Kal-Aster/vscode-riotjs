import { readFileSync, statSync } from "fs";
import { readFile, stat } from "fs/promises";

const globalFileCache = new Map<string, { mtimeMs: number, content: string }>();
export default class GlobalFileCache {
    static async preload(files: Array<string>) {
        await Promise.all(
            files.map(async (path) => {
                const { mtimeMs } = await stat(path);

                const content = await readFile(path, "utf-8");

                globalFileCache.set(path, {
                    mtimeMs,
                    content
                });
            })
        );
    }

    static getFileContent(path) {
        const { mtimeMs } = statSync(path);
        const storedCache = globalFileCache.get(path);
        if (storedCache != null && mtimeMs === storedCache.mtimeMs) {
            return storedCache.content;
        }
        const content = readFileSync(path, "utf-8");
        globalFileCache.set(path, { mtimeMs, content });
        return content;
    }

    static removeFile(path) {
        globalFileCache.delete(path);
    }
}