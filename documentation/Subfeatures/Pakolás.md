# Pakolás

## Business

| | |
|---|---|
| **Státusz** | `Kész` |
| **Szülő** | [[GearCheck]] |
| **Kapcsolódó** | [[Sablonok]], [[Eszközök]], [[Szöveges keresés]], [[Bejelentkezés]], [[Backend-offline first]], [[Szinkronizációs központ]] |

### Célállapot

Aktív pakolás(ok) indítása sablon(ok)ból, eszközök státuszának végigvezetése, lezárás. Egyszerre **korlátlan** számú futó pakolás engedélyezett ugyanannál a usernél.

**Ownership:** **user-owned** — [[Bejelentkezés]].

**Nem scope (MVP):** pakolás-előzmény / archívum; sablon hozzáadása futás közben; tétel hard remove a futó listáról; új `GearItem` create pakolásból (csak [[Eszközök]]).

### Funkcionális leírás

#### Entitás — `PackingSession`

| Mező | Típus / szabály |
|---|---|
| `id` | UUID, kliens generálja |
| `destination` | Opcionális szabad szöveg (úticél); **szerkeszthető** futás közben |
| `sourceTemplateIds` | UUID lista — az induláskor választott [[Sablonok]] `id`-jai (sorrend = kiválasztási sorrend); UI forrás-jelöléshez |
| `createdAt` / `updatedAt` | Audit |

Nincs „kész vs megszakítva” megkülönböztetés: a lezárás mindig hard delete.

#### Entitás — `PackingSessionItem`

| Mező | Típus / szabály |
|---|---|
| `id` | UUID, kliens generálja |
| `sessionId` | UUID → `PackingSession` |
| `gearItemId` | UUID → [[Eszközök]] `GearItem` |
| `status` | `PackingItemStatus` (lásd lent); induláskor / extra felvételkor: `NOT_PACKED` |
| `sortOrder` | Egész; manuális sorrend a **aktív** (nem kész) szekcióban |
| `createdAt` / `updatedAt` | Audit |

Egy sessionön belül ugyanaz a `gearItemId` **legfeljebb egyszer**. Név: **élő join** a `GearItem.name`-re (átnevezés azonnal látszik). Tétel **nem** törölhető a listáról státuszváltáson kívül — nincs remove / swipe-delete.

#### Enum — `PackingItemStatus`

| Érték | Jelentés | Háttérszín (példa) |
|---|---|---|
| `NOT_PACKED` | Nincs bepakolva | Halvány piros |
| `KNOWN_LOCATION` | Tudom hol van | Sárgás / narancs |
| `PREPARED` | Táska mellé készítve | Világoskék |
| `WEAR_ON_DEPARTURE` | Induláskor veszem fel | Lila |
| `BUY_ON_THE_WAY` | Út közben kell venni | Barna / narancs |
| `PACKED` | Bepakolva | Zöld |
| `NOT_NEEDED` | Nem kell | Szürke |

**Ciklus sorrend** (elemre tap → következő):

`NOT_PACKED` → `KNOWN_LOCATION` → `PREPARED` → `WEAR_ON_DEPARTURE` → `BUY_ON_THE_WAY` → `PACKED` → `NOT_NEEDED` → (`NOT_PACKED` …)

A státuszok között **tetszőlegesen** lehet ugrani (chip tap vagy ciklus); `PACKED` / `NOT_NEEDED` is bármikor visszaállítható.

#### Indítás

1. Egy vagy több [[Sablonok]] kiválasztása (**kötelező** ≥1 sablon; lehet üres sablon).
2. Opcionális `destination`.
3. Session létrejön; `sourceTemplateIds` = választott sablonok sorrendben.
4. Tételek: sablonok uniója, **dedup** `gearItemId` szerint — az **első előfordulás** marad (sablon kiválasztási sorrend × sablonon belüli `sortOrder`).
5. Ha minden sablon üres → üres session OK; tételek később pickerrel.
6. Kezdeti `status` = `NOT_PACKED`; `sortOrder` a fenti unió sorrendje.

Sablon **módosítás / törlés** a futó session tételeit **nem** változtatja. Törölt sablon `id` a `sourceTemplateIds`-ben: UI „törölt sablon” / elrejtés; a tételek maradnak.

