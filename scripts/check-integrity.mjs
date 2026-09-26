/**
 * Repository integrity tripwire.
 *
 *   node scripts/check-integrity.mjs
 *
 * On 2026-06-16 an obfuscated payload was appended to `eslint.config.mjs` as a
 * single 21 KB line, padded with whitespace so it sat off the right edge of the
 * editor and the file looked untouched. It was removed on 2026-07-13, then
 * re-injected on 2026-08-01 at 32 KB via a force-push to main.
 *
 * `eslint.config.mjs` is evaluated by every `npm run lint`, including in CI, so
 * this check must run BEFORE lint — never after.
 *
 * It fails on the shape of the attack rather than on a signature, so a rebuilt
 * payload is caught too: config files are small and their lines are short.
 */
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { Buffer } from 'node:buffer';

const ROOT = path.resolve(import.meta.dirname, '..');

/** Config files are executed at build time, which is what makes them a target. */
const EXECUTED_CONFIGS = [
    'eslint.config.mjs',
    'jest.config.ts',
    'nodemon.json',
    'tsconfig.json',
    'package.json',
];

const MAX_CONFIG_BYTES = 8 * 1024;
const MAX_LINE_LENGTH = 500;

/** Signatures of the common JavaScript obfuscators. */
const OBFUSCATION_PATTERNS = [
    { name: 'hex-encoded identifiers', re: /_0x[0-9a-f]{4,}/ },
    { name: 'large base64 blob', re: /['"][A-Za-z0-9+/]{600,}={0,2}['"]/ },
    {
        name: 'eval over decoded string',
        re: /eval\s*\(\s*(atob|Buffer\.from|unescape|decodeURIComponent)/,
    },
    { name: 'Function constructor over decoded string', re: /Function\s*\(\s*(atob|Buffer\.from)/ },
];

/** Files a compromised toolchain has hidden here before. */
const SUSPICIOUS_FILES = [
    'temp_auto_push.bat',
    'temp_interactive_push.bat',
    'branch_structure.json',
    'config.bat',
];

const failures = [];

for (const relative of EXECUTED_CONFIGS) {
    const file = path.join(ROOT, relative);
    if (!fs.existsSync(file)) continue;

    const source = fs.readFileSync(file, 'utf8');
    const bytes = Buffer.byteLength(source);

    if (bytes > MAX_CONFIG_BYTES) {
        failures.push(
            `${relative} is ${bytes} bytes — expected under ${MAX_CONFIG_BYTES}. Config files do not grow this large on their own.`,
        );
    }

    const longest = source.split('\n').reduce((max, line) => Math.max(max, line.length), 0);
    if (longest > MAX_LINE_LENGTH) {
        failures.push(
            `${relative} contains a ${longest}-character line — expected under ${MAX_LINE_LENGTH}. Minified or padded code does not belong in a config file.`,
        );
    }

    for (const { name, re } of OBFUSCATION_PATTERNS) {
        if (re.test(source)) {
            failures.push(`${relative} matches an obfuscation signature: ${name}.`);
        }
    }
}

for (const relative of SUSPICIOUS_FILES) {
    if (fs.existsSync(path.join(ROOT, relative))) {
        failures.push(
            `${relative} is present. This file has appeared alongside a compromised push before; do not commit it, and check the machine.`,
        );
    }
}

const gitignore = path.join(ROOT, '.gitignore');
if (fs.existsSync(gitignore)) {
    const ignored = fs.readFileSync(gitignore, 'utf8');
    for (const relative of SUSPICIOUS_FILES) {
        if (ignored.includes(relative)) {
            failures.push(
                `.gitignore hides ${relative}. The payload adds this line so its push script never shows up in git status.`,
            );
        }
    }
}

/**
 * The 2026-09 re-injection ran its payload from `.vscode/tasks.json` the moment the folder was
 * opened, so no npm script had to run at all.
 */
for (const relative of ['.vscode/tasks.json', '.vscode/settings.json']) {
    const file = path.join(ROOT, relative);
    if (!fs.existsSync(file)) continue;

    const source = fs.readFileSync(file, 'utf8');
    if (/folderOpen|allowAutomaticTasks/.test(source)) {
        failures.push(
            `${relative} runs a task automatically when the folder is opened. Delete it and do not open the folder in VS Code until it is gone.`,
        );
    }
}

/** Real font files start with a binary signature; the payload was plain JavaScript named `.woff2`. */
const FONT_SIGNATURES = {
    '.woff': (head) => head.toString('latin1', 0, 4) === 'wOFF',
    '.woff2': (head) => head.toString('latin1', 0, 4) === 'wOF2',
    '.ttf': (head) =>
        head.readUInt32BE(0) === 0x00010000 || head.toString('latin1', 0, 4) === 'true',
    '.otf': (head) => head.toString('latin1', 0, 4) === 'OTTO',
    '.eot': (head) => head.length > 35 && head[34] === 0x4c && head[35] === 0x50,
};
const SKIPPED_DIRECTORIES = new Set(['node_modules', '.git', 'dist', 'coverage']);

const findDisguisedFonts = (directory) => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
        const file = path.join(directory, entry.name);
        if (entry.isDirectory()) {
            if (!SKIPPED_DIRECTORIES.has(entry.name)) findDisguisedFonts(file);
            continue;
        }

        const isValidFont = FONT_SIGNATURES[path.extname(entry.name).toLowerCase()];
        if (!isValidFont) continue;

        const head = Buffer.alloc(64);
        const fd = fs.openSync(file, 'r');
        const bytesRead = fs.readSync(fd, head, 0, head.length, 0);
        fs.closeSync(fd);

        if (bytesRead < 4 || !isValidFont(head.subarray(0, bytesRead))) {
            failures.push(
                `${path.relative(ROOT, file)} is not a real font file. The payload has hidden JavaScript under font names before.`,
            );
        }
    }
};
findDisguisedFonts(ROOT);

/** A service-account key must never be tracked again. */
const credentialLike = /(-----BEGIN [A-Z ]*PRIVATE KEY-----)|("private_key"\s*:\s*"-----BEGIN)/;
const configDir = path.join(ROOT, 'src', 'config');
if (fs.existsSync(configDir)) {
    for (const name of fs.readdirSync(configDir)) {
        if (!name.endsWith('.json')) continue;
        const source = fs.readFileSync(path.join(configDir, name), 'utf8');
        if (credentialLike.test(source)) {
            failures.push(
                `src/config/${name} contains a private key. Load credentials from an environment variable instead.`,
            );
        }
    }
}

if (failures.length > 0) {
    process.stderr.write('\nIntegrity check FAILED\n\n');
    for (const failure of failures) process.stderr.write(`  - ${failure}\n`);
    process.stderr.write(
        '\nDo not run npm ci, npm run lint, or start the app until this is understood.\n\n',
    );
    process.exit(1);
}

process.stdout.write(`Integrity check passed — ${EXECUTED_CONFIGS.length} config files clean.\n`);
