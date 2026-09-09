---
id: 99
type: change-request
status: done
title: Bevásárlólista — „tárolóba mentés" toggle (alapból bekapcsolva)
specs:
  - "[[Bevásárlólista írás]]"
  - "[[Bevásárlás teljesítve]]"
  - "[[Élelmiszer tárolás]]"
flag:
created: 2026-09-09
closed: 2026-09-09
---

# 99 — Bevásárlólista — „tárolóba mentés" toggle (alapból bekapcsolva)

## Motiváció / probléma

A bevásárlólistán legyen egy kapcsoló: **teljesítéskor a pipált tételek bekerüljenek-e a
tárolóba (`StoredFood`)** vagy sem. Alapértelmezés: **be** (a jelenlegi viselkedés). Az ok:
nem mindig otthonra vásárolok — pl. útközben, más helyre írok bevásárlólistát, és olyankor nem
akarom a saját otthoni készletembe felvenni a tételeket.

## Jelenlegi működés

[[Bevásárlás teljesítve]]: a pipált élelmiszer → tárolási tétel(ek) (`StoredFood`), a darabolási
szabályok szerint. Ez **mindig** megtörtént, nem volt kikapcsolási lehetőség.

## Elfogadási kritériumok

- [x] Lista-szintű `saveToStorage` boolean a `ShoppingList`-en, default `true`.
- [x] A [[Bevásárlás teljesítve]] wizard tiszteletben tartja: `false` esetén **nem** hoz létre
      `StoredFood` sorokat (a wizard hely/lejárat lépése kimarad, üres `checkedFoodEntries`), a
      többi (archiválás, spinoff lista) változatlan.
- [x] A kapcsoló a **lista szerkesztőn** van (`ion-toggle` a név alatt, magyarázó `ion-note`-tal).
- [x] Perzisztált mező a `ShoppingList`-en (OpenAPI + `V36` + `SCHEMA_V35`); a nested aggregate
      PUT/POST írja, mint a `name`-et; hiányzó / `null` = `true`.
- [x] Outbox-hatás: `OUTBOX_PAYLOAD_SCHEMA_VERSION` v3 → v4, `ShoppingList` migrátor-lépés
      (`addShoppingListSaveToStorageDefault`: hiányzó kulcs → `true`), `verify:outbox` snapshot
      újra-elfogadva. `ShoppingListComplete` payload érintetlen.
- [x] `#### Backend-offline`: a toggle és a teljesítés Full-offline is működik (helyi
      `shopping_list.save_to_storage`, helyi complete mirror üres `storageEntries`-szel). A szerver a
      **perzisztált** `saveToStorage`-ot olvassa (nem a request body-ból); a PUT a FIFO outboxban a
      complete POST elé drainel.
- [x] A spun-off (pipálatlanokból születő) új lista és az [[Bevásárlás előzmény]] „Újralistázás" is
      **örökli** a `saveToStorage` értéket (backend `createSpunOffList` + kliens draft).

## Terv / döntési napló

- **Nem** a `ShoppingListCompleteRequest`-en él a flag, hanem a perzisztált `ShoppingList`-en — így
  a completion wire-shape változatlan, csak a `ShoppingList` payload-hash mozdul.
- A `splitCountFor` / darabolási logika érintetlen — csak az a döntés változik, hogy a `runComplete`
  kiírja-e a `StoredFood` sorokat. `saveToStorage = false` + nem üres `checkedFoodEntries` →
  `VALIDATION_ERROR` (stale kliens védelme).
- Nem-élelmiszer tételekre nincs hatás (eddig sem volt).

## Lezáráskor (on-done)

- Frissített specek: [[Bevásárlólista írás]] (lista mező + toggle UI + Backend), [[Bevásárlás
  teljesítve]] (`saveToStorage` ág a funkcionális leírásban, UI-ban és a Backend request/logika
  részben), [[Élelmiszer tárolás]] („Létrehozás — bevásárlásból" feltétele), [[Bevásárlás]]
  (`ShoppingList` mezőtábla). Stamp: `verifikalva: 2026-09-09`, `verifikalt_commit: 1d1b15c`.
- `IMPLEMENTATION_STATUS.md`: `2026-09-09 — #99` sor.
- Kód — backend: `V36__shopping_list_save_to_storage.sql`, `ShoppingListEntity`/`Mapper`/`Service`,
  `openapi/components/schemas/ShoppingList.yaml`, `ShoppingListServiceTest` +
  `ShoppingListCompleteServiceTest` (4 új eset).
- Kód — frontend: `api/model/shoppingList.ts` (gen:api), `core/data/local-rows.ts`,
  `core/storage/{storage-backend,sqlite-storage-backend,http-storage-backend,local-database}.ts`,
  `core/sync/{offline-queue.service,outbox-migrator}.ts` + snapshot, `pages/menu/shopping/*`
  (editor, complete page + pure builder, history-detail relist), i18n `hu`/`en`, érintett `*.spec.ts`.
- Green gate: FE lint ✓ · `test:ci` 1617 ✓ · build ✓ · `verify:outbox` v4 ✓ · BE `gradlew test` ✓.