Futás közben **új sablon nem** adható a sessionhöz — csak induláskor. Extra eszköz: meglévő `GearItem` pickerrel (duplikátum disabled + lista végére); új tétel: `NOT_PACKED`, `sortOrder` = végére.

#### UI szekciók

- **Aktív lista:** minden tétel, ahol `status` ∉ {`PACKED`, `NOT_NEEDED`}.
- **Kész / nem kell:** `PACKED` és `NOT_NEEDED` tételek **elkülönítve** (külön szekció) — **nem** törlődnek; visszaállíthatók státuszváltással.

#### Státusz / elem interakció

Egy tétel kártya:

1. **Felső sor:** a 7 státusz felsorolva; a jelenlegi kiemelve (pl. vastagabb border / keret). Bármely státuszra tap → **azonnal** arra a státuszra áll.
2. **Alsó sor:** balra nagy betűvel az eszköz neve; jobbra a jelenlegi státusz felirata.
3. A kártya paddingolt; **háttérszín** = a jelenlegi státusz színkódja.
4. Tap a kártyára (nem a státusz-chipre) → **következő** státusz a ciklus szerint.

#### Rendezés

- Kereső a lista tetején ([[Szöveges keresés]]).
- Státusz szerinti sorba rendezés gomb az **aktív** szekcióra: `NOT_PACKED` → `KNOWN_LOCATION` → `PREPARED` → `WEAR_ON_DEPARTURE` → `BUY_ON_THE_WAY`. A `PACKED` / `NOT_NEEDED` szekciót **nem** rendezi.
- Manuális reorder az aktív szekcióban: web drag-and-drop; telefon fel / le nyilak.

#### Lezárás

- Egyetlen **„Pakolás lezárása”** gomb (jelentheti a „kész” és a „megszakítom” szándékot is — üzletileg nem különböztetjük).
- Confirmation dialog kötelező → **hard delete** a `PackingSession` + összes `PackingSessionItem` (nincs history).

#### Cascade más specekből

- `GearItem` törlés → hard cascade: kiesik minden futó session tételéből — [[Eszközök]].
- Sablon törlés → session **érintetlen** — [[Sablonok]].

### UI/UX elvárások

- Belépés: [[GearCheck]] hub → **Aktív pakolás** (lista a futó sessionökről + új indítás; korlátlan darabszám).
- Session képernyő: úticél szerkesztő; forrás-sablonok jelölése; kereső; státusz-sort; manuális reorder; tételkártyák a fenti interakcióval; „eszköz hozzáadása” picker; lezárás gomb + confirmation.
- Indítás flow: multi-select sablon(ok) (≥1) + opcionális úticél.

### Megjegyzések

_Nincs megjegyzés._

### Nyitott kérdések

Nincs nyitott kérdés.

## Architektúra

### Frontend

- Session lista + detail (státuszgép UI); platformos reorder; megosztott `GearItem` picker ([[Eszközök]]).
- Élő név: join / select a helyi `gear_item` store-ból `gearItemId` alapján.
- OpenAPI generált kliens; mutációk offline rétegen.

#### Backend-offline

- Olvasás / írás helyi store-ból Backend-offline és Full-offline esetén is.
- Create session / update destination / item status / sortOrder / add item / delete session → outbox (`OfflineQueueService`) + kliens UUID; sync: [[Szinkronizációs központ]].
- Lezárás: helyi hard delete session + items; outbox `DELETE`.
- Eszköz-cascade: [[Eszközök]] — helyi session itemek eltávolítása.
- Lásd [[Backend-offline first]].

### Backend

- Táblák:
  - `packing_session` (`id` UUID, `user_id`, `destination` nullable, `source_template_ids` JSON/array, audit)
  - `packing_session_item` (`id` UUID, `session_id`, `gear_item_id`, `status`, `sort_order`, audit); unique `(session_id, gear_item_id)`; FK cascade session törlésre; `gear_item` törléskor item cascade ([[Eszközök]])
- Nincs soft delete / archive tábla az MVP-ben.
- OpenAPI CRUD; user scope: [[Bejelentkezés]]. Korlátlan session / user (nincs unique „egy aktív” constraint).

### Nyitott kérdések

Nincs nyitott kérdés.
