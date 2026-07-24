# Lépésszám követés

## Business

| | |
|---|---|
| **Státusz** | `Váz` |
| **Szülő** | [[Life Management 2.0]] |
| **Kapcsolódó** | [[Tápérték kalkulátor]], [[Értesítések]], [[Profile]], [[Backend-offline first]] |

### Célállapot

Napi lépésszám manuálisan és/vagy Samsung Health szinkronnal; hozzájárulás az `activityExtraKcal`-hoz ([[Tápérték kalkulátor]]).

### Funkcionális leírás

Subfeature lista:

- [[Lépésszám kézzel manuálisan megadása]]
- [[Lépésszám átszinkronizálása a Samsung Health-ből]]

#### Kapcsolat a Tápérték kalkulátorral

- Ha a követés **be van kapcsolva** (normal mód): PAL=1.2; lépéskalória:

\[\max(0,\;\text{lépésszám} - 3000) \times \text{testsúly} \times 0.00045\]

`STEP_BASELINE = 3000` fix ([[Tápérték kalkulátor]]).

- Ha a követés **ki van kapcsolva** (fallback): nincs lépéskalória; a Profile aktivitási szint adja a PAL-t; `activityExtra` csak edzésekből.

Bekapcsolt követés + aznapi 0 lépés: lépéskalória = 0 (a baseline az 1.2 PAL-ban van).

### UI/UX elvárások

_Nincs UI/UX érintettség._

### Megjegyzések

_Nincs megjegyzés._

### Nyitott kérdések

- Követés ki/be kapcsoló UI helye (Profile vs Lépésszám képernyő)

## Architektúra

### Frontend

Edzés / Menü belépő; gyerek specek; TDEE újraszámolás lépésváltozáskor.

#### Backend-offline

Helyi store + outbox. Lásd [[Backend-offline first]].

### Backend

Napi lépés entitás / upsert — Samsung Health gyerekben vázolva.

### Nyitott kérdések

Nincs nyitott kérdés.
