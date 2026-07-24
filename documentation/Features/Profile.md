# Profile

## Business

| | |
|---|---|
| **Státusz** | `Váz` |
| **Szülő** | [[Life Management 2.0]] |
| **Kapcsolódó** | [[Tápérték kalkulátor]], [[Nettó fizetés kalkulátor]], [[Étkezés]], [[Lépésszám követés]], [[Backend-offline first]] |

### Célállapot

A felhasználó személyes / cél adatai; a [[Tápérték kalkulátor]] és a nettó bér ebből számol.

### Funkcionális leírás

Megadható adatok:

| Mező | Megjegyzés |
|---|---|
| Születési dátum | Életkor: kliens TZ ([[Tápérték kalkulátor]]) |
| Nem | `MALE` / `FEMALE` — BMR + safety floor |
| Magasság (cm) | |
| Jelenlegi testsúly (kg) | |
| Aktivitási szint | Ülő / Enyhe / Mérsékelt / Aktív / Nagyon aktív → PAL **csak fallback** módban (ha a [[Lépésszám követés]] ki van kapcsolva). Normal módban a TDEE PAL=1.2. |
| Cél | `FAT_LOSS` / `MAINTENANCE` / `WEIGHT_GAIN` (UI: Fogyás / Megtartás / Tömegnövelés) |
| Cél súlyváltozás (`kgPerWeek`) | **Pozitív** szám. `FAT_LOSS` / `WEIGHT_GAIN` esetén kötelező `> 0`; `MAINTENANCE` esetén **rejtett / ignorált**. Előjel a kalkulátorban ([[Tápérték kalkulátor]] Δ). |
| Bruttó havi bér (Ft) | Nettó kalkulátor |

CRUD a profiladatokhoz.

### UI/UX elvárások

- Menü tab (lásd [[Frontend]]).
- Megtartásnál a kg/hét mező ne jelenjen meg (vagy disabled).

### Megjegyzések

Δ és floor részletek: [[Tápérték kalkulátor]].

### Nyitott kérdések

Nincs nyitott kérdés.

## Architektúra

### Frontend

Profil űrlap; offline mentés; változás → TDEE újraszámolás.

#### Backend-offline

Profil olvasás/írás helyi store + outbox; kliens UUID. Sync: [[Szinkronizációs központ]]. Lásd [[Backend-offline first]].

### Backend

CRUD API; OpenAPI; [[Backend-offline first]].

### Nyitott kérdések

Nincs nyitott kérdés.
