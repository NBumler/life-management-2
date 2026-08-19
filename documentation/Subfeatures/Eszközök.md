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
| `name` | Kötelező; **egyedi a user élő katalógusán belül** — összehasonlítási szabály: [[Névegyediség]] |
| `notes` | Opcionális szabad szöveg |
| `deleted` | Soft delete (`false` default); listák szűrik |
| `createdAt` / `updatedAt` | Audit |

Nincs `quantity`, `category`, `isFavorite` az MVP-ben. Törölt név **újra felvehető** (egyediség csak élő sorokra).

**Üres start:** első indításkor a katalógus üres — nincs seed.

#### CRUD

- Lista (a user összes `GearItem`-je), létrehozás, szerkesztés, törlés.
- **Törlés: soft delete + cascade** (megerősítő dialógus kötelező) — [[Backend-offline first]] (ne 404 multi-device-on). Soha nem szinkronizált helyi draft → helyi hard remove + outbox tisztítás.
  - Soft delete minden [[Sablonok]] tételen, ahol ez az `id` szerepel.
  - Soft delete minden futó [[Pakolás]] tételen, ahol ez az `id` szerepel.
  - A megerősítő szöveg jelezze, ha ismert: hány sablonból / hány aktív pakolásból törlődik.
- **Nem** cascade-eli más userek adatait (user-owned szűrés). Nincs undelete UI.

#### Kapcsolat a [[Sablonok]] / [[Pakolás]] specekkel

- Sablon és pakolás **`gearItemId`**-re hivatkozik (nem név-másolat a katalógus élő linkjéhez — kivéve UI megjelenés).
- **Sablon törlés** (részletek: [[Sablonok]]): soft delete a sablonra + sablon-tételekre; a **futó pakolás érintetlen**; az eszköz-katalógus **nem** törlődik.
- **Új `GearItem`:** csak ezen a képernyőn (MVP). [[Sablonok]] / [[Pakolás]] csak meglévő elemet ad hozzá pickerrel (extra tétel a futó pakoláshoz / sablonhoz) — nem hoz létre katalógus-elemet.

### UI/UX elvárások

- Belépés: [[GearCheck]] hub → **Eszközök** (három belépő: Eszközök | Sablonok | Aktív pakolás).
- Lista: kereső ([[Szöveges keresés]]); soron: `name`, opcionális `notes` előnézet.
- Create / edit: `name` (kötelező), `notes` (opcionális); `name` mező auto-focus create-nél.
- Törlés: confirmation dialog a cascade hatással.
- Megosztott picker a [[Sablonok]] / [[Pakolás]] felé (kereső + lista); picker csak `deleted = false`.

### Megjegyzések

- Mennyiség / kategória későbbi scope, ha a GearCheck-en belül máshol is megjelenik az igény.
- A [[Sablonok]] és [[Pakolás]] specek a cascade és a „csak picker, nincs create” szabályait követik / hivatkozzák.

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
- Cascade törlés: a kliens a helyi sablon- és pakolás-tételeket is `deleted = true`-ra állítja ugyanabban a felhasználói műveletben; az outbox a szerver `DELETE`-jét viszi (szerver soft delete + cascade). Soha nem syncelt draft: helyi hard remove + outbox purge. Pull: `deleted = true` → kiesik az élő listákból.
- Lásd [[Backend-offline first]].

### Backend

- Tábla: `gear_item` (`id` UUID, `user_id`, `name`, `notes` nullable, `deleted` / `deleted_at`, `created_at`, `updated_at`).
- Egyediség: `(user_id, name_normalized)` unique **élő** sorokra (`WHERE deleted = false`) — [[Névegyediség]].
- OpenAPI CRUD; minden művelet `SecurityContext` `userId`-ra szűr; idegen `id` → 404; saját törölt `GET` by id → 200 + `deleted`.
- `DELETE /api/gear-items/{id}`: soft delete + cascade soft delete a userhez tartozó sablon-tételekre és futó pakolás-tételekre, amelyek `gear_item_id`-re mutatnak. Idempotens (már törölt → 200). Auth / ownership: [[Bejelentkezés]].

### Nyitott kérdések

Nincs nyitott kérdés.
