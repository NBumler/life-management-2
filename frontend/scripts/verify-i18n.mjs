#!/usr/bin/env node
// backlog/015 — mechanical guard for documentation/Features/Nyelv választás.md "Hiányzó kulcs".
// Fails (exit 1) when:
//   1. hu.json and en.json don't have the identical leaf-key set (a key added to one language only),
//   2. a leaf is neither a string nor an array of strings (e.g. a number / null),
//   3. the same key carries a different set of `{{param}}` placeholders (or, for an array value such
//      as TASKS.CALENDAR.MONTH_NAMES, a different length) in the two languages,
//   4. a *literal* key used in app code (`'A.B.C' | translate`, `translate.instant('A.B.C')`, a
//      `…Key = 'A.B.C'` constant, …) exists in neither file.
//
// (4) is a static, best-effort scan: only fully literal, quoted, upper-case dotted keys are checked.
// Dynamically built keys (`'SYNC.STATE_' + state`, `'WORKOUT.DISCIPLINE.' + d`) are skipped — a
// literal ending in `_` or `.` or immediately followed by `+` is a prefix, not a key. Those are
// caught at runtime instead by the dev-only MissingTranslationHandler (core/config/
// dev-missing-translation.handler.ts). A literal that equals an *object* path (a prefix of real
// keys) is also accepted. The generated `src/app/api/` client and specs are not scanned.

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const FRONTEND = resolve(HERE, '..');
const I18N_DIR = join(FRONTEND, 'src/assets/i18n');
const APP_DIR = join(FRONTEND, 'src/app');
const LANGS = ['hu', 'en'];

const LITERAL_KEY = /(['"`])((?:[A-Z][A-Z0-9_]*\.)+[A-Z][A-Z0-9_]*)\1(\s*\+)?/g;
const PLACEHOLDER = /\{\{\s*(\w+)\s*\}\}/g;

function flatten(node, prefix, out, problems, lang) {
  for (const [k, v] of Object.entries(node)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v !== null && typeof v === 'object' && !Array.isArray(v)) {
      flatten(v, key, out, problems, lang);
    } else if (typeof v === 'string' || (Array.isArray(v) && v.every((item) => typeof item === 'string'))) {
      out.set(key, v);
    } else {
      problems.push(`${lang}.json: "${key}" is not a string (${JSON.stringify(v)})`);
    }
  }
  return out;
}

function placeholders(value) {
  const text = Array.isArray(value) ? `[${value.length}] ${value.join(' ')}` : value;
  const names = [...new Set([...text.matchAll(PLACEHOLDER)].map((m) => m[1]))].sort().join(', ');
  return Array.isArray(value) ? `array of ${value.length}${names ? `; ${names}` : ''}` : names;
}

function sourceFiles(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) {
      if (path !== join(APP_DIR, 'api')) {
        sourceFiles(path, out);
      }
    } else if (/\.(ts|html)$/.test(name) && !name.endsWith('.spec.ts')) {
      out.push(path);
    }
  }
  return out;
}

const problems = [];
const tables = Object.fromEntries(
  LANGS.map((lang) => [
    lang,
    flatten(JSON.parse(readFileSync(join(I18N_DIR, `${lang}.json`), 'utf8')), '', new Map(), problems, lang),
  ]),
);

// 1 + 3 — key-set and placeholder parity.
const [base, ...others] = LANGS;
for (const other of others) {
  for (const key of tables[base].keys()) {
    if (!tables[other].has(key)) {
      problems.push(`"${key}" is in ${base}.json but missing from ${other}.json`);
    } else if (placeholders(tables[base].get(key)) !== placeholders(tables[other].get(key))) {
      problems.push(
        `"${key}" placeholders differ: ${base} {${placeholders(tables[base].get(key))}} vs ${other} {${placeholders(tables[other].get(key))}}`,
      );
    }
  }
  for (const key of tables[other].keys()) {
    if (!tables[base].has(key)) {
      problems.push(`"${key}" is in ${other}.json but missing from ${base}.json`);
    }
  }
}

// 4 — literal keys used in code.
const known = tables[base];
const objectPaths = new Set();
for (const key of known.keys()) {
  const parts = key.split('.');
  for (let i = 1; i < parts.length; i++) {
    objectPaths.add(parts.slice(0, i).join('.'));
  }
}
for (const file of sourceFiles(APP_DIR)) {
  const text = readFileSync(file, 'utf8');
  for (const match of text.matchAll(LITERAL_KEY)) {
    const [, , key, concatenated] = match;
    if (concatenated || key.endsWith('_') || known.has(key) || objectPaths.has(key)) {
      continue;
    }
    const line = text.slice(0, match.index).split('\n').length;
    problems.push(`${relative(FRONTEND, file).split(sep).join('/')}:${line} uses "${key}", which is in no translation file`);
  }
}

if (problems.length > 0) {
  console.error(`\n[verify:i18n] ${problems.length} problem(s):\n  - ${problems.join('\n  - ')}\n`);
  process.exit(1);
}
console.log(`[verify:i18n] OK — ${known.size} keys, ${LANGS.join('/')} in parity, every literal key resolves.`);
