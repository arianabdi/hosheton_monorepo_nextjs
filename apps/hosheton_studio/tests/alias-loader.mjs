/**
 * Resolve hook for `node --test --experimental-strip-types`:
 * maps the `@/` TS path alias to the app root and appends `.ts`/`/index.ts`
 * for extension-less relative imports, so library code can be tested
 * without changing its imports.
 */
import { statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function candidatePaths(base) {
    return [base, `${base}.ts`, `${base}.tsx`, path.join(base, 'index.ts')];
}

function isFile(candidate) {
    try {
        return statSync(candidate).isFile();
    } catch {
        return false;
    }
}

export async function resolve(specifier, context, nextResolve) {
    const aliased = specifier.startsWith('@/');
    const relative = specifier.startsWith('./') || specifier.startsWith('../');

    if (!aliased && !relative) {
        return nextResolve(specifier, context);
    }

    const base = aliased
        ? path.join(appRoot, specifier.slice(2))
        : path.resolve(path.dirname(fileURLToPath(context.parentURL)), specifier);

    for (const candidate of candidatePaths(base)) {
        if (isFile(candidate)) {
            return nextResolve(pathToFileURL(candidate).href, context);
        }
    }

    return nextResolve(specifier, context);
}
