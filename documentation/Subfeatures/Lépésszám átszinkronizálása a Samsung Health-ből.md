# Lépésszám átszinkronizálása a Samsung Health-ből

## Business

| | |
|---|---|
| **Státusz** | `Kész` |
| **Szülő** | [[Lépésszám követés]] |
| **Kapcsolódó** | [[Tápérték kalkulátor]], [[Lépésszám kézzel manuálisan megadása]], [[Értesítések]], [[Szinkronizációs központ]], [[Backend-offline first]] |

### Célállapot

Android **Health Connect** (Samsung Health adatforrás) lépésszámának átvétele, ha a user elfelejti manuálisan frissíteni. Csak **nagyobb** érték írja felül a mentettet. iOS: későbbi scope. Nincs óránkénti sync.

### Funkcionális leírás

#### Mikor kell sync

1. **App megnyitás:** lekéri a **mai** napi lépésszámot Health Connectből.
2. **Napi 08:00** (kliens TZ) háttérfeladat: lekéri a **tegnapi** lépésszámot (ha tegnap elfelejtett menteni). A mai napot a 08:00-as futás **nem** érinti.

#### Mikor kell felülírni

Összehasonlítás: hiányzó nap = **0**.

- Ha `healthConnectSteps > storedSteps` → mentés / upsert az új értékkel.
- Ha `healthConnectSteps ≤ storedSteps` → **nincs** változtatás.
- Manuális mentés ettől függetlenül mindig engedi a tetszőleges (akár kisebb) értéket; a következő app-nyitáskori sync csak akkor viszi feljebb, ha a Health Connect nagyobb.

#### Kalória

Kanonikus képlet: [[Tápérték kalkulátor]] — \(\max(0,\;steps - 3000) \times m \times 0.00045\). (A korábbi „steps × m × 0.00045” baseline nélkül **nem** érvényes.)

#### Platform

- Android Health Connect; háttér: WorkManager / `@capacitor/background-runner` a 08:00-as tegnapi synchez.
- Engedélykérés UI; megtagadás esetén csak manuális út marad.

### UI/UX elvárások

- Engedély / „utolsó sync” jelzés a [[Lépésszám követés]] képernyőn (rövid státusz).
- Nincs külön kötelező sync gomb az első körben (app nyitás + 08:00 automatikus); opcionális „Frissítés most” későbbi scope.

### Megjegyzések

A Health Connect hívás a kliensről megy (nincs backend proxy). Saját backendre írás outboxon keresztül.

### Nyitott kérdések

Nincs nyitott kérdés.

## Architektúra

### Frontend

- Health Connect plugin / Capacitor bridge; `ActivityStepService` (vagy ekvivalens): max-wins upsert a helyi `DailyStepLog`-ra.
- App lifecycle: cold/warm start → mai sync.
- Scheduled 08:00 worker → tegnapi sync.
- TDEE újraszámolás sikeres nagyobb upsert után.

#### Backend-offline

- Health Connect olvasás: Backend-offline és Full-offline is (helyi API).
- Saját backend írás: outbox; ugyanarra a napra `PENDING` payload frissítése az új (nagyobb) `stepCount`-tal.
- Sync: [[Szinkronizációs központ]]. Lásd [[Backend-offline first]], [[Lépésszám követés]].

### Backend

Ugyanaz a `DailyStepLog` upsert ([[Lépésszám követés]]); szerveroldali max-wins opcionális (kliens már max-wins-t alkalmaz).

### Nyitott kérdések

Nincs nyitott kérdés.
