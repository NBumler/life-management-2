# Specifikáció sablon

Minden `documentation/**/*.md` jegyzet ezt a szerkezetet követi.
Agent skill: `.cursor/skills/documentation-spec/SKILL.md`
Kötelező offline elv: [[Backend-offline first]] (`#### Backend-offline` minden spechen).

A `documentation/` vault a **jelenlegi, implementált állapot** SSOT-ja: a specek azt
írják le, ahogy az app **ma működik**, nem tervet. Jövőbeli munka / hiányosság /
change request / bug → `backlog/` jegy (lásd `backlog/README.md`), nem a specbe.

## Frontmatter

Minden spec (kivéve ez a sablon) YAML frontmatterrel kezdődik:

```yaml
---
verifikalva: ÉÉÉÉ-HH-NN        # mikor auditálták utoljára a kód ellen
verifikalt_commit: a1b2c3d     # a HEAD rövid hash-e az audit idején
---
```

Ha a specet azóta érintő utolsó commit eltér a `verifikalt_commit`-tól, a spec
re-verifikálandó (lásd `backlog/README.md` „Staleness-ellenőrzés”).

## Státusz értékek

| Érték | Jelentés |
|---|---|
| `Kész` | A spec a jelenlegi, implementált működést írja le, auditálva a kód ellen |
| `Váz` | A spec elsodródott a kódtól, vagy egy `backlog/` jegy lezárása után átírásra vár |
| `TODO` | A leírás hiányos / stub, nem megbízható |
| `Ideiglenes` | Archív / összevont pointer-jegyzet; nem bővítendő |

## Sablon

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
| **Kapcsolódó** | [[...]], [[Backend-offline first]] vagy _Nincs kapcsolódó spec._ |

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
  (vagy: Nincs nyitott kérdés.)

## Architektúra

### Frontend

…

#### Backend-offline

…  (kötelező — hogyan működik Backend-offline / Full-offline; lásd [[Backend-offline first]])

### Backend

…

### Nyitott kérdések

- …
  (vagy: Nincs nyitott kérdés.)
```

## Üres / nincs érintettség

| Szekció | Placeholder |
|---|---|
| Jelenlegi működés / Funkcionális leírás | `_Nincs business érintettség._` |
| UI/UX elvárások | `_Nincs UI/UX érintettség._` |
| Megjegyzések | `_Nincs megjegyzés._` |
| Nyitott kérdések | `Nincs nyitott kérdés.` |
| Frontend | `_Nincs frontend érintettség._` |
| Backend-offline | `_Nincs frontend érintettség; offline elvárások: [[Backend-offline first]]._` (címsor akkor is kell) |
| Backend | `_Nincs backend érintettség._` |

Architektúra jegyzeteknél a Business tartalmi részek placeholderrel mennek; a lényeg az `## Architektúra` alatt van.
Hub / lista fájloknál a közös Backend gyakran a szülőben él, a gyerekekre szétválasztott UI mellett.

**Exempt:** ez a fájl (`SPEC-TEMPLATE.md`) és a [[Backend-offline first]] SSOT jegyzet.
