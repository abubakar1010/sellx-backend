/**
 * Regenerates every client-facing listing artifact from the backend source.
 *
 *   npm run docs:listing
 *
 * Three outputs, one source of truth each:
 *
 *   scripts/print-listing-options.ts --typescript  -> docs/frontend/listing-constants.ts
 *   scripts/print-listing-options.ts --markdown    -> the generated block inside
 *                                                    docs/listing-forms-api.md
 *   scripts/docs-page/build.py                     -> docs/frontend/listing-forms-reference.html
 *
 * The markdown is spliced rather than overwritten: `listing-forms-api.md` is mostly
 * hand-written, and only the option tables under "## Option Value Reference" are
 * generated. The prose around them is preserved.
 *
 * Re-running on an unchanged tree must produce no diff.
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const ROOT = path.resolve(import.meta.dirname, '..');
const MD = path.join(ROOT, 'docs', 'listing-forms-api.md');
const TS_OUT = path.join(ROOT, 'docs', 'frontend', 'listing-constants.ts');

/** Everything between these two headings is generated. */
const START = '## Option Value Reference';
const END = '## TypeScript Constants';

const say = (line) => process.stdout.write(`${line}\n`);
const fail = (line) => {
    process.stderr.write(`${line}\n`);
    process.exit(1);
};

const runGenerator = (flag) =>
    execFileSync(
        process.execPath,
        [
            '-r',
            'ts-node/register/transpile-only',
            '-r',
            'tsconfig-paths/register',
            path.join('scripts', 'print-listing-options.ts'),
            flag,
        ],
        { cwd: ROOT, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 },
    );

const writeIfChanged = (file, next) => {
    const previous = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : null;
    const label = path.relative(ROOT, file);

    if (previous === next) {
        say(`  unchanged  ${label}`);
        return false;
    }

    fs.writeFileSync(file, next);
    say(`  written    ${label}`);
    return true;
};

// --- 1. TypeScript constants -------------------------------------------------
writeIfChanged(TS_OUT, runGenerator('--typescript'));

// --- 2. Splice the option tables into the markdown ---------------------------
const md = fs.readFileSync(MD, 'utf8');
const startAt = md.indexOf(START);
const endAt = md.indexOf(END);

if (startAt === -1 || endAt === -1 || endAt < startAt) {
    fail(`Could not find the generated block (${START} .. ${END}) in ${MD}`);
}

// Keep the section heading and its hand-written preamble: everything up to the
// first generated table heading stays, the tables themselves are replaced.
const head = md.slice(startAt, endAt);
const firstTable = head.indexOf('\n#### ');

if (firstTable === -1) {
    fail('Could not find the first "#### " table heading inside the generated block.');
}

const preamble = head.slice(0, firstTable + 1);
const tables = runGenerator('--markdown').trimEnd();

writeIfChanged(MD, `${md.slice(0, startAt)}${preamble}${tables}\n\n${md.slice(endAt)}`);

// --- 3. Rebuild the shareable HTML ------------------------------------------
const python = process.env.PYTHON ?? 'python';

try {
    execFileSync(python, [path.join('scripts', 'docs-page', 'build.py')], {
        cwd: ROOT,
        encoding: 'utf8',
        stdio: 'inherit',
    });
} catch {
    fail(
        `\nCould not run ${python}. The HTML reference was not rebuilt — ` +
            'install Python or set PYTHON=<path>, then re-run.',
    );
}
