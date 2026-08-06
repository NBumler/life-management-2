# Eszközök

## Business

| | |
|---|---|
| **Státusz** | `Kész` |
| **Szülő** | [[GearCheck]] |
| **Kapcsolódó** | [[Sablonok]], [[Pakolás]], [[Szöveges keresés]], [[Bejelentkezés]], [[Backend-offline first]], [[Szinkronizációs központ]] |

### Célállapot

User-owned felszerelés-katalógus (típus / tétel szint, nem fizikai példány-nyilvántartás): pl. kötél, bundászsák, fejlámpa. A [[Sablonok]] és a [[Pakolás]] ezekre az elemekre hivatkoznak.

**Ownership:** **user-owned** — [[Bejelentkezés]].

**Nem scope (MVP / 2.0 első kör):** kategória, mennyiség (`quantity`), súly, katalógus-állapot, fotó, gyártó, vásárlás / ellenőrzés dátum, élettartam / gear wear, ellenőrzési emlékeztető ([[Értesítések]]), seed / előre töltött lista.

### Funkcionális leírás

#### Entitás — `GearItem`

| Mező | Típus / szabály |
|---|---|
| `id` | UUID, kliens generálja |
| `name` | Kötelező; **egyedi a user katalógusán belül** (case-insensitive) |
| `notes` | Opcionális szabad szöveg |
| `createdAt` / `updatedAt` | Audit |

Nincs `quantity`, `category`, `isFavorite`, soft-delete flag az MVP-ben.

**Üres start:** első indításkor a katalógus üres — nincs seed.

#### CRUD

- Lista (a user összes `GearItem`-je), létrehozás, szerkesztés, törlés.
- **Törlés: hard delete + cascade** (megerősítő dialógus kötelező).
  - Kiesik **minden** [[Sablonok]] tételből, ahol ez az `id` szerepel.
  - Kiesik **minden futó** [[Pakolás]] tételből, ahol ez az `id` szerepel.
  - A megerősítő szöveg jelezze, ha ismert: hány sablonból / hány aktív pakolásból törlődik.
- **Nem** cascade-eli más userek adatait (user-owned szűrés).

#### Kapcsolat a [[Sablonok]] / [[Pakolás]] specekkel

- Sablon és pakolás **`gearItemId`**-re hivatkozik (nem név-másolat a katalógus élő linkjéhez — kivéve UI megjelenés).
- **Sablon törlés** (részletek: [[Sablonok]]): hard delete a sablonra + sablon-tételekre; a **futó pakolás érintetlen**; az eszköz-katalógus **nem** törlődik.
- **Pakolás közbeni „új eszköz”:** új `GearItem` a katalógusba (`name` kötelező, `notes` opcionális) **és** azonnal hozzáadás a futó pakoláshoz. Duplikált név (case-insensitive) → hiba / meglévő elem választása — ugyanaz az egyediségi szabály.

### UI/UX elvárások

- Belépés: [[GearCheck]] hub → **Eszközök** (három belépő: Eszközök | Sablonok | Aktív pakolás).
- Lista: kereső ([[Szöveges keresés]]); soron: `name`, opcionális `notes` előnézet.
- Create / edit: `name` (kötelező), `notes` (opcionális); `name` mező auto-focus create-nél.
- Törlés: confirmation dialog a cascade hatással.
- Megosztott picker a [[Sablonok]] / [[Pakolás]] felé (kereső + lista); soft-delete / „törölt” állapot nincs.

### Megjegyzések

- Mennyiség / kategória későbbi scope, ha a GearCheck-en belül máshol is megjelenik az igény.
- A [[Sablonok]] és [[Pakolás]] specek a cascade és a pakolás-közbeni create szabályait követik / hivatkozzák.

### Nyitott kérdések

Nincs nyitott kérdés.

## Architektúra

### Frontend

- Katalógus lista / create / edit képernyők a GearCheck alatt.
- Kereső: [[Szöveges keresés]].
- Picker komponens sablon- és pakolás-szerkesztőkhöz.
- OpenAPI generált kliens; mutációk offline rétegen.
- Törlés UI: érintett sablon / aktív pakolás darabszám (helyi store lekérdezés) a megerősítőben.

#### Backend-offline

- Olvasás / írás helyi store-ból Backend-offline és Full-offline esetén is.
- Create / update / delete → outbox (`OfflineQueueService`) + kliens UUID; sync: [[Szinkronizációs központ]].
- Cascade törlés: a kliens a helyi sablon- és pakolás-tételeket is eltávolítja ugyanabban a felhasználói műveletben; az outbox a szerver `DELETE` (és ha kell, kapcsolódó cleanup) hívását viszi — a szerver is cascade-el, hogy sync után konzisztens legyen.
- Lásd [[Backend-offline first]].

### Backend

- Tábla: `gear_item` (`id` UUID, `user_id`, `name`, `notes` nullable, `created_at`, `updated_at`).
- Egyediség: `(user_id, lower(name))` unique.
- OpenAPI CRUD; minden művelet `SecurityContext` `userId`-ra szűr; idegen `id` → 404.
- `DELETE /api/gear-items/{id}`: hard delete + DB cascade (vagy tranzakcióban) a userhez tartozó sablon-tételekre és futó pakolás-tételekre, amelyek `gear_item_id`-re mutatnak. Auth / ownership: [[Bejelentkezés]].

### Nyitott kérdések

Nincs nyitott kérdés.
