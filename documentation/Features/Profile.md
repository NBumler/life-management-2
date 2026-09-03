---
verifikalva: 2026-09-03
verifikalt_commit: be28d88
---

# Profile

## Business

| | |
|---|---|
| **Státusz** | `Kész` |
| **Szülő** | [[Life Management 2.0]] |
| **Kapcsolódó** | [[Tápérték kalkulátor]], [[Nettó fizetés kalkulátor]], [[Étkezés]], [[Lépésszám követés]], [[Biciklizés napló]], [[Szinkronizációs központ]], [[Bejelentkezés]], [[Backend-offline first]] |

### Jelenlegi működés

Felhasználónként **egy** profilrekord: személyes / cél adatok a [[Tápérték kalkulátor]] és a [[Nettó fizetés kalkulátor]] bemenetéül. A testsúly változásai **súlytörténetben** megmaradnak (a diagram-megjelenítés tervezett); a TDEE mindig a **jelenlegi** testsúllyal számol.

Nincs profil-kitöltöttségi gate: hiányos / üres profil mellett is szabad a navigáció. A fogyasztó képernyők (pl. [[Étkezés]]) a [[Tápérték kalkulátor]] szerint jelzik, ha nem számolható a keret (`~` / homokóra).

### Funkcionális leírás

#### Entitás — `UserProfile` (1:1 user)

| Mező | Kötelező? | Szabály |
|---|---|---|
| `id` | igen (rendszer) | UUID; kliens generálja az első mentéskor |
| `birthDate` | űrlapon: ha kitöltve, érvényes dátum | Életkor: kliens TZ, `floor` évek ([[Tápérték kalkulátor]]) |
| `sex` | ha kitöltve | `MALE` / `FEMALE` — BMR + safety floor |
| `heightCm` | ha kitöltve | 100–250 |
| `currentWeightKg` | ha kitöltve | 30–300; **max 1 tizedesjegy** — kliensoldali `oneDecimalPlaceValidator` (a `numeric(5,1)` DB-skála kliens-tükre), hiba esetén `PROFILE.VALIDATION_ONE_DECIMAL` a mező alatt, a mentés blokkolva. |
| `goal` | ha kitöltve | `FAT_LOSS` / `MAINTENANCE` / `WEIGHT_GAIN` — UI: Fogyás / Megtartás / Tömegnövelés |
| `kgPerWeek` | feltételes | Pozitív szám, 0.1–1.5. **`FAT_LOSS` / `WEIGHT_GAIN`:** mentéskor kötelező, ha a `goal` ki van töltve. **`MAINTENANCE`:** mező **rejtett**, érték ignorált (Δ = 0 a [[Tápérték kalkulátor]]ban). |
| `grossMonthlySalaryHuf` | **opcionális** | Egész, `≥ 0`; [[Nettó fizetés kalkulátor]] |
| `createdAt` / `updatedAt` | rendszer | Audit |

**Nincs** `activityLevel` / aktivitási szint — a PAL fix 1.2 a [[Tápérték kalkulátor]]ban; a napi aktivitás a [[Lépésszám követés]] + edzésnaplókból jön.

Nincs display name / avatar / email (auth: [[Bejelentkezés]]).

**Nincs „komplett profil” kényszer** és nincs automatikus átirányítás a Profile-ra.

#### Mentés validáció

- Üres / részlegesen kitöltött profil **menthető** (és üresen is létezhet helyi store-ban).
- Kitöltött mezőkre: tartomány / enum / dátum ellenőrzés; a súly mezők (`currentWeightKg`, súlytörténet `weightKg`) **legfeljebb 1 tizedesjegyet** fogadnak el (kliensoldali validáció, nem néma DB-kerekítés).
- Ha `goal ∈ {FAT_LOSS, WEIGHT_GAIN}` → `kgPerWeek` kötelező ezen a mentésen.
- Ha `goal = MAINTENANCE` → `kgPerWeek` nem jelenik meg; nem validáljuk.

#### Tápérték fogyasztók (hiányos profil)

A [[Tápérték kalkulátor]] (és az [[Étkezés]] progress barok) **nem crashelnek**. Ha hiányzik a számításhoz kellő bemenet (`birthDate`, `sex`, `heightCm`, `currentWeightKg`, `goal`, illetve nem-megtartásnál `kgPerWeek`), a keret / makró **nem számolható** → `~` / homokóra ([[Backend-offline first]] vizuális bizonytalanság).

