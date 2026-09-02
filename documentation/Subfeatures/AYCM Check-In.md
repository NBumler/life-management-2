---
verifikalva: 2026-09-02
verifikalt_commit: 279a21b
---

# AYCM Check-In

## Business

| | |
|---|---|
| **Státusz** | `Kész` |
| **Szülő** | [[AYCM tracker]] |
| **Kapcsolódó** | [[AYCM tracker]], [[AYCM elfogadóhely hozzáadása]], [[AYCM Statisztikák]], [[Szöveges keresés]], [[Nyelv választás]], [[Dark&Light mode]], [[Bejelentkezés]], [[Backend-offline first]], [[Szinkronizációs központ]] |

### Jelenlegi működés

Napi AYCM belépés rögzítése: partner + dátum + idő → automatikus sávillesztés, **snapshot** az értékkel. Nincs külön előzmény-lista (az a [[AYCM Statisztikák]]); a dátummező tölti az aznapi rekordot.

**Ownership:** **user-owned** — [[Bejelentkezés]].

Jelenleg: max egy Check-In / naptári nap, nincs inline partner-create, nincs külön Check-In lista, percpontos idő (nincs 15 perces kerekítés), nincs naptár-producer / értesítés / undelete. Tervezett bővítmények:

> Tervezett: `backlog/041-aycm-check-in-tobb-check-in-naptari-nap-kulon-check-in-lista.md`, `backlog/042-aycm-naptar-producer-ertesites-integracio.md`

### Funkcionális leírás

#### Entitás — `AycmCheckIn`

| Mező | Típus / szabály |
|---|---|
| `id` | UUID, kliens generálja |
| `checkInDate` | Kötelező `YYYY-MM-DD`, kliens naptári nap. **Múlt, ma és jövő egyaránt szabad.** |
| `checkInTime` | Kötelező `HH:mm`; perc `0`–`1439` (soha `24:00`) |
| `partnerId` | UUID → [[AYCM elfogadóhely hozzáadása]] `AycmPartner`. Create/edit: **élő** partner. Törölt partner után a UUID **megmarad** (statisztika). |
| `partnerName` | Snapshot; a mentéskori élő `name` |
| `ruleId` | Snapshot; UUID vagy `null` (nincs találat) |
| `ruleLabel` | Snapshot; `displayLabel` vagy üres / „—” ha nincs sáv |
| `listPriceHuf` | Snapshot egész `≥ 0` |
| `coPaymentHuf` | Snapshot egész `≥ 0` |
| `visitValueHuf` | Snapshot; **`= listPriceHuf`** ([[AYCM tracker]]) |
| `notes` | Opcionális szabad szöveg |
| `deleted` | Soft delete (`false` default) |
| `createdAt` / `updatedAt` | Audit |

**Egyediség:** `(userId, checkInDate)` az **élő** sorokra (`deleted = false`). Törlés után a nap újra szabad (új UUID).

#### Illesztés és snapshot

Mentéskor (create **és** edit) a kliens hívja a `matchPriceRule`-t — SSOT [[AYCM elfogadóhely hozzáadása]] — a **jelenlegi** élő sávokra, a `checkInDate` hét napjával.

| Találat | Snapshot |
|---|---|
| Van sáv | `ruleId`, `ruleLabel = displayLabel`, `listPriceHuf`, `coPaymentHuf`, `visitValueHuf = listPriceHuf` |
| Nincs | `ruleId = null`, `ruleLabel` üres / „—”, három Ft mező **0** |

`partnerName` = a kiválasztott élő partner neve. A szerver **nem** számolja újra az illesztést (offline-first); a payload a snapshot.

Partner / dátum / idő változás a szerkesztőn → **újraillesztés**, a snapshot felülíródik. `notes` önmagában nem.

Későbbi ársáv- vagy partnernév-szerkesztés a **már mentett** sort nem bántja, amíg a usernem szerkeszti újra.

#### Napi egyediség

Második **élő** Check-In ugyanarra a `checkInDate`-re → validációs hiba. A UI a meglévő sort tölti (edit), nem második create.

Dátum átírása foglalt napra → hiba, **409** `UNIQUE_VIOLATION` (ugyanaz a hibakód, mint create-nél — lásd a Backend OpenAPI táblát; a cél nap élő sora marad).

#### CRUD

- Create / szerkesztés / törlés. **Duplikálás nincs.** Nincs lista-képernyő.
- **Törlés:** megerősítés (`checkInDate` + `partnerName`) → soft delete. Kiesik a hub havi Σ-ból / darabszámból. A nap újra szabad.
- Soft delete szerződés: [[Backend-offline first]] (tombstone, idempotens `DELETE`, saját törölt `GET` → 200 + `deleted`, `PUT` töröltön nem undo). Soha nem syncelt draft → hard remove + outbox purge ([[Szinkronizációs központ]]).
- Partner kötelező. Törölt partner **nem** választható új mentéshez; a régi sor olvasható / törölhető / notes szerkeszthető; partner/idő csere csak élő pickerre.

