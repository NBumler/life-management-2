---
verifikalva: 2026-09-02
verifikalt_commit: 6acbd9d
---

# Lépésszám követés

## Business

| | |
|---|---|
| **Státusz** | `Kész` |
| **Szülő** | [[Life Management 2.0]] |
| **Kapcsolódó** | [[Tápérték kalkulátor]], [[Profile]], [[Értesítések]], [[Lépésszám kézzel manuálisan megadása]], [[Lépésszám átszinkronizálása a Samsung Health-ből]], [[Szinkronizációs központ]], [[Backend-offline first]] |

### Jelenlegi működés

Napi lépésszám rögzítése (manuális és/vagy Android Health Connect / Samsung Health). A lépésszám a [[Tápérték kalkulátor]] `activityExtraKcal` lépéságát hajtja. Nincs ki/be kapcsoló: ha a feature flag engedi a feature-t, a modell **mindig** aktív (PAL fix 1.2 + lépéskalória).

### Funkcionális leírás

#### Subfeature-ök

- [[Lépésszám kézzel manuálisan megadása]]
- [[Lépésszám átszinkronizálása a Samsung Health-ből]]

#### Entitás — `DailyStepLog` (1 nap = 1 rekord / user)

| Mező | Szabály |
|---|---|
| `id` | UUID, kliens |
| `date` | Naptári dátum (kliens TZ); egyedi kulcs user+date |
| `stepCount` | Egész, `≥ 0` |
| `updatedAt` | Utolsó módosítás |

Hiányzó nap = **0** lépés a Tápérték és az összehasonlítások szempontjából.

#### Kapcsolat a [[Tápérték kalkulátor]]ral (SSOT)

- `PAL` **mindig 1.2** (nincs Profile aktivitási szint, nincs fallback mód).
- Lépéskalória:

\[\max(0,\;\text{stepCount} - 3000) \times m \times 0.00045\]

`STEP_BASELINE = 3000` fix. Aznapi 0 lépés → lépéskalória 0 (a baseline a 1.2 PAL-ban van).

#### Felülírási szabály (közös)

- **Manuális mentés:** mindig felülírja az aznapi (vagy szerkesztett nap) `stepCount`-ot — kisebb és nagyobb értékkel is.
- **Samsung / Health Connect sync:** csak akkor írja felül a mentett értéket, ha a syncelt szám **nagyobb**, mint a jelenlegi (hiányzó = 0). Részletek: [[Lépésszám átszinkronizálása a Samsung Health-ből]].

#### Értesítés

20:00-kor, ha a **mai** `stepCount` a küszöb alatt van → [[Értesítések]]. A küszöb alapértéke 2000, az [[Értesítések]] finomhangolásában állítható.

### UI/UX elvárások

- Belépés: **Menü** tab (nem Edzés) — lásd [[Frontend]].
- Nincs követés ki/be kapcsoló.
- Mai érték kiemelése; múltbeli napok listája / szerkesztése (manuális gyerek).
- Samsung engedély / sync státusz a Samsung gyerek szerint.

### Megjegyzések

- iOS Health: nincs implementálva. Tervezett: `backlog/002-ios-health-lepes-forras.md`.
- Feature flag off: nincs lépés UI; TDEE továbbra is PAL=1.2, lépéság = 0 (edzés MET marad).

### Nyitott kérdések

Nincs nyitott kérdés.

## Architektúra

### Frontend

- Shell képernyő + gyerek flow-k; `DailyStepLog` helyi store.
- Lépésváltozás → TDEE utility újrafuttatás ([[Tápérték kalkulátor]]).
- OpenAPI generált kliens; mutációk offline rétegen.

#### Backend-offline

- Manuális mentés: helyi store + outbox Backend-offline és Full-offline esetén is.
- Health Connect olvasás: eszközön helyi (net / saját backend nem kell); saját backendre írás outboxba.
- Napi upsert outbox: ugyanarra a `date`-re meglévő `PENDING` payload frissítése (ne duplikáljon sort) — max-wins sync és manuális után is.
- Sync UI: [[Szinkronizációs központ]]. Lásd [[Backend-offline first]].

### Backend

- OpenAPI: `DailyStepLog` upsert user+`date` szerint (`stepCount`, UUID).
- Auth / user scope.

### Nyitott kérdések

Nincs nyitott kérdés.
