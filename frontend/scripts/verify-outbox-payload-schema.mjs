#!/usr/bin/env node
// backlog/080 — mechanical guard for documentation/Architektúra/Backend-offline first.md §7
// ("Payload-verziózás"). Every outbox-carried DTO (a POST/PUT body, or a nested row of one) has its
// current OpenAPI shape hashed here and compared to a committed snapshot. When a spec change removes
// or renames a field on such a DTO, this turns red and STAYS red until:
//   1. OUTBOX_PAYLOAD_SCHEMA_VERSION is bumped in src/app/core/sync/offline-queue.service.ts,
//   2. a migration step is registered per affected entity in src/app/core/sync/outbox-migrator.ts,
//   3. `npm run verify:outbox -- --write` re-accepts the snapshot (the PR diff then shows the change).
//
// #77 (AscentAttempt.failurePoint -> notes) shipped without steps 1-2 and bricked a pending write on
// a phone; this check would have caught it. Additive-only changes also flip a hash — that is fine,
// they still need a (no-op) step at the new version, matching the existing "one step per entity per
// version bump" convention.
//
// No YAML parser: the check is a transitive `$ref` file-closure + content hash. Coarser than a
// semantic field diff (whitespace-only edits to a relevant schema also trip it), but unforgeable and
// dependency-free. Re-accepting via --write is the intended, cheap resolution.

import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const FRONTEND = resolve(HERE, '..');
const SCHEMA_DIR = resolve(FRONTEND, '../backend/src/main/resources/openapi/components/schemas');
const SNAPSHOT_PATH = join(FRONTEND, 'src/app/core/sync/outbox-payload-schema.snapshot.json');
const MIGRATOR_PATH = join(FRONTEND, 'src/app/core/sync/outbox-migrator.ts');
const QUEUE_PATH = join(FRONTEND, 'src/app/core/sync/offline-queue.service.ts');

// OutboxEntityType -> the schema file whose transitive $ref closure defines the wire payload.
// Default is `<EntityType>.yaml`; only the action endpoint's request wrapper differs.
const ROOT_SCHEMA_OVERRIDES = {
  ShoppingListComplete: 'ShoppingListCompleteRequest.yaml',
};

function fail(message) {
  console.error(`\n[verify:outbox] ${message}\n`);
  process.exit(1);
}

/** The `ALL_ENTITY_TYPES` array from outbox-migrator.ts — the authoritative closed set. */
function readEntityTypes() {
  const src = readFileSync(MIGRATOR_PATH, 'utf8');
  const block = src.match(/const ALL_ENTITY_TYPES = \[([^\]]*)\]/s);
  if (!block) {
    fail(`could not locate ALL_ENTITY_TYPES in ${MIGRATOR_PATH}`);
  }
  return [...block[1].matchAll(/'([A-Za-z]+)'/g)].map((m) => m[1]);
}

function readPayloadSchemaVersion() {
  const src = readFileSync(QUEUE_PATH, 'utf8');
  const match = src.match(/OUTBOX_PAYLOAD_SCHEMA_VERSION\s*=\s*(\d+)/);
  if (!match) {
    fail(`could not read OUTBOX_PAYLOAD_SCHEMA_VERSION from ${QUEUE_PATH}`);
  }
  return Number(match[1]);
}

/** Transitive set of schema files reachable from `rootFile` via `$ref`, `rootFile` included. */
function refClosure(rootFile) {
  const seen = new Set();
  const queue = [rootFile];
  while (queue.length > 0) {
    const file = queue.shift();
    if (seen.has(file)) {
      continue;
    }
    const path = join(SCHEMA_DIR, file);
    if (!existsSync(path)) {
      fail(`schema file "${file}" referenced but not found under ${SCHEMA_DIR}`);
    }
    seen.add(file);
    const content = readFileSync(path, 'utf8');
    for (const m of content.matchAll(/\$ref:\s*['"]?([\w./-]+\.yaml)(?:#[^'"\s]*)?['"]?/g)) {
      const ref = m[1].split('/').pop();
      if (!seen.has(ref)) {
        queue.push(ref);
      }
    }
  }
  return [...seen].sort();
}

