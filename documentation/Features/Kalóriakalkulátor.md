# Kalóriakalkulátor

## Business

| | |
|---|---|
| **Státusz** | `Váz` |
| **Szülő** | [[Life Management 2.0]] |
| **Kapcsolódó** | [[Profile]], [[Edzés]], [[Mászónapló]], [[Biciklizés napló]], [[Lépésszám követés]], [[Úszás napló]], [[Étkezés]], [[Energiaegyenleg napló]], [[Backend-offline first]] |

### Célállapot

1. Az aznapi **elégetett** / aktivitás kalória kiszámítása a [[Profile]] és az aktivitás-naplók ([[Edzés]], [[Mászónapló]], [[Biciklizés napló]], [[Lépésszám követés]], [[Úszás napló]], stb.) alapján.
2. A [[Profile]] / életmód alapján a **napi kalória cél mozgás nélkül** (`baseDailyCalorieGoal`) — **nem** tartalmazza az edzésből származó égetést.
3. **Aktivitás extra** (`activityExtraKcal`) — a naplók összege külön.
4. **Összes bevihető keret aznap** = `baseDailyCalorieGoal + activityExtraKcal` (ezt olvassa pl. az [[Étkezés]] dashboard „cél + aktivitás” sora).
5. Opcionálisan: **még bevihető** = keret − aznapi bevitt ([[Étkezés]]) — megjelenhet más UI-n; az Étkezés dashboardon **nem** kötelező.
6. Diagramok az egyenlegről / idősorokról ([[Energiaegyenleg napló]]).

### Funkcionális leírás

#### Napi cél modell (SSOT az [[Étkezés]] dashboard felé)

| Érték | Jelentés |
|---|---|
| `baseDailyCalorieGoal` | Kalória cél, ha aznap nem lenne külön edzés / aktivitás-napló (Profile + életmód képlet — TBD). |
| `activityExtraKcal` | Az adott naptári nap összes kalóriát égető naplójának összege. |
| `dailyAllowanceKcal` | `baseDailyCalorieGoal + activityExtraKcal` |

Az Étkezés dashboard ezeket **csak megjeleníti**; a képlet és a naplóösszegzés itt él.

#### [[Úszás napló]] — offline kalóriaszámítás

A frontend Store és a backend szerviz az alábbi MET (Metabolic Equivalent of Task) konstansokat használja:

* `CASUAL` / `BREASTSTROKE`: 5.5 MET
* `BACKSTROKE`: 7.0 MET
* `CRAWL_FREESTYLE`: 8.0 MET
* `OPEN_WATER`: 9.5 MET
* `VIGOROUS` / `BUTTERFLY`: 11.0 MET

Számítási képlet:

$$\text{Égetett Kalória} = \text{MET} \times \text{Testsúly (kg)} \times \left( \frac{\text{durationMinutes}}{60} \right)$$

Mentéskor az érték az aznapi `activityExtraKcal` / bevihető keret részeként azonnal megjelenik (optimista UI).

### UI/UX elvárások

- Diagramok az elégetett / bevihető / egyenleg megjelenítésére
- Offline becsült érték jelölés (lásd [[Backend-offline first]])

### Megjegyzések

Jelenleg csak az úszás MET tábla van kidolgozva; más aktivitások képletei hiányoznak.

### Nyitott kérdések

- Edzés / mászás / bicikli / lépés MET vagy egyéb képletek
- BMR / TDEE képlet a [[Profile]] mezőkből

## Architektúra

### Frontend

Pure TypeScript utility a MET / keret számításhoz (pragmatikus duplikáció — [[Backend-offline first]]); Store frissítés mentéskor.

#### Backend-offline

Számítás Backend-offline és Full-offline is (pure TS utility). Becsült / csak-online értékeknél ~ / homokóra. Store frissítés helyi; szerver érvényesítés outboxolható. Lásd [[Backend-offline first]].

### Backend

Ugyanazok a konstansok / képletek a szerveroldali szervizben; OpenAPI-n keresztül visszaadott / érvényesített értékek TBD.

### Nyitott kérdések

- Hol él a kanonikus számítás (mindig mindkét oldalon szinkronban tartva)?
