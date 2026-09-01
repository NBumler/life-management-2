---
name: task-ticket
description: >-
  Creates and maintains backlog tickets under backlog/ (feature / change-request /
  bug). Use when capturing new work, a change request, a bug, an open question, or
  a gap found by the documentation ↔ implementation audit; and when closing a
  ticket (promoting its result back into the documentation/ specs). Ticket format:
  backlog/TICKET-TEMPLATE.md. Workflow: backlog/README.md.
---

# Backlog ticket format

The `documentation/` vault is the SSOT for the **current, implemented** state. The
`backlog/` folder holds everything that is **not yet** true: future features, change
requests, bugs, and every gap the spec ↔ code audit turns up. Never record missing or
future behaviour inside a `documentation/` spec — open a `backlog/` ticket instead.

Human template: `backlog/TICKET-TEMPLATE.md` · Workflow & policy: `backlog/README.md`

## When to create a ticket

- A new feature that the specs do not yet describe as built.
- A deliberate change to existing, implemented behaviour (`change-request`).
- The implementation diverges from what a spec describes as current state (`bug`).
- The audit (`backlog/audit/`) classifies a spec claim as `Missing`, `Partial`, or
  `Describes-future` → **one ticket per finding**, referenced from
  `backlog/audit/ROLLUP.md`.
- A genuine open question that cannot be resolved from the code (→ `change-request`
  or `feature`, `status: backlog`).

## How to create one

1. Find the highest existing `NNN` across `backlog/` **and** `backlog/archive/`; the
   next integer is the new ticket's number.
2. Copy the template block from `backlog/TICKET-TEMPLATE.md` into
   `backlog/NNN-slug.md` (kebab-case slug).
3. Fill the frontmatter: `id` (integer, no zero-pad), `type`, `status`, `title`,
   `specs` (wikilinks into `documentation/`, or `[]`), `created` (today), optional
   `flag`. Leave `closed` empty.
4. Write at least `## Motiváció / probléma` and `## Jelenlegi működés` with substance.

## Type values

| `type` | Meaning |
|---|---|
| `feature` | New capability not yet in the specs as built |
| `change-request` | Intended change to existing implemented behaviour |
| `bug` | Implementation diverges from what a spec states as current |

## Status lifecycle

`backlog | deferred | ready | in-progress | blocked | done | dropped`

Transitions: `backlog → deferred | ready | dropped` · `deferred → ready | backlog | dropped`
· `ready → in-progress | backlog | dropped` · `in-progress → blocked | done | ready`
· `blocked → in-progress | dropped`. `done` / `dropped` are terminal → move the file
to `backlog/archive/`.

## Closing a ticket → updating the specs

Follow `backlog/README.md` "Lezárás — jegy → spec migráció" exactly:

1. Code on `master`, green test / lint / build.
2. For every `specs:` entry: rewrite `### Jelenlegi működés` (+ `### Funkcionális
   leírás` / `### UI/UX elvárások` as needed) in present tense — how it works now.
3. Update `#### Backend-offline` if mutations / outbox / external API / offline
   fallback changed.
4. Delete the resolved "Nem scope" bullet from the spec (narrow it + link a follow-up
   ticket if only partially resolved).
5. Spec frontmatter: `verifikalva:` = today, `verifikalt_commit:` =
   `git rev-parse --short HEAD`.
6. `git mv backlog/NNN-slug.md backlog/archive/`; set `status: done` (or `dropped`),
   `closed:`, fill `## Lezáráskor`.
7. Prepend one line to `IMPLEMENTATION_STATUS.md` `## Lezárt jegyek (restructure után)`.
8. Commit spec edits + ticket move + status line **together**.

## Rules

1. One `#` H1: `# <id> — <title>`.
2. Frontmatter keys are all required; `flag` and `closed` may be empty.
3. `specs` entries are `[[Wikilink]]`s that resolve to real notes under `documentation/`.
4. Never delete a ticket — close it as `done` or `dropped` and move it to `archive/`.
5. The ticket number is permanent and type-independent (a `bug` may later become a
   `change-request` without renumbering).