function hashEntity(rootFile) {
  const files = refClosure(rootFile);
  const hash = createHash('sha256');
  for (const file of files) {
    hash.update(file, 'utf8');
    hash.update('\0');
    hash.update(readFileSync(join(SCHEMA_DIR, file)));
    hash.update('\0');
  }
  return { hash: hash.digest('hex'), files };
}

function computeSnapshot() {
  const entityTypes = readEntityTypes();
  const entities = {};
  for (const type of entityTypes.sort()) {
    const rootFile = ROOT_SCHEMA_OVERRIDES[type] ?? `${type}.yaml`;
    entities[type] = hashEntity(rootFile).hash;
  }
  return { payloadSchemaVersion: readPayloadSchemaVersion(), entities };
}

function loadSnapshot() {
  if (!existsSync(SNAPSHOT_PATH)) {
    fail(`snapshot missing (${SNAPSHOT_PATH}). Run: npm run verify:outbox -- --write`);
  }
  return JSON.parse(readFileSync(SNAPSHOT_PATH, 'utf8'));
}

function diffEntities(current, previous) {
  const changed = [];
  for (const [type, hash] of Object.entries(current.entities)) {
    if (previous.entities[type] !== hash) {
      changed.push(type);
    }
  }
  for (const type of Object.keys(previous.entities)) {
    if (!(type in current.entities)) {
      changed.push(`${type} (removed)`);
    }
  }
  return changed.sort();
}

const mode = process.argv.includes('--write') ? 'write' : 'check';
const current = computeSnapshot();

if (mode === 'write') {
  const previous = existsSync(SNAPSHOT_PATH) ? JSON.parse(readFileSync(SNAPSHOT_PATH, 'utf8')) : null;
  if (previous) {
    const changed = diffEntities(current, previous);
    if (changed.length > 0 && current.payloadSchemaVersion === previous.payloadSchemaVersion) {
      fail(
        `refusing to write: payload shape changed for [${changed.join(', ')}] but OUTBOX_PAYLOAD_SCHEMA_VERSION ` +
          `is still ${current.payloadSchemaVersion}.\n` +
          `Bump it in offline-queue.service.ts and register a migration step per affected entity in ` +
          `outbox-migrator.ts (STEPS_BY_VERSION), then re-run --write.`,
      );
    }
  }
  writeFileSync(SNAPSHOT_PATH, `${JSON.stringify(current, null, 2)}\n`, 'utf8');
  console.log(`[verify:outbox] snapshot written — v${current.payloadSchemaVersion}, ${Object.keys(current.entities).length} entities.`);
  process.exit(0);
}

const previous = loadSnapshot();
const changed = diffEntities(current, previous);

if (changed.length > 0) {
  const bumped = current.payloadSchemaVersion > previous.payloadSchemaVersion;
  fail(
    `outbox payload shape changed for: [${changed.join(', ')}].\n` +
      (bumped
        ? `OUTBOX_PAYLOAD_SCHEMA_VERSION was bumped (${previous.payloadSchemaVersion} -> ${current.payloadSchemaVersion}). ` +
          `Confirm outbox-migrator.ts has a step per affected entity, then run: npm run verify:outbox -- --write`
        : `If this REMOVED or RENAMED a field on an outbox-carried payload, a still-pending write on an un-updated ` +
          `device will break on drain. Bump OUTBOX_PAYLOAD_SCHEMA_VERSION (offline-queue.service.ts), add a step per ` +
          `affected entity in outbox-migrator.ts (STEPS_BY_VERSION), then: npm run verify:outbox -- --write\n` +
          `(A purely additive change still needs the bump + a no-op step, matching the existing convention.)`),
  );
}

if (current.payloadSchemaVersion !== previous.payloadSchemaVersion) {
  fail(
    `payload shapes are unchanged but OUTBOX_PAYLOAD_SCHEMA_VERSION moved ` +
      `${previous.payloadSchemaVersion} -> ${current.payloadSchemaVersion}. Run: npm run verify:outbox -- --write`,
  );
}

console.log(`[verify:outbox] OK — v${current.payloadSchemaVersion}, ${Object.keys(current.entities).length} entities in sync.`);
