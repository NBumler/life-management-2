# Specifikáció sablon

Minden `documentation/**/*.md` jegyzet ezt a szerkezetet követi.
Agent skill: `.cursor/skills/documentation-spec/SKILL.md`

## Státusz értékek

| Érték | Jelentés |
|---|---|
| `TODO` | Specifikáció még hiányzik / stub |
| `Váz` | Van tartalom, de nem végleges |
| `Ideiglenes` | Összevont / ideiglenes spec; szétválasztandó |
| `Kész` | Elfogadott, implementálható specifikáció |

## Sablon

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
  (vagy: Nincs nyitott kérdés.)

## Architektúra

### Frontend

…

### Backend

…

### Nyitott kérdések

- …
  (vagy: Nincs nyitott kérdés.)
```

## Üres / nincs érintettség

| Szekció | Placeholder |
|---|---|
| Célállapot / Funkcionális leírás | `_Nincs business érintettség._` |
| UI/UX elvárások | `_Nincs UI/UX érintettség._` |
| Megjegyzések | `_Nincs megjegyzés._` |
| Nyitott kérdések | `Nincs nyitott kérdés.` |
| Frontend | `_Nincs frontend érintettség._` |
| Backend | `_Nincs backend érintettség._` |

Architektúra jegyzeteknél a Business tartalmi részek placeholderrel mennek; a lényeg az `## Architektúra` alatt van.
Hub / lista fájloknál a közös Backend gyakran a szülőben él, a gyerekekre szétválasztott UI mellett.
