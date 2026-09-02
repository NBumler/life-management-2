---
verifikalva: 2026-09-02
verifikalt_commit: dac7f81
---

# Indoor - boulder

## Business

| | |
|---|---|
| **Státusz** | `Kész` |
| **Szülő** | [[Indoor mászónapló]] |
| **Kapcsolódó** | [[Indoor boulder admin]], [[Indoor boulder napló]], [[Nehézségi szint skálája]], [[Mászónapló]], [[Backend-offline first]] |

### Jelenlegi működés

Beltéri boulder: admin (terem + szín-sáv) + napló. **Reference kontextus** a többi mászó flow-hoz.

### Funkcionális leírás

- [[Indoor boulder admin]]
- [[Indoor boulder napló]]

Dashboard csempe: **Indoor Boulder** → napló; admin a hubból / napló gyorslinkből.

### UI/UX elvárások

_Nincs UI/UX érintettség._ (gyerek specek)

### Megjegyzések

_Nincs megjegyzés._

### Nyitott kérdések

Nincs nyitott kérdés.

## Architektúra

### Frontend

Kontextus: `INDOOR` + `BOULDER`.

#### Backend-offline

Lásd gyerekek / [[Mászónapló]] / [[Backend-offline first]].

### Backend

_Nincs backend érintettség._ (közös API: [[Mászónapló]])

### Nyitott kérdések

Nincs nyitott kérdés.
