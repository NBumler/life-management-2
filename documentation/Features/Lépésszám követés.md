---
verifikalva: 2026-10-01
verifikalt_commit: 4dbe414
---

# Lépésszám követés

## Business

| | |
|---|---|
| **Státusz** | `Kész` |
| **Szülő** | [[Life Management 2.0]] |
| **Kapcsolódó** | [[Tápérték kalkulátor]], [[Profile]], [[Értesítések]], [[Lépésszám kézzel manuálisan megadása]], [[Lépésszám átszinkronizálása a Samsung Health-ből]], [[Android kezdőképernyő widget]], [[Szinkronizációs központ]], [[Backend-offline first]] |

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

#### Napi lépéscél

A cél a [[Profile]] `dailyStepGoal` mezője (`backlog/136`, opcionális, 1000–100 000). Ha be van állítva, a képernyő „Ma” szekciójában a lépésszám-mező alatt haladás-sáv látszik: „{mentett mai lépés} / {cél} lépés ({%})”, a cél elérésekor zöld sáv + „Cél teljesítve”. A sáv a **mentett** (vagy Health Connectből syncelt) mai értékhez mér, nem a még el nem mentett mező-tartalomhoz; 100% fölött a sáv tele marad. A „Korábbi napok” listában a célt elért napok sora zöld ✓ ikont kap (a mai cél visszamenőleg minden napra érvényes — nincs napi cél-történet). Cél nélkül a sáv helyén tipp: „Napi lépéscélt a Profilban állíthatsz be.”, és nincs ✓ jelölés. Ugyanez a cél hajtja az [[Android kezdőképernyő widget]] lépés-haladását.

#### Értesítés

20:00-kor, ha a **mai** `stepCount` a küszöb alatt van → [[Értesítések]]. A küszöb alapértéke 2000, az [[Értesítések]] finomhangolásában állítható — ez a „kevés lépés” riasztás küszöbe, **független** a napi lépéscéltól. Az [[Értesítések]] a küszöb kiértékelése előtt (app-nyitás / előtérbe jövés / reconcile) friss Health Connect lépés-olvasást futtat a **mai** napra, hogy egy reggel óta nem syncelt helyi érték ne küldjön valótlan értesítést — lásd [[Lépésszám átszinkronizálása a Samsung Health-ből]].

### UI/UX elvárások

- Belépés: **Menü** tab (nem Edzés) — lásd [[Frontend]].
- Nincs követés ki/be kapcsoló.
- Mai érték kiemelése (cél esetén haladás-sávval); múltbeli napok listája / szerkesztése (manuális gyerek), célt elért napon ✓.
- Samsung engedély / sync státusz a Samsung gyerek szerint.

### Megjegyzések

- iOS Health: nincs implementálva. Tervezett: `backlog/002-ios-health-lepes-forras.md`.
- Feature flag off: nincs lépés UI; TDEE továbbra is PAL=1.2, lépéság = 0 (edzés MET marad).

### Nyitott kérdések

Nincs nyitott kérdés.

## Architektúra

### Frontend

- Shell képernyő + gyerek flow-k; `DailyStepLog` helyi store.
- Napi cél: `step-tracker.page.ts` `stepGoal` / `todayGoal` / `goalReached()` computed-ek a `ProfileRepository.profile()` jelből; tiszta segédek `shared/step-goal.ts` (`stepGoalOrNull`, `stepGoalProgress` — 0‥1, 1-nél levágva —, `stepGoalReached`), a widgettel közös.
- Lépésváltozás → TDEE utility újrafuttatás ([[Tápérték kalkulátor]]).
- OpenAPI generált kliens; mutációk offline rétegen.

#### Backend-offline

- Manuális mentés: helyi store + outbox Backend-offline és Full-offline esetén is.
- A napi cél a helyi profilból jön (profil-mező, outboxon syncel) — a haladás-sáv és a ✓ jelölés Full-offline is működik.
- Health Connect olvasás: eszközön helyi (net / saját backend nem kell); saját backendre írás outboxba.
- Napi upsert outbox: ugyanarra a `date`-re meglévő `PENDING` payload frissítése (ne duplikáljon sort) — max-wins sync és manuális után is.
- Sync UI: [[Szinkronizációs központ]]. Lásd [[Backend-offline first]].

### Backend

- OpenAPI: `DailyStepLog` upsert user+`date` szerint (`stepCount`, UUID).
- Auth / user scope.

### Nyitott kérdések

Nincs nyitott kérdés.
