# Tápérték kalkulátor

## Business

| | |
|---|---|
| **Státusz** | `Váz` |
| **Szülő** | [[Life Management 2.0]] |
| **Kapcsolódó** | [[Profile]], [[Edzés]], [[Mászónapló]], [[Biciklizés napló]], [[Lépésszám követés]], [[Úszás napló]], [[Étkezés]], [[Értesítések]], [[Backend-offline first]] |

### Célállapot

Korábbi név: **Kalóriakalkulátor** (átnevezve — a scope kalória + makró célok).

1. Az aznapi **aktivitás extra kalória** kiszámítása a naplókból ([[Edzés]], [[Mászónapló]], [[Biciklizés napló]], [[Lépésszám követés]], [[Úszás napló]], stb.).
2. A [[Profile]] (cél, súly, kor, nem, aktivitási szint, …) alapján:
   - **kalória cél mozgás nélkül** (`baseDailyCalorieGoal`);
   - **szintentartás** kalória (`maintenanceKcal`);
   - **fehérje / szénhidrát / zsír cél** (egyenként egy szám, g/nap — `proteinGoalG`, `carbsGoalG`, `fatGoalG`);
   - később: szintentartás makrók (`maintenanceProteinG`, …) ha kell a progress bar piros sávjához.
3. **Napi kalória keret** = `baseDailyCalorieGoal + activityExtraKcal` (`dailyAllowanceKcal`) — ezt használja az [[Étkezés]] dashboard kcal progress barja.
4. Nincs külön energiaegyenleg-feature; nincs kötelező diagram ebben a spechen. Az [[Étkezés]] dashboard jeleníti a napi progress barokat.

**Jövőbeli:** a célok szám helyett **intervallumra** váltanak — az Étkezés zöld sáv logikája ehhez igazodik majd; most fix szám + ±5% zöld.

### Funkcionális leírás

#### Napi modell (SSOT az [[Étkezés]] dashboard / [[Értesítések]] felé)

| Érték | Jelentés |
|---|---|
| `baseDailyCalorieGoal` | Kalória cél edzés / aktivitás-napló nélkül (Profile képlet — TBD). |
| `activityExtraKcal` | Az adott nap kalóriát égető naplóinak összege. |
| `dailyAllowanceKcal` | `baseDailyCalorieGoal + activityExtraKcal` — dashboard kcal **cél** (nevező). |
| `maintenanceKcal` | Szintentartás (TDEE / tartás) — dashboard kcal szín: narancs vs piros határa. |
| `proteinGoalG` / `carbsGoalG` / `fatGoalG` | Makró célok (egy szám / nap). |
| `maintenanceProteinG` / `maintenanceCarbsG` / `maintenanceFatG` | Makró szintentartás (TBD; amíg nincs, lásd [[Étkezés]] szín fallback). |

Az Étkezés dashboard ezeket **megjeleníti / színezi**; a képletek itt élnek.

#### [[Úszás napló]] — offline kalóriaszámítás

A frontend Store és a backend szerviz az alábbi MET konstansokat használja:

* `CASUAL` / `BREASTSTROKE`: 5.5 MET
* `BACKSTROKE`: 7.0 MET
* `CRAWL_FREESTYLE`: 8.0 MET
* `OPEN_WATER`: 9.5 MET
* `VIGOROUS` / `BUTTERFLY`: 11.0 MET

$$\text{Égetett Kalória} = \text{MET} \times \text{Testsúly (kg)} \times \left( \frac{\text{durationMinutes}}{60} \right)$$

Mentéskor az érték az aznapi `activityExtraKcal` / `dailyAllowanceKcal` részeként azonnal megjelenik (optimista UI).

### UI/UX elvárások

- Saját UI később (beállítások / magyarázat); a napi progress barok elsődleges helye: [[Étkezés]] dashboard.
- Offline becsült érték jelölés (~ / homokóra — [[Backend-offline first]]).

### Megjegyzések

Csak az úszás MET tábla kidolgozott; más aktivitások képletei hiányoznak. BMR / TDEE / makró képletek: Profile mezőkből — TBD.

### Nyitott kérdések

- Edzés / mászás / bicikli / lépés MET vagy egyéb képletek
- BMR / TDEE / makró cél képletek a [[Profile]] mezőkből
- Makró szintentartás értékek pontos definíciója

## Architektúra

### Frontend

Pure TypeScript utility a MET / cél / maintenance számításhoz (pragmatikus duplikáció — [[Backend-offline first]]); Store frissítés mentéskor.

#### Backend-offline

Számítás Backend-offline és Full-offline is (pure TS utility). Becsült értékeknél ~ / homokóra. Store frissítés helyi; szerver érvényesítés outboxolható. Lásd [[Backend-offline first]].

### Backend

Ugyanazok a konstansok / képletek a szerveroldali szervizben; OpenAPI-n keresztül visszaadott / érvényesített értékek TBD.

### Nyitott kérdések

- Hol él a kanonikus számítás (mindig mindkét oldalon szinkronban tartva)?
