---
name: documentation-spec
description: >-
  Formats and structures Obsidian markdown specs under documentation/.
  Use when creating, editing, migrating, or reviewing any .md file in
  documentation/ (Features, Feature - TODO, Subfeatures, Subfeatures - TODO,
  Architektúra, Architektúra - TODO, hub notes).
---

# Documentation spec format

When creating or modifying any markdown file under `documentation/`, follow this template. Prefer reformatting touched files to match; do not invent missing business/architecture content — use the empty placeholders below.

**Exempt:** `documentation/SPEC-TEMPLATE.md` (this is the human template reference, not a feature spec).

## Status values

Exactly one of:

| Érték | Jelentés |
|---|---|
| `TODO` | Specifikáció még hiányzik / stub |
| `Váz` | Van tartalom, de nem végleges |
| `Ideiglenes` | Összevont / ideiglenes spec (pl. giga-spec); szétválasztandó |
| `Kész` | Elfogadott, implementálható specifikáció |

## Required structure

Every spec file uses this heading tree (H1 title, then `## Business`, then `## Architektúra`). Do not skip sections.

```markdown
# {Cím}

## Business

| | |
|---|---|
| **Státusz** | `TODO` / `Váz` / `Ideiglenes` / `Kész` |
| **Szülő** | [[...]] vagy _Nincs szülő (hub / architektúra / gyökér)._ |
| **Kapcsolódó** | [[...]], [[...]] vagy _Nincs kapcsolódó spec._ |

### Célállapot

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

### Backend

…

### Nyitott kérdések

- …  
  _(vagy egyetlen sor: Nincs nyitott kérdés.)_
```

## Empty / not-applicable placeholders

All of the following sections are **required**. If there is nothing to write, use exactly these placeholders (do not delete the heading):

| Szekció | Üres tartalom |
|---|---|
| Célállapot | `_Nincs business érintettség._` |
| Funkcionális leírás | `_Nincs business érintettség._` |
| UI/UX elvárások | `_Nincs UI/UX érintettség._` |
| Megjegyzések | `_Nincs megjegyzés._` |
| Nyitott kérdések (Business vagy Architektúra) | `Nincs nyitott kérdés.` |
| Frontend | `_Nincs frontend érintettség._` |
| Backend | `_Nincs backend érintettség._` |

### File-type guidance

- **Architektúra jegyzetek** (`Architektúra/`, `Architektúra - TODO/`, pl. [[Backend]], [[Frontend]]): Business táblázat + célállapot / funkcionális / UI kitöltése `_Nincs business érintettség._` (és UI-nál `_Nincs UI/UX érintettség._`); a tartalom az `## Architektúra` alá kerül.
- **Hub / lista fájlok** (pl. [[Kaja]], [[Mászónapló]], [[Life Management 2.0]]): Business-ben a lista / cél; Architektúrában a közös (gyakran Backend) döntések — ha a gyerekek UI-ra szétválnak, a közös backend itt élhet.
- **Feature / subfeature**: mindkét fő szekció kitöltve; hiányzó oldal → placeholder.

## Rules

1. One `#` H1; title matches the note/file name (Obsidian wiki link target).
2. Use `[[Wikilink]]` for cross-references.
3. Order is fixed: Business → Architektúra; inside Architektúra: Frontend → Backend → Nyitott kérdések.
4. Status cell uses backticks around the value, e.g. `` `Váz` ``.
5. Do not invent specs: migrate existing wording into the right section; unknown details → Nyitott kérdések or placeholder.
6. When the user edits a doc in `documentation/`, reformat that file to this structure as part of the change (unless they explicitly ask not to).
7. Full-vault migration only when the user asks to migrate; otherwise format files you touch.

## Quick example (subfeature with backend in parent)

```markdown
# Indoor boulder napló

## Business

| | |
|---|---|
| **Státusz** | `TODO` |
| **Szülő** | [[Indoor - boulder]] |
| **Kapcsolódó** | [[Indoor boulder admin]], [[Nehézségi szint skálája]], [[Kalóriakalkulátor]] |

### Célállapot

Beltéri boulder kísérletek naplózása.

### Funkcionális leírás

_Nincs business érintettség._

### UI/UX elvárások

_Nincs UI/UX érintettség._

### Megjegyzések

_Nincs megjegyzés._

### Nyitott kérdések

- Mezőlista véglegesítése a giga-specből.

## Architektúra

### Frontend

Napló UI; nehézség input a [[Nehézségi szint skálája]] komponenssel.

### Backend

_Nincs backend érintettség._ (közös ascent API a [[Mászónapló]] szülőben)

### Nyitott kérdések

Nincs nyitott kérdés.
```

## Reference

Human-readable copy of the template: [documentation/SPEC-TEMPLATE.md](../../../documentation/SPEC-TEMPLATE.md)
