---
verifikalva: 2026-09-02
verifikalt_commit: 279a21b
---

# AYCM elfogadóhely hozzáadása

## Business

| | |
|---|---|
| **Státusz** | `Kész` |
| **Szülő** | [[AYCM tracker]] |
| **Kapcsolódó** | [[AYCM tracker]], [[AYCM Check-In]], [[AYCM Statisztikák]], [[Szöveges keresés]], [[Nyelv választás]], [[Dark&Light mode]], [[Bejelentkezés]], [[Backend-offline first]], [[Szinkronizációs központ]] |

### Jelenlegi működés

User-owned AYCM elfogadóhelyek (partnerek) és ársávjaik. A wiki-cím a create-flow; a spec **teljes CRUD**. Nincs külön nyitvatartás-tábla: az árszabály **az** idősáv.

Belépés: [[AYCM tracker]] hub → elfogadóhelyek. A [[AYCM Check-In]] csak **élő** partnert választ (nincs inline create).

**Ownership:** **user-owned** — [[Bejelentkezés]].

Jelenleg: kézi partner-felvitel, nincs cím / térkép / `active` mező, nincs éjfélen átnyúló sáv, nincs szabály-duplikálás / seed / undelete, nincs inline partner-create a Check-Inről, nincs külön top-level szabálylista. Tervezett bővítmények:

> Tervezett: `backlog/039-aycm-hivatalos-partner-katalogus-import-terkep-cim.md`, `backlog/043-aycm-arsav-ejfelen-atnyulo-idosav.md`

### Funkcionális leírás

#### Entitás — `AycmPartner`

| Mező | Típus / szabály |
|---|---|
| `id` | UUID, kliens generálja |
| `name` | Kötelező; trim után nem üres; **egyedi a user élő partnerei között** — összehasonlítási szabály: [[Névegyediség]]. Törölt név újra felvehető. |
| `notes` | Opcionális szabad szöveg |
| `deleted` | Soft delete (`false` default); listák / picker szűrik |
| `createdAt` / `updatedAt` | Audit |

Nincs `active`, cím, GPS. **Üres start:** nincs seed. **0 szabály** menthető.

#### Entitás — `AycmPriceRule`

| Mező | Típus / szabály |
|---|---|
| `id` | UUID, kliens generálja |
| `partnerId` | UUID → `AycmPartner`; kötelező |
| `label` | Opcionális; trim. Üres → megjelenő név = **idősáv-fallback** (`08:00–12:00`, `end = 24:00` → `…–24:00`) |
| `appliesMon` … `appliesSun` | 7 boolean; **legalább egy** `true` |
| `startTime` | `HH:mm`; `00:00`–`23:59` (perc) |
| `endTime` | `HH:mm`; `startTime` **után**, max **`24:00`**. Félzárt `[start, end)`. Nincs éjfél-átlépés (`end > start` percben, `24:00` = 1440 perc). |
| `listPriceHuf` | Kötelező egész `≥ 0`. **`visitValueHuf = listPriceHuf`** ([[AYCM tracker]]) |
| `coPaymentHuf` | Kötelező egész `≥ 0`, default `0`. Snapshot metaadat, nem adódik a `visitValue`-hoz |
| `deleted` | Soft delete |
| `createdAt` / `updatedAt` | Audit |

Perc: `start ∈ [0, 1439]`, `end ∈ (start, 1440]`. Check-In idő soha nem `24:00`.

#### Átfedés

Ugyanazon élő (`deleted = false`) partneren, **adott héten napon** (ahol mindkét sáv `applies*`): a `[start, end)` intervallumok **diszjunktak**. Szomszédos OK (`end = 12:00` és `start = 12:00`). Rés a napon OK (ott Check-In → 0 Ft).

Ütközés mentéskor → validációs hiba; a UI megmondja a két sáv megjelenő nevét. Kliens + szerver.

#### Megjelenő sávnév (`displayLabel`)

```
displayLabel(rule) =
  label trimelve nem üres → label
  különben → startTime + "–" + endTime   // pl. 08:00–12:00
```

Check-In snapshot `ruleLabel` = `displayLabel` a **rögzítés** pillanatában. Későbbi címke-szerkesztés a múltat nem írja felül.

#### Illesztés SSOT (`matchPriceRule`)

A [[AYCM Check-In]] ezt hívja, nem másolja.

Bemenet: élő partner `id`, `checkInDate` (`YYYY-MM-DD`, kliens TZ → hét napja), `checkInTime` (`HH:mm`, 0–1439 perc).

1. Élő szabályok (`deleted = false`) a partneren.
2. A dátum hét napján `applies* = true`.
3. `startMinutes ≤ checkInMinutes < endMinutes`.
4. Átfedés-mentesség miatt **legfeljebb egy** találat.

Kimenet: a szabály **vagy** nincs találat (0 szabály / lyuk / rossz nap).

Nincs találat → Check-In: `visitValueHuf = 0`, `listPriceHuf = 0`, `coPaymentHuf = 0`, `ruleLabel` üres vagy „—”, sárga; a sor mentődik.

#### CRUD — partner

