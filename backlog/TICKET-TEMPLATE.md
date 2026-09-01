# Backlog jegy sablon

Minden `backlog/NNN-slug.md` jegy ezt a szerkezetet követi.
Agent skill: `.cursor/skills/task-ticket/SKILL.md`
Munkafolyamat és irányelvek: [`backlog/README.md`](README.md).

A `documentation/` vault a **jelenlegi, implementált állapot** SSOT-ja; a `backlog/`
a jövőbeli munka és minden ismert hiányosság gyűjtője. Ha egy jegy elkészül, az
érintett spec(ek) frissülnek a jelenlegi állapotra, és a jegy a `backlog/archive/`-ba
kerül.

## Típus (`type`) értékek

| Érték | Jelentés |
|---|---|
| `feature` | Új funkció, ami a specben még nincs implementált állapotként leírva |
| `change-request` | Meglévő, implementált viselkedés szándékolt megváltoztatása |
| `bug` | Az implementáció eltér attól, amit a spec jelenlegi állapotként leír |

## Állapot (`status`) értékek

| Érték | Jelentés |
|---|---|
| `backlog` | Rögzítve, még nem elkötelezett; lehet homályos |
| `deferred` | Tudatosan félretéve — „idővel lehet”, most nem |
| `ready` | Scoppolt: elfogadási kritériumok megvannak, érintett specek azonosítva |
| `in-progress` | Fejlesztés alatt |
| `blocked` | Vár valamire (a jegyben jelöld, mire) |
| `done` | Leszállítva, specek frissítve; a fájl `backlog/archive/`-ban |
| `dropped` | Nem csináljuk; a nyoma megőrizve; a fájl `backlog/archive/`-ban |

Átmenetek: `backlog → deferred | ready | dropped` · `deferred → ready | backlog | dropped`
· `ready → in-progress | backlog | dropped` · `in-progress → blocked | done | ready`
· `blocked → in-progress | dropped`. A `done` / `dropped` terminális.

## Fájlnév

`NNN-slug.md` — nullázott, növekvő egész (`001`, `002`, …), kebab-case slug.
A wikilink-cél a fájlnév: `[[001-google-calendar-export]]`.
A számozás típustól független (egy `bug` később `change-request`-té válhat).

## Sablon

```markdown
---
id: 0
type: feature                 # feature | change-request | bug
status: backlog               # backlog | deferred | ready | in-progress | blocked | done | dropped
title: Rövid cím
specs:                        # érintett documentation/ specek wikilinkként; [] ha még nincs
  - "[[...]]"
flag:                         # opcionális feature-flag; üresen, ha nincs
created: ÉÉÉÉ-HH-NN
closed:                       # ÉÉÉÉ-HH-NN, done / dropped-kor
---

# 0 — Rövid cím

## Motiváció / probléma

Miért kell; honnan jött (spec „Nem scope” blokk / audit-találat / bug-jelenség / ötlet).

## Jelenlegi működés

Mit csinál ma az app, vagy mit mond a spec most. Link a konkrét spec-szakaszra.

## Elfogadási kritériumok

- [ ] …

## Terv / döntési napló

_Szabad szöveg; a scoping és az implementáció közbeni döntések ide._

## Lezáráskor (on-done)

- Frissített specek: [[…]] — melyik szakasz, egy sor mit változott
- `IMPLEMENTATION_STATUS.md` sor: <dátum> — <mit>
- Kód: <fő package-ek / fájlok>
```

## Üres / minimál jegy

Vékony jegynél a `## Motiváció` alatti szekciók egy-egy sorra húzhatók össze, de a
címsorok maradjanak meg. A frontmatter minden kulcsa kötelező (a `flag` és a `closed`
értéke lehet üres).
