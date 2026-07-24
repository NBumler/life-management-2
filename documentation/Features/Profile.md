# Profile

## Business

| | |
|---|---|
| **Státusz** | `Kész` |
| **Szülő** | [[Life Management 2.0]] |
| **Kapcsolódó** | [[Tápérték kalkulátor]], [[Nettó fizetés kalkulátor]], [[Étkezés]], [[Lépésszám követés]], [[Biciklizés napló]], [[Szinkronizációs központ]], [[Backend-offline first]] |

### Célállapot

Felhasználónként **egy** profilrekord: személyes / cél adatok a [[Tápérték kalkulátor]] és a [[Nettó fizetés kalkulátor]] bemenetéül. A testsúly változásai **súlytörténetben** megmaradnak (későbbi diagram feature); a TDEE mindig a **jelenlegi** testsúllyal számol.

Nincs profil-kitöltöttségi gate: hiányos / üres profil mellett is szabad a navigáció. A fogyasztó képernyők (pl. [[Étkezés]]) a [[Tápérték kalkulátor]] szerint jelzik, ha nem számolható a keret (`~` / homokóra).

### Funkcionális leírás

#### Entitás — `UserProfile` (1:1 user)

| Mező | Kötelező? | Szabály |
|---|---|---|
| `id` | igen (rendszer) | UUID; kliens generálja az első mentéskor |
| `birthDate` | űrlapon: ha kitöltve, érvényes dátum | Életkor: kliens TZ, `floor` évek ([[Tápérték kalkulátor]]) |
| `sex` | ha kitöltve | `MALE` / `FEMALE` — BMR + safety floor |
| `heightCm` | ha kitöltve | 100–250 |
| `currentWeightKg` | ha kitöltve | 30–300; max 1 tizedes |
| `activityLevel` | **opcionális** | `SEDENTARY` / `LIGHT` / `MODERATE` / `ACTIVE` / `VERY_ACTIVE` → UI: Ülő / Enyhe / Mérsékelt / Aktív / Nagyon aktív. PAL **csak** fallback módban ([[Lépésszám követés]] kikapcsolva): 1.2 / 1.375 / 1.55 / 1.725 / 1.9. Normal módban TDEE PAL=1.2, ez a mező nem számít. |
| `goal` | ha kitöltve | `FAT_LOSS` / `MAINTENANCE` / `WEIGHT_GAIN` — UI: Fogyás / Megtartás / Tömegnövelés |
| `kgPerWeek` | feltételes | Pozitív szám, 0.1–1.5. **`FAT_LOSS` / `WEIGHT_GAIN`:** mentéskor kötelező, ha a `goal` ki van töltve. **`MAINTENANCE`:** mező **rejtett**, érték ignorált (Δ = 0 a [[Tápérték kalkulátor]]ban). |
| `grossMonthlySalaryHuf` | **opcionális** | Egész, `≥ 0`; [[Nettó fizetés kalkulátor]] |
| `createdAt` / `updatedAt` | rendszer | Audit |

Nincs display name / avatar / email az első körben (auth: [[Bejelentkezés]]).

**Nincs „komplett profil” kényszer** és nincs automatikus átirányítás a Profile-ra.

#### Mentés validáció

- Üres / részlegesen kitöltött profil **menthető** (és üresen is létezhet helyi store-ban).
- Kitöltött mezőkre: tartomány / enum / dátum ellenőrzés.
- Ha `goal ∈ {FAT_LOSS, WEIGHT_GAIN}` → `kgPerWeek` kötelező ezen a mentésen.
- Ha `goal = MAINTENANCE` → `kgPerWeek` nem jelenik meg; nem validáljuk.

#### Tápérték fogyasztók (hiányos profil)

A [[Tápérték kalkulátor]] (és az [[Étkezés]] progress barok) **nem crashelnek**. Ha hiányzik a számításhoz kellő bemenet (`birthDate`, `sex`, `heightCm`, `currentWeightKg`, `goal`, illetve nem-megtartásnál `kgPerWeek`), a keret / makró **nem számolható** → `~` / homokóra ([[Backend-offline first]] vizuális bizonytalanság).

Fallback PAL: ha a lépéskövetés ki van kapcsolva és `activityLevel` üres → PAL default **1.2** (Ülő), amíg a súly / BMR bemenetek megvannak; ha a súly / BMR bemenet hiányzik, továbbra is `~`.

#### Súlytörténet — `WeightHistoryEntry`

Diagram feature **későbbi** scope; az adatmodell és a CRUD **most** kell.

| Mező | Szabály |
|---|---|
| `id` | UUID, kliens |
| `recordedAt` | Dátum-idő (kliens TZ); alapértelmezés: mentés / rögzítés pillanata |
| `weightKg` | 30–300; max 1 tizedes |

**Írás Profile mentéskor:** ha `currentWeightKg` **változott** az előző mentett jelenlegi súlyhoz képest (és az új érték ki van töltve) → új history sor az új súllyal. Más mező változása **nem** nyit sort. Első súlymegadás (üres → érték) → egy history sor.

**CRUD:** a history sorok **szerkeszthetők** és **törölhetők** (hard delete + megerősítés). History szerkesztés / törlés **nem** írja át automatikusan a `currentWeightKg`-t (a jelenlegi súly csak a Profile űrlap mezője / mentése).

A [[Tápérték kalkulátor]] **csak** `currentWeightKg`-t használ; a history kizárólag napló / későbbi diagram.

### UI/UX elvárások

- Belépés: **Menü** → Profile (lásd [[Frontend]]).
- Egy űrlap: fenti mezők; **Mentés** gomb (nincs élő TDEE előnézet ezen a képernyőn).
- `goal = MAINTENANCE` → `kgPerWeek` rejtve.
- Mentés után rövid siker-feedback; store frissül → más képernyők TDEE-je újraszámol (ha számolható).
- Súlytörténet: lista a Profile képernyőn (vagy ugyaninnen megnyíló részletező); szerkesztés / törlés; **diagram nincs** az első körben.

### Megjegyzések

- Bruttó bér pénzügy-jellegű, de user-szintű → Profile-on marad.
- Δ, floor, PAL, makró: [[Tápérték kalkulátor]].
- Lépéskövetés ki/be: [[Lépésszám követés]] (nem Profile mező).

### Nyitott kérdések

Nincs nyitott kérdés.

## Architektúra

### Frontend

- Profile page: form + Mentés; `WeightHistoryEntry` lista + edit/delete.
- Helyi profile store; változás után TDEE utility újrafuttatás ([[Tápérték kalkulátor]]).
- Hiányos bemenet: fogyasztók `~` / homokóra — nincs navigációs zár.
- OpenAPI generált kliens; mutációk offline rétegen.

#### Backend-offline

- Profile és súlytörténet olvasás/írás helyi store-ból Backend-offline és Full-offline esetén is.
- Create / update / delete → outbox (`OfflineQueueService`) + kliens UUID; sync: [[Szinkronizációs központ]].
- Sync / pull hiba **nem** törölheti a helyi profilt és history-t.
- TDEE mindig kliensoldali pure számítás; hiányos helyi profil → `~`, nem crash.
- Lásd [[Backend-offline first]].

### Backend

- OpenAPI: `UserProfile` (1:1 user) + `WeightHistoryEntry` CRUD (user scope).
- `UserProfile`: fenti mezők (opcionálisak nullable-ként, kivéve `id`); `kgPerWeek` validáció goal függvényében.
- Nincs szerveroldali „profile complete” gate.
- Auth / user scope: [[Bejelentkezés]] (később).

### Nyitott kérdések

Nincs nyitott kérdés.