- Lista, create, edit, törlés. **Duplikálás nincs.**
- Create: notes opcionális; szabályok utána a szerkesztőn (0 szabállyal is menthető). (A `name` mező auto-focusa jelenleg nincs bekötve — tervezett: `backlog/038-aycm-partner-create-name-mezo-auto-focus.md`.)
- **Törlés:** megerősítés a névvel + élő sávok száma. Soft delete a partnerre **és** az összes élő szabályára (cascade). [[AYCM Check-In]] sorok **nem** törlődnek (snapshot). Pickerből kiesik.

#### CRUD — szabály

- **Csak** a partner szerkesztőn. Nincs top-level szabály-route a hubon.
- Lista a szerkesztőn: `startTime` növekvő, majd `displayLabel`.
- Create / edit / törlés (confirm a `displayLabel`-lel). Soft delete; múltbeli Check-In érintetlen.
- Mentés: nap-flag, idősáv, árak, overlap.

Soft delete szerződés: [[Backend-offline first]] (tombstone, idempotens `DELETE`, saját törölt `GET` → 200 + `deleted`, `PUT` töröltön nem undo). Soha nem syncelt draft → hard remove + outbox purge ([[Szinkronizációs központ]]).

### UI/UX elvárások

- **Belépés:** [[AYCM tracker]] hub → elfogadóhelyek. Flag: **AYCM tracker**.
- Route pl. `/tabs/menu/aycm/partners`, `/tabs/menu/aycm/partners/new`, `…/:id`.
- **Lista:** kereső ([[Szöveges keresés]], `name` + `notes`); sor: név, élő sávok száma. Sorrend: `name`. Üres: CTA új partnerre. Szűrt üres ≠ globális üres.
- Create / edit: név, notes; alatta sávok (hozzáadás / szerkesztés / törlés). Idő: platformos time picker; `endTime`-nál **Nap vége (`24:00`)** opció. Árak: egész Ft. Napok: 7 checkbox, i18n ([[Nyelv választás]]).
- Check-In picker: csak `deleted = false`; üres lista → CTA **erre** a listára (nincs inline create).
- Törlés: confirmation. Kontraszt: [[Dark&Light mode]].

### Megjegyzések

A hub napi-egy / megéri-e / `visitValue` szerződése: [[AYCM tracker]]. A Check-In űrlap és snapshot: [[AYCM Check-In]].

### Nyitott kérdések

Nincs nyitott kérdés.

## Architektúra

### Frontend

- Képernyők: `AycmPartnerListPage`, `AycmPartnerEditPage` (sávok a szerkesztőn, modal vagy inline űrlap — nem külön menü).
- Pure TS: perc-konverzió, `displayLabel`, overlap, `matchPriceRule`.
- Kereső: [[Szöveges keresés]]. OpenAPI kliens; mutációk offline rétegen.
- Partner create → szabály `POST`: FIFO + `targetEntityId` függőség, ha ugyanabban a flowban jön létre a partner.

#### Backend-offline

- Olvasás / írás helyi store Backend-offline és Full-offline.
- Partner / szabály create / update / delete → outbox + kliens UUID; sync: [[Szinkronizációs központ]].
- `matchPriceRule` / overlap **mindig** kliens TS (nincs homokóra).
- Partner `DELETE`: helyi cascade `deleted` a szabályokon + outbox partner `DELETE` (szerver cascade). Check-In store **érintetlen**.
- Soha nem syncelt draft: hard remove + outbox purge. Pull: `deleted = true` → kiesik; pending `PUT` eldobandó. Lásd [[Backend-offline first]].

### Backend

- Táblák:
  - `aycm_partner` (`id` UUID, `user_id`, `name`, `notes` nullable, `deleted` / `deleted_at`, audit)
  - `aycm_price_rule` (`id` UUID, `user_id`, `partner_id`, `label` nullable, `applies_mon` … `applies_sun`, `start_time`, `end_time` (string `HH:mm` vagy perc; `24:00` / 1440 engedélyezett end-en), `list_price_huf`, `co_payment_huf`, `deleted` / `deleted_at`, audit)
- Egyediség: `(user_id, name_normalized)` partial unique a partneren `WHERE deleted = false` — [[Névegyediség]].
- Overlap: szerver is ellenőrzi élő szabályokon (ugyanaz a partner, közös nap, intervallum-metszet).
- Check: `list_price_huf ≥ 0`, `co_payment_huf ≥ 0`, ≥1 nap flag, `end > start`.
- OpenAPI (listák implicit `deleted = false`):

| Metódus | Útvonal | Leírás |
|---|---|---|
| `GET` `POST` | `/api/aycm-partners` | Lista / create |
| `GET` `PUT` `DELETE` | `/api/aycm-partners/{id}` | `DELETE` = soft delete + cascade szabályok |
| `GET` `POST` | `/api/aycm-partners/{id}/price-rules` | Élő sávok / create |
| `GET` `PUT` `DELETE` | `/api/aycm-partners/{id}/price-rules/{ruleId}` | `DELETE` = soft delete a sávon |

- Idegen / más user `id` → 404. Saját törölt partner/szabály `GET` by id → 200 + `deleted`. `DELETE` idempotens. Auth: [[Bejelentkezés]].
- Nincs Check-In törlés a partner `DELETE`-től.

### Nyitott kérdések

Nincs nyitott kérdés.
