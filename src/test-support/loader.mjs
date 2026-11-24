// Node resolve hook for `node --test`: maps the `@/` alias to src/, resolves
// extensionless relative .ts imports, and swaps Next/DB modules for stubs.
import {existsSync} from 'node:fs';
import {fileURLToPath, pathToFileURL} from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const srcDir = path.resolve(here, '..');

const STUBS = {
  'next/headers': path.join(here, 'stubs/next-headers.ts'),
  'next/cache': path.join(here, 'stubs/next-cache.ts'),
  '@/lib/db': path.join(here, 'stubs/db.ts'),
};

function withExtension(base) {
  for (const candidate of [base, `${base}.ts`, `${base}.tsx`, path.join(base, 'index.ts')]) {
    if (existsSync(candidate) && !candidate.endsWith(path.sep) && path.extname(candidate)) {
      return candidate;
    }
  }
  return null;
}

export async function resolve(specifier, context, nextResolve) {
  if (STUBS[specifier]) {
    return {url: pathToFileURL(STUBS[specifier]).href, shortCircuit: true};
  }
  if (specifier === 'next/server') {
    return nextResolve('next/server.js', context);
  }
  if (specifier.startsWith('@/')) {
    const file = withExtension(path.join(srcDir, specifier.slice(2)));
    if (file) return {url: pathToFileURL(file).href, shortCircuit: true};
  }
  if ((specifier.startsWith('./') || specifier.startsWith('../')) && context.parentURL?.startsWith('file:')) {
    const parentDir = path.dirname(fileURLToPath(context.parentURL));
    const file = withExtension(path.resolve(parentDir, specifier));
    if (file) return {url: pathToFileURL(file).href, shortCircuit: true};
  }
  return nextResolve(specifier, context);
}