#### 0 Ft / sárga

Nincs illeszkedő sáv (0 szabály, lyuk, rossz nap): sárga figyelmeztetés, snapshot 0, **mentés szabad**, nincs plusz confirm.

### UI/UX elvárások

- **Belépés:** [[AYCM tracker]] hub FAB / CTA. Flag: **AYCM tracker**.
  - Ma nincs élő Check-In → create, default **ma + jelenlegi idő**.
  - Ma van → a **mai** szerkesztő (nem második create).
- Route pl. `/tabs/menu/aycm/check-in` (opcionális `?date=YYYY-MM-DD` a nap betöltéséhez).
- **Űrlap:** partner picker (élő partnerek, `ion-select` action-sheet — szövegkereső mező a pickerben jelenleg nincs, tervezett: `backlog/037-aycm-check-in-szovegkereso-a-partner-pickerben.md`); dátum; idő (percpontos); **Most** = `checkInDate = ma` **és** `checkInTime = most`. Ha ma már van élő sor, a Most **azt** tölti (edit) + idő = most, újraillesztés-előnézet. Notes; Mentés.
- Üres partnerlista → CTA [[AYCM elfogadóhely hozzáadása]] (nincs inline create).
- Dátum váltás: ha arra a napra van élő sor → edit mód (mezők a sorból); ha nincs → create a kiválasztott dátummal (idő marad / Most).
- Reaktív előnézet: zöld = `ruleLabel` + `listPriceHuf` Ft; sárga = nincs sáv, 0 Ft. i18n: [[Nyelv választás]]. Kontraszt: [[Dark&Light mode]].
- Törlés: confirmation (csak edit / meglévő sor).

### Megjegyzések

Hub havi Σ / darabszám / FAB: [[AYCM tracker]]. `matchPriceRule` / `displayLabel`: [[AYCM elfogadóhely hozzáadása]]. Előzmény / diagram: [[AYCM Statisztikák]].

### Nyitott kérdések

Nincs nyitott kérdés.

## Architektúra

### Frontend

- Képernyő: `AycmCheckInPage`. Nincs lista-page.
- Pure TS: `matchPriceRule` import; snapshot összerakás; napi egyediség a helyi store-on (előnézet).
- OpenAPI kliens; mutációk offline rétegen.

#### Backend-offline

- Olvasás / írás helyi store Backend-offline és Full-offline.
- Create / update / delete → outbox + kliens UUID; sync: [[Szinkronizációs központ]].
- Illesztés **mindig** kliens TS (nincs homokóra). Snapshot a local row-on mentéskor.
- Soft delete: `deleted = true` + outbox `DELETE`. Soha nem syncelt draft: hard remove + outbox purge.
- Pull: `deleted = true` → kiesik az élő napból; pending `PUT` eldobandó. Unique: a kliens az élő helyi sorokra szűr. Lásd [[Backend-offline first]].

### Backend

- Tábla: `aycm_check_in` (`id` UUID, `user_id`, `check_in_date` date, `check_in_time`, `partner_id` UUID, snapshot oszlopok, `notes` nullable, `deleted` / `deleted_at`, audit).
- Partial unique: `(user_id, check_in_date) WHERE deleted = false`.
- Nincs FK-kényszer, hogy a partner élő legyen (törölt partner UUID maradhat).
- OpenAPI (lista implicit `deleted = false`):

| Metódus | Útvonal | Leírás |
|---|---|---|
| `GET` `POST` | `/api/aycm-check-ins` | Lista (stat / hub szűrhet dátumra); create. Unique sértés → **409** |
| `GET` `PUT` `DELETE` | `/api/aycm-check-ins/{id}` | Edit = `PUT` (új snapshot a kliensből). Unique sértés (dátum átírása foglalt napra) → **409** `UNIQUE_VIOLATION`, ugyanúgy mint create-nél. `DELETE` = soft delete |

- Query pl. `?from=&to=` a hub/stat számára megengedett; a Check-In UI nem lista.
- Idegen `id` → 404. Saját törölt `GET` → 200 + `deleted`. `DELETE` idempotens. Auth: [[Bejelentkezés]].
- A szerver **nem** futtatja a `matchPriceRule`-t; elfogadja a snapshot mezőket (nemnegatív Ft).

### Nyitott kérdések

Nincs nyitott kérdés.
