---
verifikalva:
verifikalt_commit:
---

# Lépésszám kézzel manuálisan megadása

## Business

| | |
|---|---|
| **Státusz** | `Kész` |
| **Szülő** | [[Lépésszám követés]] |
| **Kapcsolódó** | [[Tápérték kalkulátor]], [[Lépésszám átszinkronizálása a Samsung Health-ből]], [[Szinkronizációs központ]], [[Backend-offline first]] |

### Jelenlegi működés

Napi lépésszám kézi rögzítése / módosítása. Egy nap = egy `DailyStepLog`; a manuális mentés **mindig** felülírja a mentett `stepCount`-ot (kisebb és nagyobb értékkel is).

### Funkcionális leírás

- Mező: `stepCount` (egész, `≥ 0`) egy kiválasztott `date`-re (alap: ma).
- Mentés = upsert a [[Lépésszám követés]] `DailyStepLog` modelljére.
- Múltbeli napok szerkeszthetők ugyanezzel a szabállyal.
- Kalória: nem külön képlet — a [[Tápérték kalkulátor]] SSOT (`STEP_BASELINE` + Profile `m`).
- Konfliktus Samsunggal: manuális mindig nyer a mentés pillanatában; későbbi Samsung sync csak akkor írja felül, ha **nagyobb** értéket hoz (lásd Samsung gyerek).

### UI/UX elvárások

- A [[Lépésszám követés]] képernyőn: mai érték szerkesztő + múltbeli lista / nap választó.
- Explicit **Mentés** (vagy egyértelmű commit); offline is menthető.
- Mentés után TDEE / Étkezés keret frissül, ha számolható.

### Megjegyzések

_Nincs megjegyzés._

### Nyitott kérdések

Nincs nyitott kérdés.

## Architektúra

### Frontend

Manuális űrlap; helyi store upsert; TDEE újraszámolás.

#### Backend-offline

Olvasás/írás helyi store; create/update outbox (`OfflineQueueService`) + kliens UUID; napi `PENDING` deduplikáció. Full-offline mentés támogatott. Sync: [[Szinkronizációs központ]]. Lásd [[Backend-offline first]], [[Lépésszám követés]].

### Backend

_Nincs külön backend érintettség._ (ugyanaz a `DailyStepLog` upsert a szülőben)

### Nyitott kérdések

Nincs nyitott kérdés.
