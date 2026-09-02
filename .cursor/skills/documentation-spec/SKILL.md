---
name: documentation-spec
description: >-
  Formats and structures Obsidian markdown specs under documentation/
  (Features, Subfeatures, Architektúra, hub notes). Enforces Backend-offline
  coverage in every spec. Use when creating, editing, migrating, or reviewing
  any .md file in documentation/. The vault describes the CURRENT, implemented
  state — future work / gaps / change requests / bugs go to backlog/ tickets,
  never into a spec.
---

# Documentation spec format

The `documentation/` vault is the **single source of truth for the current, implemented
state** of the app — specs describe how the app **works today**, in present tense, not a
plan. Anything not yet true (a new feature, a change request, a bug, a gap the audit
found, an open question that needs a decision) belongs in a **`backlog/` ticket** (see
`backlog/README.md` + `.cursor/skills/task-ticket/SKILL.md`), not in a spec.

When creating or modifying any markdown file under `documentation/`, follow this template. Prefer reformatting touched files to match; do not invent missing business/architecture content — use the empty placeholders below.

## Frontmatter (kötelező)

Every spec starts with YAML frontmatter (exempt: `SPEC-TEMPLATE.md`):

```yaml
---
verifikalva: 2026-09-02        # date this spec was last audited against the code
verifikalt_commit: a1b2c3d     # short HEAD hash at audit time
---
```

Closing a `backlog/` ticket that changed behaviour → update the affected specs' prose
**and** bump `verifikalva` / `verifikalt_commit` in the same commit. Staleness check:
`git log -1 --format=%h -- "$spec"` ≠ `verifikalt_commit` ⇒ the spec needs re-verifying.

**Exempt from this template (do not reformat as feature specs):**
- `documentation/SPEC-TEMPLATE.md` (human template reference)
- `documentation/Architektúra/Backend-offline first.md` (SSOT for offline — its whole Frontend section *is* the offline design)

## Status values

Exactly one of:

| Érték | Jelentés |
|---|---|
| `Kész` | A spec a jelenlegi, implementált működést írja le, auditálva a kód ellen |
| `Váz` | A spec elsodródott a kódtól, vagy egy `backlog/` jegy lezárása után átírásra vár |
| `TODO` | A leírás hiányos / stub, nem megbízható |
| `Ideiglenes` | Archív / összevont pointer-jegyzet; nem bővítendő |

## Required structure

Every spec file uses this heading tree (H1 title, then `## Business`, then `## Architektúra`). Do not skip sections.

```markdown
---
verifikalva: ÉÉÉÉ-HH-NN
verifikalt_commit: a1b2c3d
---

# {Cím}

## Business

| | |
|---|---|
| **Státusz** | `Kész` / `Váz` / `TODO` / `Ideiglenes` |
| **Szülő** | [[...]] vagy _Nincs szülő (hub / architektúra / gyökér)._ |
| **Kapcsolódó** | [[...]], [[...]] vagy _Nincs kapcsolódó spec._ |

### Jelenlegi működés

…

### Funkcionális leírás

…

### UI/UX elvárások

…

### Megjegyzések

…

### Nyitott kérdések

- …  
  _(vagy egyetlen sor: Nincs nyitott kérdés.)_

## Architektúra

### Frontend

…

#### Backend-offline

…

### Backend

…

### Nyitott kérdések

- …  
  _(vagy egyetlen sor: Nincs nyitott kérdés.)_
```

## Backend-offline (kötelező)

Ez a projekt **Backend-offline first**. Minden spec `### Frontend` szekciójában kötelező a `#### Backend-offline` alfejezet. SSOT: [[Backend-offline first]].

### Fogalmak (röviden)

- **Backend-offline:** van internet, de a saját backend nem elérhető.
- **Full-offline:** sem internet, sem saját backend.

### Mit kell leírni

A `#### Backend-offline` alatt **ehhez a feature/subfeature-höz** konkrétan:

1. Működik-e Backend-offline / Full-offline állapotban (olvás / írás)?
2. Írás esetén: helyi store + outbox (`OfflineQueueService`), kliens UUID — vagy miért nincs outbox.
3. Külső API (ha van): kliensről hívható-e Backend-offline-ban (net kell), Full-offline fallback.
4. Számítás / becslés: pure TS utility / bizonytalanság jelölés (`~` / homokóra), ha releváns.
5. Hivatkozás: `[[Backend-offline first]]` (és ha queue UI kell: `[[Szinkronizációs központ]]`).

### Kapcsolódó táblázat

A Business táblázat **Kapcsolódó** cellájába tedd be a `[[Backend-offline first]]` linket, ha a specnek van frontend / adat érintettsége (ne csak a tiszta „nincs frontend” backend-only stuboknál hagyd ki).

### Placeholderek (Backend-offline)

| Eset | Tartalom a `#### Backend-offline` alatt |
|---|---|
| Nincs frontend | `_Nincs frontend érintettség; offline elvárások: [[Backend-offline first]]._` |
| Csak helyi UI / parser komponens (nincs entitás CRUD) | Röviden: mindig kliensoldali; nincs outbox — pl. `_Pure client komponens; offline mindig működik. Lásd [[Backend-offline first]]._` |
| CRUD / mutáció | Helyi store + outbox + kliens UUID; sync: [[Szinkronizációs központ]]. |
| Hub / szülő | Közös elv + pointer a gyerekekre / [[Backend-offline first]]. |

