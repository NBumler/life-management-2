# Sablonok

## Business

| | |
|---|---|
| **Státusz** | `Kész` |
| **Szülő** | [[GearCheck]] |
| **Kapcsolódó** | [[Eszközök]], [[Pakolás]], [[Szöveges keresés]], [[Bejelentkezés]], [[Backend-offline first]], [[Szinkronizációs központ]] |

### Célállapot

Pakolási sablonok: elnevezett [[Eszközök]] listák (pl. „Hétvégi mászás”, „Tél”). A [[Pakolás]] egy vagy több sablonból indul; a tételek sorrendje a pakolásba másoláskor a kiindulási sorrend.

**Ownership:** **user-owned** — [[Bejelentkezés]].

**Nem scope (MVP):** seed / előre töltött sablonok; sablonból új `GearItem` létrehozása (csak picker; CRUD az [[Eszközök]] képernyőn).

### Funkcionális leírás

#### Entitás — `PackingTemplate`

| Mező | Típus / szabály |
|---|---|
| `id` | UUID, kliens generálja |
| `name` | Kötelező; **egyedi a user élő sablonjai között** (case-insensitive) |
| `notes` | Opcionális szabad szöveg |
| `deleted` | Soft delete (`false` default); listák szűrik |
| `createdAt` / `updatedAt` | Audit |

#### Entitás — `PackingTemplateItem`

| Mező | Típus / szabály |
|---|---|
| `id` | UUID, kliens generálja |
| `templateId` | UUID → `PackingTemplate` |
| `gearItemId` | UUID → [[Eszközök]] `GearItem` |
| `sortOrder` | Egész; manuális sorrend a sablonon belül |
| `deleted` | Soft delete (`false` default) |
| `createdAt` / `updatedAt` | Audit |

Egy sablonon belül ugyanaz a `gearItemId` **legfeljebb egyszer** szerepelhet.

#### CRUD

- Lista, létrehozás, szerkesztés, törlés, **másolás (duplikálás)**.
- **Üres sablon engedélyezett** (0 tétel): elnevezés előbb, eszközök később. [[Pakolás]] indulásakor üres sablon = 0 tétel abból a forrásból (több sablon uniója továbbra is deduplikál).
- Tételek: meglévő `GearItem` hozzáadása **pickerrel** (kereső: [[Szöveges keresés]]); eltávolítás a sablonból (nem törli a katalógus-elemet).
- Pickerben a már a sablonban lévő elemek **disabled** + lista végére rendezve (mint a [[Pakolás]] extra hozzáadásánál).
- **Sorrend:** manuális — weben drag-and-drop; telefonon fel / le nyilak ([[Pakolás]] / [[Recept]] mintára). A `sortOrder` mentésre kerül; több sablon uniójakor a pakolás sorrendje: sablonok kiválasztási sorrendje + sablonon belüli `sortOrder`, duplikátum első előfordulása marad.

#### Másolás

- „Duplikálás”: új `PackingTemplate` + másolt tételek (új UUID-k); alapértelmezett név pl. `„{eredeti} (másolat)”` — ha ütközik az egyediséggel, a UI / szerver egyedi nevet biztosít (pl. számozás).
- A másolat független; az eredeti és a `GearItem` katalógus változatlan.

#### Törlés

- **Soft delete** a sablonra + összes `PackingTemplateItem`-re; confirmation dialog kötelező. Soha nem szinkronizált helyi draft → helyi hard remove + outbox tisztítás — [[Backend-offline first]].
- Futó [[Pakolás]] **érintetlen** (snapshot); a dialógus jelezze: „aktív pakolást nem törli”.
- [[Eszközök]] katalógus **nem** törlődik. Nincs undelete UI. Törölt sablon neve újra felvehető (egyediség élő sorokra).

#### Kapcsolat más specekkel

- **Eszköz törlés:** a sablon-tételekből cascade soft delete — [[Eszközök]].
- **Sablon szerkesztés futó pakolás mellett:** szabadon engedélyezett; a futó lista **nem** követi a változást — [[Pakolás]].
- **Új `GearItem`:** csak az [[Eszközök]] képernyőn (MVP). Sablon / pakolás csak meglévő elemet vesz fel pickerrel.

### UI/UX elvárások

- Belépés: [[GearCheck]] hub → **Sablonok**.
- Lista: kereső ([[Szöveges keresés]]); soron: `name`, opcionális `notes` előnézet, tételszám; műveletek: megnyitás / szerkesztés, másolás, törlés.
- Create / edit: `name` (kötelező, auto-focus create-nél), `notes` (opcionális); alatta rendezhető tétellista + „eszköz hozzáadása” picker.
- Törlés / másolás: egyértelmű gombok; törlésnél confirmation a fenti szöveggel.

### Megjegyzések

_Nincs megjegyzés._

### Nyitott kérdések

Nincs nyitott kérdés.

## Architektúra

### Frontend

- Sablon lista / create / edit / másolás képernyők a GearCheck alatt.
- Megosztott `GearItem` picker ([[Eszközök]]); platformos reorder.
- OpenAPI generált kliens; mutációk offline rétegen.
- Nested mentés: sablon + tételek egy requestben ajánlott (mint [[Heti terv]] / session minták), vagy külön item végpontok — implementációs részlet, de a kliens offline outbox konzisztens legyen.

#### Backend-offline

- Olvasás / írás helyi store-ból Backend-offline és Full-offline esetén is.
- Create / update / delete / duplicate → outbox (`OfflineQueueService`) + kliens UUID; sync: [[Szinkronizációs központ]].
- Sablon törlés: helyi sablon + tételek `deleted = true`; futó pakolás sorai érintetlenek. Soha nem syncelt draft: helyi hard remove + outbox purge.
- Eszköz-cascade: [[Eszközök]] — helyi sablon-tételek eltávolítása az eszköz delete műveletben.
- Lásd [[Backend-offline first]].

### Backend

- Táblák:
  - `packing_template` (`id` UUID, `user_id`, `name`, `notes` nullable, `deleted` / `deleted_at`, audit)
  - `packing_template_item` (`id` UUID, `template_id`, `gear_item_id`, `sort_order`, `deleted` / `deleted_at`, audit); unique `(template_id, gear_item_id)` élő sorokra; sablon `DELETE` → cascade soft delete a tételekre; `gear_item` törlésekor item sorok cascade soft delete ([[Eszközök]])
- Egyediség: `(user_id, lower(name))` unique a sablonon, **élő** sorokra (`WHERE deleted = false`).
- OpenAPI CRUD + `POST .../duplicate` (vagy kliens oldali create+copy ugyanazzal a szerződéssel); user scope: [[Bejelentkezés]].
- `DELETE` sablon: soft delete + tételek; **nem** érinti a futó pakolás táblákat és a `gear_item` sort. Idempotens (már törölt → 200).

### Nyitott kérdések

Nincs nyitott kérdés.