#### Súlytörténet — `WeightHistoryEntry`

Az adatmodell és a CRUD kész; a diagram-megjelenítés tervezett.

| Mező | Szabály |
|---|---|
| `id` | UUID, kliens |
| `recordedAt` | Dátum-idő (kliens TZ); alapértelmezés: mentés / rögzítés pillanata |
| `weightKg` | 30–300; **max 1 tizedesjegy** (ugyanaz a `oneDecimalPlaceValidator` a súlytörténet-bejegyzés űrlapján) |
| `deleted` | Soft delete (`false` default); a history lista szűri |

**Írás Profile mentéskor** (kliensoldali, `ProfileRepository.save` — a backend nem hozza létre automatikusan): ha `currentWeightKg` **változott** az előző mentett jelenlegi súlyhoz képest (és az új érték ki van töltve) → új history sor az új súllyal. Más mező változása **nem** nyit sort. Első súlymegadás (üres → érték) → egy history sor.

**Manuális hozzáadás:** a súlytörténet listán **„+ Új bejegyzés”** CTA is elérhető, ami közvetlenül (a Profile form kitöltése nélkül) hoz létre egy history sort tetszőleges `recordedAt` + `weightKg` párral — ez teszi lehetővé a retroaktív (múltbeli dátumú, pl. utólag felírt) súlyrögzítést. Ez a create út **nem** módosítja a `currentWeightKg`-t (csak a Profile form mentése teszi azt, lásd fent).

**CRUD:** a history sorok **létrehozhatók** (manuálisan, fent), **szerkeszthetők** és **törölhetők** (soft delete + megerősítés) — [[Backend-offline first]]. Soha nem szinkronizált helyi draft → helyi hard remove + outbox tisztítás. History create / szerkesztés / törlés **nem** írja át automatikusan a `currentWeightKg`-t (a jelenlegi súly csak a Profile űrlap mezője / mentése). Listák `deleted = false`. Nincs undelete UI.

A [[Tápérték kalkulátor]] **csak** `currentWeightKg`-t használ; a history kizárólag napló / későbbi diagram.

### UI/UX elvárások

- Belépés: **Menü** → Profile (lásd [[Frontend]]).
- Egy űrlap: fenti mezők; **Mentés** gomb (nincs élő TDEE előnézet ezen a képernyőn).
- `goal = MAINTENANCE` → `kgPerWeek` rejtve.
- Mentés után rövid siker-feedback; store frissül → más képernyők TDEE-je újraszámol (ha számolható).
- Súlytörténet: lista a Profile képernyőn (vagy ugyaninnen megnyíló részletező); **„+ Új bejegyzés”** manuális / retroaktív hozzáadás; szerkesztés / törlés; **diagram nincs** (tervezett).

### Megjegyzések

- Bruttó bér pénzügy-jellegű, de user-szintű → Profile-on marad. Nettó képlet / `~`: [[Nettó fizetés kalkulátor]] (hiányzó `birthDate` nem blokkolja a nettót).
- Δ, floor, PAL, makró: [[Tápérték kalkulátor]].

### Nyitott kérdések

Nincs nyitott kérdés.

## Architektúra

### Frontend

- Profile page: form + Mentés; `WeightHistoryEntry` lista + edit/delete. A súly mezőkön
  `oneDecimalPlaceValidator` (Reactive Forms) — >1 tizedesjegy → `oneDecimalPlace` hiba, `PROFILE.VALIDATION_ONE_DECIMAL` felirat, `save()` / `saveEntry()` nem hív repót.
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

- OpenAPI: `UserProfile` (1:1 user) + `WeightHistoryEntry` CRUD (user scope; history `deleted` / `deleted_at`; `DELETE` = soft delete, idempotens).
- `UserProfile`: fenti mezők (opcionálisak nullable-ként, kivéve `id`); `kgPerWeek` validáció goal függvényében. Nincs `activityLevel`.
- Nincs szerveroldali „profile complete” gate.
- Auth / user scope: [[Bejelentkezés]].

### Nyitott kérdések

Nincs nyitott kérdés.