**Tilos:** kihagyni a `#### Backend-offline` címsort; „majd később” nélkül stubolni nyitott kérdés nélkül, ha a feature adatot ír/olvas.

## Empty / not-applicable placeholders

All of the following sections are **required**. If there is nothing to write, use exactly these placeholders (do not delete the heading):

| Szekció | Üres tartalom |
|---|---|
| Jelenlegi működés | `_Nincs business érintettség._` |
| Funkcionális leírás | `_Nincs business érintettség._` |
| UI/UX elvárások | `_Nincs UI/UX érintettség._` |
| Megjegyzések | `_Nincs megjegyzés._` |
| Nyitott kérdések (Business vagy Architektúra) | `Nincs nyitott kérdés.` |
| Frontend | `_Nincs frontend érintettség._` |
| Backend-offline | lásd a fenti Backend-offline placeholder táblázatot (a címsor **mindig** kell) |
| Backend | `_Nincs backend érintettség._` |

### File-type guidance

- **Architektúra jegyzetek** (`Architektúra/`, pl. [[Backend]], [[Frontend]]): Business táblázat + jelenlegi működés / funkcionális / UI kitöltése `_Nincs business érintettség._` (és UI-nál `_Nincs UI/UX érintettség._`); a tartalom az `## Architektúra` alá kerül. `#### Backend-offline` kötelező (kivéve a [[Backend-offline first]] SSOT fájlt).
- **Hub / lista fájlok** (pl. [[Kaja]], [[Mászónapló]], [[Life Management 2.0]]): Business-ben a gyerek-lista + jelenlegi működés; Architektúrában a közös (gyakran Backend) döntések — ha a gyerekek UI-ra szétválnak, a közös backend itt élhet. Offline: közös elv + gyerekek.
- **Feature / subfeature**: mindkét fő szekció kitöltve; hiányzó oldal → placeholder; **Backend-offline mindig**.

### Jövőbeli munka a specekben — TILOS

- A spec csak a **jelenlegi** működést írja le. „Nem scope (MVP)”, „későbbi scope”,
  „post-MVP”, „majd később” blokk a specbe **nem** kerül.
- Ilyet találsz meglévő specben → `backlog/` jegyet nyitsz (`.cursor/skills/task-ticket`),
  és a spec legfeljebb egy `> Tervezett: [[backlog/NNN-...]]` pointert tart meg.
- Ismert hiány / eltérés a kód és a leírás közt → `backlog/` jegy (`type: bug`), nem
  a `### Nyitott kérdések`-be rejtve.
- `### Nyitott kérdések` csak akkor tart tételt, ha egy **jelenlegi** viselkedés
  ténylegesen eldöntetlen; egyébként `Nincs nyitott kérdés.`

## Rules

1. One `#` H1; title matches the note/file name (Obsidian wiki link target).
2. Use `[[Wikilink]]` for cross-references.
3. Order is fixed: Business → Architektúra; inside Architektúra: Frontend → **Backend-offline** → Backend → Nyitott kérdések.
4. Status cell uses backticks around the value, e.g. `` `Váz` ``.
5. Do not invent specs: migrate existing wording into the right section; unknown details → Nyitott kérdések or placeholder.
6. When the user edits a doc in `documentation/`, reformat that file to this structure as part of the change (unless they explicitly ask not to).
7. Full-vault migration only when the user asks to migrate; otherwise format files you touch.
8. **Never** ship or accept a `documentation/**/*.md` spec (non-exempt) without `#### Backend-offline` under Frontend.

## Quick example (subfeature with backend in parent)

```markdown
---
verifikalva: 2026-09-02
verifikalt_commit: a1b2c3d
---

# Indoor boulder napló

## Business

| | |
|---|---|
| **Státusz** | `Kész` |
| **Szülő** | [[Indoor - boulder]] |
| **Kapcsolódó** | [[Indoor boulder admin]], [[Nehézségi szint skálája]], [[Tápérték kalkulátor]], [[Backend-offline first]] |

### Jelenlegi működés

Beltéri boulder kísérletek naplózása.

### Funkcionális leírás

_Nincs business érintettség._

### UI/UX elvárások

_Nincs UI/UX érintettség._

### Megjegyzések

_Nincs megjegyzés._

### Nyitott kérdések

Nincs nyitott kérdés.

## Architektúra

### Frontend

Napló UI; nehézség input a [[Nehézségi szint skálája]] komponenssel.

#### Backend-offline

Napló create / update helyi store + outbox; kliens UUID. Backend-offline és Full-offline rögzítés támogatott. Sync: [[Szinkronizációs központ]]. Lásd [[Backend-offline first]].

### Backend

_Nincs backend érintettség._ (közös ascent API a [[Mászónapló]] szülőben)

### Nyitott kérdések

Nincs nyitott kérdés.
```

## Reference

Human-readable copy of the template: [documentation/SPEC-TEMPLATE.md](../../../documentation/SPEC-TEMPLATE.md)
Offline SSOT: [documentation/Architektúra/Backend-offline first.md](../../../documentation/Architektúra/Backend-offline%20first.md)
Future work / gaps / bugs: [backlog/README.md](../../../backlog/README.md) + skill `.cursor/skills/task-ticket/SKILL.md`
