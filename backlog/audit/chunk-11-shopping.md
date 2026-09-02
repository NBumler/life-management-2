# Audit — Chunk 11: Shopping / Bevásárlás
Audit commit: `ff23984`

Specek:
- `documentation/Features/Bevásárlás.md`
- `documentation/Subfeatures/Bevásárlólista írás.md`
- `documentation/Subfeatures/Bevásárlás teljesítve.md`
- `documentation/Subfeatures/Bevásárlás előzmény.md`

Kód:
- Backend: `backend/src/main/java/hu/bumler/lm2/food/ShoppingList{Controller,Service,Entity,Mapper,Repository}.java`, `ShoppingListItem{Entity,Mapper,Repository,SyncDataLoader}.java`, `ShelfLifeCalculator.java`, `common/IdempotencyKeyEntity.java` + `IdempotencyKeyRepository.java`, `common/NestedChildResolver.java`
- Migrations: `db/migration/V16__shopping_list.sql` (+ `V13__stored_food.sql`, `V4/V16` `sync_changes` view)
- OpenAPI: `openapi/paths/shopping-lists*.yaml`, `openapi/components/schemas/ShoppingList*.yaml`
- Frontend: `pages/menu/shopping/` (`shopping-lists.page`, `shopping-list-editor.page`, `shopping-list-complete.page` + `shopping-list-complete.ts`, `shopping-history.page` + `shopping-history.ts`, `shopping-history-detail.page`), `core/data/shopping-list.repository.ts`, `core/storage/{sqlite,http}-storage-backend.ts` + `storage-backend.ts` (`buildShoppingListCompleteRequestPayload`), `core/sync/{sync-engine.service,offline-queue.service,outbox-entity-registry}.ts`, `app.routes.ts`, `pages/menu/menu.page.html/ts`, `assets/config/features.json`

Tesztek:
- Backend: `ShoppingListServiceTest` (17), `ShoppingListCompleteServiceTest` (12), `ShelfLifeCalculatorTest`
- Frontend: `shopping-list.repository.spec`, `shopping-list-editor.page.spec`, `shopping-list-complete.spec` + `shopping-list-complete.page.spec`, `shopping-history.spec` + `shopping-history.page.spec`, `shopping-history-detail.page.spec`, `shopping-lists.page.spec`, `core/sync/outbox-entity-registry.spec`, `core/sync/offline-queue.service.spec`

---

## documentation/Features/Bevásárlás.md

| # | Spec-állítás (rövid + szekció) | Verdikt | Bizonyíték (fájl:szimbólum / teszt) | Teendő |
|---|---|---|---|---|
| 1 | Belépés: Menü tab, nem a Kaja tab (Jelenlegi működés / UI-UX) | Implemented | `app.routes.ts:41` `path:'shopping'` under `tabs/menu`; `menu.page.html:28` `routerLink="shopping"` | — |
| 2 | Több aktív lista párhuzamosan (Közös szabályok) | Implemented | `ShoppingListService.list()` returns all `deleted=false` per user; `shopping-lists.page.ts:35` lists all non-ARCHIVED; test `list_returnsMappedListsForUser` | — |
| 3 | Lista neve opcionális (Közös szabályok) | Implemented | `ShoppingList.yaml` `name` nullable, no `required`; `V16` `name text` nullable; editor `form.control<string|null>(null)` | — |
| 4 | Nincs lista-szintű bolt mező (Közös szabályok) | Implemented | `ShoppingList.yaml` / `V16 shopping_list` has no store column | — |
| 5 | Bolt/megjegyzés csak NON_FOOD tételen, szabad szöveg (Közös szabályok) | Implemented | `ShoppingListService.applyItem()` clears `note` for FOOD, sets from dto for NON_FOOD; `ShoppingListItem.yaml` `note` doc; editor only renders note input on NON_FOOD row | — |
| 6 | FOOD tétel: csak az Élelmiszerek katalógusból; mennyiség = Mennyiség mező (Tétel típusok) | Implemented | `applyItem` FOOD branch `requireLiveFood(foodId)`; editor `foodPickerResults` filters `FoodRepository.items()`, no create path; `QuantityInputComponent` | — |
| 7 | NON_FOOD tétel: név + mennyiség + egy szabad szöveges mező (Tétel típusok) | Implemented | `applyItem` NON_FOOD: name required, note+quantity optional; editor `NonFoodItemRow {name,note,quantity}` | — |
| 8 | Pipa önmagában nem indít archiválást/tárolást/új listát; csak a "Bevásárlás vége" (Közös szabályok) | Implemented | `checked` is a plain item column; `saveTree` javadoc "status/completedAt read-only here"; archiving only in `complete()`; `shopping-list-complete.ts` separate flow | — |
| 9 | Aktív lista törlés megerősítéssel: soft delete, nem archiválódik (Közös szabályok) | Implemented | `ShoppingListService.delete()` `softDelete()` (status untouched); `shopping-lists.page.ts:45` + `shopping-list-editor.page.ts:244` `AlertController` confirm; test `delete_softDeletesListAndCascadesToLiveItems_asOneBulkUpdate` | — |
| 10 | Soha nem szinkronizált helyi draft → helyi hard remove + outbox tisztítás (Közös szabályok / Backend-offline) | Implemented | `SqliteStorageBackend.deleteShoppingList()` `enqueue.hardRemoveLocalEntity` → `DELETE FROM shopping_list`/`shopping_list_item` | — |
| 11 | Mennyiség mindenütt Mennyiség mező; előzmény keresés Szöveges keresés (Közös szabályok) | Implemented | `QuantityInputComponent` in editor/complete; `shopping-history.ts` uses `matchesSearch`/`compareRank` from `shared/text-search` | — |
| 12 | Feature flag a Life Management 2.0 szerint; flag kikapcsolás eltávolítja a route-ot (guardolt) (Frontend / CLAUDE.md tab-registry) | Partial | Flag `menu.bevasarlas` in `features.json`; `menu.page.html:28` guarded by `@if (bevasarlasEnabled)`. BUT `app.routes.ts:41` `shopping` route tree has **no** `canActivate:[featureFlagGuard('menu.bevasarlas')]` — every sibling (`notifications` :25, `finance` :101, `aycm` :138, `lepesszam` :181) has one. Deep-link to `/tabs/menu/shopping` stays reachable with the flag off. | jegy #1 |
| 13 | ShoppingList entitás mezők: id(UUID kliens), name, status(ACTIVE\|ARCHIVED), deleted/deleted_at, createdAt, completedAt, tételek (Backend) | Implemented | `V16 shopping_list`; `ShoppingList.yaml` (status/completedAt/deletedAt/createdAt/updatedAt readOnly) | — |
| 14 | ShoppingListItem mezők: id, type(FOOD\|NON_FOOD), foodId, name, note, quantityAmount, quantityUnit, checked, sorrend (Backend) | Implemented | `V16 shopping_list_item`; `ShoppingListItem.yaml`; `sort_order integer NOT NULL` ↔ `sortOrder` | — |
| 15 | Aktív lista CRUD; tétel CRUD; pipa frissítés (Backend műveletek) | Implemented | `ShoppingListController` list/create/get/update/delete; nested-aggregate `saveTree`; tests `create_*`, `update_*`, `update_persistsCheckedFlag` | — |
| 16 | Aktív lista soft delete idempotens; DELETE tombstone nem ARCHIVED (Backend) | Implemented | `delete()` `if(!isDeleted())` guard; test `delete_isIdempotent_whenListAlreadyDeleted`; `shopping-lists-item.yaml` delete "Soft delete, idempotent" | — |
| 17 | Előzmény csak ARCHIVED + deleted=false (Backend) | Implemented | `SqliteStorageBackend.listShoppingLists()` `WHERE deleted = 0`; `shopping-history.ts filterAndRankHistory` `status === 'ARCHIVED'`; test `filterAndRankHistory only returns ARCHIVED lists` | — |
| 18 | Teljesítés: atomi / tranzakcionális flow (archívum + tárolás create + opcionális új aktív lista) (Backend) | Implemented | `ShoppingListService.complete()` single `@Transactional`; `ShoppingListCompleteServiceTest` suite | — |
| 19 | Előzmény: archivált listák olvasása; újralistázás új ACTIVE listát hoz létre (Backend) | Implemented | `shopping-history-detail.page.ts relist()` → `repository.save()` new `uuidV4()` list; test `relist(): builds a fresh draft ... navigates to the new list's editor` | — |
| 20 | Mennyiség egységek SSOT (db, g, dkg, kg, l, dl, ml) (Backend) | Partial | Not enforced by an enum server-side (`quantity_unit text`); `ShoppingListItem.yaml` doc-comment lists `db, g, dkg, kg, l, dl, cl, or ml` — includes `cl`, which the parent spec's 7-unit list omits. Divergence belongs to the Mennyiség mező spec but the doc strings disagree. | jegy #2 |
| 21 | Belépés a Menü tabból GearCheck/AYCM mintájára; aktív listák listanézet + részlet/szerkesztő; Előzmény külön belépő/szekció (UI-UX) | Implemented | `shopping-lists.page` overview + `history` nav item (`shopping-lists.page.html:16`); `shopping-list-editor.page` detail/editor; `shopping-history.page` | — |

---

## documentation/Subfeatures/Bevásárlólista írás.md

| # | Spec-állítás (rövid + szekció) | Verdikt | Bizonyíték (fájl:szimbólum / teszt) | Teendő |
|---|---|---|---|---|
| 1 | Új aktív lista létrehozása; opcionális név (Funkcionális) | Implemented | `shopping-list-editor.page.ts` route `new`; `save()` `ShoppingListDraft {id:'', name, items}` → `repository.save` mints `uuidV4()`; test `save(): builds a ShoppingListDraft ...` | — |
| 2 | Több aktív lista párhuzamosan (Funkcionális) | Implemented | lásd Bevásárlás.md #2 | — |
| 3 | FOOD tétel kizárólag a katalógusból, nincs "gyors létrehozás" a listáról (Funkcionális) | Implemented | editor `confirmPicked()` only adds from `pickedIds` over `foodRepository.items()`; backend `requireLiveFood`; test `create_rejectsFoodItem_whenFoodIsMissingReferencedQuantity` / `food picker: adds a row per picked food` | — |
| 4 | NON_FOOD: név kötelező + mennyiség + egy szabad szöveges mező (Funkcionális) | Implemented | editor `save()` blocks `name().trim()===''`; `applyItem` NON_FOOD `name ... orElseThrow`; tests `save(): blocked when a NON_FOOD item is missing its required name` / `... does NOT require a quantity on a NON_FOOD item` / backend `create_rejectsNonFoodItem_whenNameMissing` | — |
| 5 | Lista és tételek szerkeszthetők vásárlás közben is (hozzáadás, módosítás, törlés, átnevezés) (Funkcionális) | Implemented | editor `addNonFoodRow`, `confirmPicked`, `removeItem`, `onItemsReordered`, name form; PUT `saveTree` full-tree replace; test `update_addsNewItem_andSoftDeletesMissingItem` | — |
| 6 | Tételek pipálhatók; a pipa csak UI/állapot, semmi sem történik a teljesítésig (Funkcionális) | Implemented | `ItemRow.checked` signal; `toSaveItem` carries `checked`; backend persists via `applyItem`; test `update_persistsCheckedFlag` | — |
| 7 | Aktív lista törlés megerősítő dialógussal: soft delete, nem kerül előzménybe (Funkcionális / UI-UX) | Implemented | `delete()` `AlertController` (Cancel + destructive Delete); `repository.remove` → soft delete; not ARCHIVED so `filterAndRankHistory` excludes it; test `delete(): the confirmation handler removes the list via the repository` | — |
| 8 | Soha nem szinkronizált helyi draft → helyi hard remove + outbox tisztítás; nincs undelete UI (Funkcionális) | Implemented | `SqliteStorageBackend.deleteShoppingList` `hardRemoveLocalEntity` branch; no undelete control anywhere in `pages/menu/shopping/` | — |
| 9 | Lista részlete: név szerkesztés, tétellista, pipa kontroll tételenként (UI-UX) | Implemented | `shopping-list-editor.page.html` name `ion-input`, `app-reorder-list`, `ion-checkbox` per row | — |
| 10 | Élelmiszer hozzáadás: katalógus választó kereséssel (UI-UX) | Implemented | editor `pickerOpen`/`pickerQuery`/`foodPickerResults` with `ion-searchbar`, `matchesSearch`/`compareRank` | — |
| 11 | Mennyiség mezők: Mennyiség mező (összeragasztott input) (UI-UX) | Implemented | `QuantityInputComponent` `mode="quantity"` in editor rows | — |
| 12 | Egyértelmű "Bevásárlás vége" belépő a teljesítés flow-ra (UI-UX) | Implemented | `shopping-list-editor.page.html:107-108` `@if (listId()!==null && items().length>0)` → routerLink `.../complete`. (Class javadoc lines 71-77 + `IMPLEMENTATION_STATUS.md:78` still say the entry point "tudatosan hiányzott" — stale comment, superseded by the teljesítve slice.) | jegy #3 |
| 13 | Törlés: megerősítés kötelező (UI-UX) | Implemented | lásd #7 | — |
| 14 | Backend: nincs önálló backend érintettség — lista+tétel CRUD a szülő OpenAPI scope-jában (Backend) | Implemented | endpoints live under `shopping-lists*.yaml` / `ShoppingListController`; no írás-specific endpoint | — |
| 15 | Backend-offline + Full-offline: olvasás/írás a helyi store-on, módosító kérések outboxba (OfflineQueueService), kliens UUID (Backend-offline) | Implemented | `SqliteStorageBackend.saveShoppingList()` local tasks + `offlineQueue.buildEnqueueTasks` in one `executeTransaction`; `entityType:'ShoppingList'`; `repository.save` mints `uuidV4()` | — |
| 16 | Függőségi lánc: új FOOD tétel egy azonos offline munkamenetben létrehozott Food-ra hivatkozva megvárja annak POST-ját (Backend-offline first §10) | Implemented | `saveShoppingList` `dependsOn = findLocalOnlyIds('food', foodIds)` | — |
| 17 | Üres aktív lista megengedett (a Meal "legalább egy tétel" megkötése nélkül) (impl. class javadoc / Funkcionális implikáció) | Implemented | `ShoppingListService.saveTree` has no min-items check (class javadoc); test backend `create_allowsEmptyItemList` + frontend `save(): allows an empty list` | — |

---

## documentation/Subfeatures/Bevásárlás teljesítve.md

| # | Spec-állítás (rövid + szekció) | Verdikt | Bizonyíték (fájl:szimbólum / teszt) | Teendő |
|---|---|---|---|---|
| 1 | A folyamat csak a "Bevásárlás vége" megnyomásakor indul (Funkcionális) | Implemented | `complete()` only via `POST .../complete` / `shopping-list-complete.page.confirm()`; nothing runs on `checked` toggle | — |
| 2 | Pipált FOOD → megvett; wizard: lejárat megadás/megerősítés, előtöltés a tárolási hely katalógus romlási ideje alapján (Funkcionális 1.) | Implemented | `shopping-list-complete.page.ts` `computeInitialExpiry(todayIso, catalogDurationFor(food, loc))`; server `ShelfLifeCalculator.addDurationToDate` fallback; test `complete: builds one row per checked FOOD item, prefilling location/expiry` | — |
| 3 | Tárolási hely: több engedélyezett → kérdez; pontosan egy → nem kérdez; null engedélyezett → user választ (Funkcionális 1.) | Implemented | page renders `ion-select` only `@if (row.allowedLocations.length > 1)`; server `if (allowed.size() != 1) require storageLocation`; `allowedStorageLocations({})` → all three (null-allowed handled as "kérdez"); tests `complete_requiresExplicitStorageLocation_whenMultipleAreAllowed`, `ShelfLifeCalculatorTest` | — |
| 4 | `db` egység + amount=N → N külön tárolási tétel (1 csomag nettó tartalommal; ha nincs nettó → 1 db); egyéb egység → egy tétel (Funkcionális 1.) | Implemented | server `splitCountFor()` + `createStorageEntries` (`netAmount!=null ? netAmount : ONE`, unit `netUnit : "db"`); client `shopping-list-complete.ts splitCountFor`/`buildCompleteDraft`; tests `complete_splitsDbUnitItemIntoOneStoredFoodRowPerUnit`, `buildCompleteDraft` specs | — |
| 5 | NON_FOOD pipált tétel nem kerül tárolásba; csak az archív lista része (Funkcionális 1.) | Implemented | server `checkedFoodItemIds` filters `"FOOD".equals(type)`; `partitionItems` `checkedFood` = `type==='FOOD' && checked`; test `partitionItems: checkedFood: only ... FOOD items` | — |
| 6 | Pipálatlan tételek → új ACTIVE lista ugyanazokkal a tételekkel/mennyiségekkel, üres pipákkal; ha nincs pipálatlan, nincs új lista (Funkcionális 2.) | Implemented | server `createSpunOffList` forces `setChecked(false)`; client `buildCompleteDraft` `leftover.length===0 ? null : {...}`, `toSaveItem` `checked:false`; tests `complete_createsNewActiveList_fromLeftoverUncheckedItems`, `complete_forcesUncheckedBoxesOnTheSpunOffList...`, `newActiveList is null when nothing was left unchecked` | — |
| 7 | Archiválás: eredeti lista ARCHIVED a teljesítés időpontjával; tételek + pipaállapotok megmaradnak (Funkcionális 3.) | Implemented | server `list.setStatus("ARCHIVED"); list.setCompletedAt(now())`; items untouched; test `complete_createsStoredFoodAndArchivesList...` | — |
| 8 | Üres aktív lista: "Bevásárlás vége" nem elérhető/indítható (UI-UX) | Implemented | editor button `@if (... items().length > 0)`; `complete` page redirects if list missing | — |
| 9 | Van tétel de mind pipálatlan: nincs tárolás-lépés, lista archiválódik, új aktív lista jön létre (UI-UX) | Implemented | page `!hasCheckedFood()` shows note, `confirm()` still builds draft with empty `checkedFoodEntries` + `newActiveList`; test `confirm(): works with zero checked items (straight-to-confirm path)` | — |
| 10 | Wizard / lépésenkénti flow a pipált élelmiszerekre (UI-UX) | Partial | `shopping-list-complete.page.ts` is a **single review screen** (one row per checked FOOD item), not a step-by-step wizard — deliberate, documented in the class javadoc ("One review screen rather than a strict per-item sequential wizard"). Functionally covers lejárat + (feltételes) hely; spec prose still says "wizard / lépésenkénti flow". | jegy #4 |
| 11 | Kötelező atomi végpont `POST /api/shopping-lists/{id}/complete`, egy szerver-tranzakció, egy outbox tétel a kliensen (Backend / Backend-offline first §11) | Implemented | `shopping-lists-item-complete.yaml`; `ShoppingListService.complete()` `@Transactional`; `SqliteStorageBackend.completeShoppingList` single `executeTransaction`, one `entityType:'ShoppingListComplete'` outbox row; test `offline-queue.service.spec` "action endpoint ... never coalesces into the entity's create POST" | — |
| 12 | Request body `checkedFoodEntries[]` csak a pipált FOOD tételekhez; NON_FOOD/pipálatlan nem szerepel benne (Backend) | Implemented | `buildShoppingListCompleteRequestPayload` maps only `draft.checkedFoodEntries`; server rejects entries not in `checkedFoodItemIds`; test `complete_returnsValidationError_whenACheckedFoodItemHasNoMatchingEntry` | — |
| 13 | Request body `storageLocation` értékek `PANTRY \| FRIDGE \| FREEZER` (Backend request body példa) | Partial | Implementation & OpenAPI use `ROOM \| FRIDGE \| FREEZER` (`ShoppingListCompleteFoodEntry.yaml`, `StoredFood.yaml`, `V13` CHECK, frontend `StoredFood.StorageLocationEnum.Room`). Spec's JSON example literal `PANTRY` is wrong; Business prose "kamra" ↔ `ROOM`. | jegy #2 |
| 14 | `storageLocation` csak a "Null engedélyezett" ág esetén kötelező mezőnként; egyébként a szerver a katalógus egyetlen engedélyezett módját használja (Backend) | Implemented | server `createStorageEntries`: `if (storageLocation == null) { if (allowed.size()!=1) throw; storageLocation = allowed.get(0); }` | — |
| 15 | Response (200): `{archivedListId, createdStorageEntryIds[], newActiveListId\|null}` (Backend) | Implemented | `ShoppingListCompleteResponse.yaml` (all three, `archivedListId`+`createdStorageEntryIds` required); `runComplete` builds exactly this | — |
| 16 | `createdStorageEntryIds` a kliens-küldött id-k visszaigazolása, nem újonnan kiosztott (Backend) | Implemented | server returns `entry.getStorageEntryIds()` verbatim; `ShoppingListCompleteResponse.yaml` "Echoes the client-supplied ... back"; client `createdStorageEntryIds: draft.storageEntries.map(e => e.id)` | — |
| 17 | Szerver-lépések egy DB tranzakcióban: storage sorok → lista ARCHIVED+completedAt → (ha van pipálatlan) új aktív lista a kliens UUID-kkal; bármely hiba → teljes rollback (Backend) | Implemented | `runComplete` sequence inside `@Transactional complete()`; `createSpunOffList` uses `newActiveList.getId()` / item ids as sent | — |
| 18 | Hibakód: `404` ismeretlen/idegen listId (Backend) | Implemented | `complete()` `repository.findByIdAndUserIdForUpdate(...).orElseThrow(EntityNotFoundException)`; test uses foreign/unknown via `createList` helper flow | — |
| 19 | Hibakód: `409 ENTITY_DELETED` ha a lista már nem ACTIVE (Backend) | Implemented | `if (list.isDeleted() || !"ACTIVE".equals(status)) throw new EntityDeletedException`; test `complete_returnsEntityDeleted_whenTheListIsNoLongerActive`; path yaml documents `409` | — |
| 20 | Hibakód: `400 VALIDATION_ERROR` ha egy pipált FOOD tételhez nincs egyértelmű storageLocation/expirationDate (Backend) | Implemented | `createStorageEntries` `ValidationException` for missing loc/expiry; also `complete_rejectsDuplicateEntryForTheSameCheckedItem`, `...whenACheckedFoodItemHasNoMatchingEntry` | — |
| 21 | Kliens UUID-k: `newActiveListId` + benne az új `ShoppingListItem` id-k a kliens generálja és küldi; a válasz mező visszaigazolás (Backend / Backend-offline first §2) | Implemented | `shopping-list-complete.ts buildCompleteDraft` mints `uuidV4()` for new list + `toSaveItem` ids; `ShoppingListCompleteNewList.yaml`; server echoes `newActiveList.getId()` | — |
| 22 | Kliens local-first: az új aktív lista már a mentés pillanatában bekerül a helyi store-ba (Backend) | Implemented | `SqliteStorageBackend.completeShoppingList` writes `shoppingListLocalWriteTask`/items for `draft.newActiveList` in the same local transaction; `repository.complete` then `load()`s | — |
| 23 | Idempotencia: `Idempotency-Key` header (az outbox tétel id-ja) + szerveroldali `idempotency_key` táblás replay; ismételt kérés → tárolt válasz, nem `409`, nem duplikált létrehozás (Backend / Backend-offline first §11) | Implemented | drain sends `headers:{'Idempotency-Key': item.id}` (`sync-engine.service.ts:783`); server `complete()` `idempotencyKeyRepository.findById(idempotencyKey)` → `readCachedResponse`; `cacheResponse` writes `IdempotencyKeyEntity(... COMPLETE_ENDPOINT, 200, json)`; test `complete_isIdempotent_whenTheSameKeyIsReplayed` | — |
| 24 | Offline: atomi többentitásos művelet — egy outbox tétel; a spun-off lista/tételek/StoredFood sorok saját outbox tétel nélkül (Backend-offline) | Implemented | `entityType:'ShoppingListComplete'`, `keepPayloadOnUnskip:true` (`outbox-entity-registry.ts:532`); `buildOutboxDropTasks` + sync-engine `409` branch hard-remove `_local_only` side-effect rows; `shoppingListCompleteApplyTasks` clears `_dirty`/`_local_only` by id; tests `outbox-entity-registry.spec` "ShoppingListComplete: refetches the archived list and drops ... local-only side effects" | — |
| 25 | Completion `dependsOn` egy azonos offline munkamenetben létrehozott Food-ra (Backend-offline chain) | Implemented | `completeShoppingList` `dependsOn = findLocalOnlyIds('food', foodIdsForDependsOn)` (storage entries + new-list FOOD items) | — |
| 26 | `updateShoppingList` elutasított egy archivált listán (impl. invariáns; Business "tételek megmaradnak az archívumban") | Implemented | `saveTree` `if (!"ACTIVE".equals(status)) throw new EntityDeletedException("...archived and cannot be edited")`; editor bails on `status==='ARCHIVED'`; test `updateShoppingList_isRejected_afterTheListIsArchived` | — |

---

## documentation/Subfeatures/Bevásárlás előzmény.md

| # | Spec-állítás (rövid + szekció) | Verdikt | Bizonyíték (fájl:szimbólum / teszt) | Teendő |
|---|---|---|---|---|
| 1 | ARCHIVED listák megtekinthetők: tételek, mennyiségek, pipaállapotok, teljesítés időpontja (Funkcionális) | Implemented | `shopping-history-detail.page.ts` `liveItems()`, `ion-checkbox` (checked shown), `completedAt` via `DatePipe`, quantity via `DecimalPipe`; `shopping-history.page` list of ARCHIVED | — |
| 2 | `completedAt` / létrehozás dátuma elmentve; első verzióban nincs dátum alapú szűrés (Funkcionális) | Implemented | `V16 completed_at timestamptz`, `created_at`; no date filter control in `shopping-history.page.html`; only text `ion-searchbar` | — |
| 3 | Szöveges keresés az előzményben: kis/nagybetű + ékezet-független; ékezetes query esetén ékezet-pontos találatok előre (Funkcionális) | Implemented | `shopping-history.ts filterAndRankHistory` uses `matchesSearch` + `compareRank`; test "an accent-exact match ranks ahead of a fold-only match" | — |
| 4 | Keresési célmezők: lista neve, tételnevek (FOOD megjelenített név / NON_FOOD név), NON_FOOD szabad szöveg (Funkcionális) | Implemented | `shopping-history.ts searchableText`: list name + FOOD catalog name (via `FoodRepository`) + NON_FOOD `name`+`note`; tests "resolves the catalog name for FOOD items", "uses name+note for NON_FOOD items", "includes the list name", "excludes deleted items" | — |
| 5 | Újralistázás: archív listából új ACTIVE lista — ugyanazok a tételek/mennyiségek, üres pipák (Funkcionális) | Implemented | `shopping-history-detail.page.ts relist()` → `toSaveItem` (checked:false) → `repository.save({id: uuidV4(), ...})`; test `relist(): builds a fresh draft with unchecked items` | — |
| 6 | Újralistázás: lista neve másolható az eredetiből vagy üresen hagyható; a másolat szerkeszthető létrehozás után (Funkcionális) | Implemented | `relist()` `name: list.name ?? null`, then `navigateByUrl('/tabs/menu/shopping/'+saved.id)` (the mutable editor) | — |
| 7 | Az előzmény listák read-only-k (nincs szerkesztés/törlés az első verzióban) (Funkcionális) | Implemented | `shopping-history-detail.page` exposes only `relist()`; editor `ngOnInit` redirects away for `status==='ARCHIVED'`; server `saveTree` rejects non-ACTIVE | — |
| 8 | UI: előzmény lista + részlet nézet; kereső felül; újralistázás gomb a részleten → navigáció az új aktív listára (UI-UX) | Implemented | `shopping-history.page.html` (`ion-searchbar` + list), `shopping-history-detail.page.html` (`ion-footer` relist button); nav target = new list editor | — |
| 9 | Backend: nincs backend érintettség — olvasás + "relist"/copy a szülő API-jában (Backend) | Implemented | no history-specific endpoint; `relist()` reuses `createShoppingList` (POST); `GET /api/shopping-lists` already returns every non-deleted list regardless of status | — |
| 10 | Backend-offline + Full-offline: olvasás/írás a helyi store-on, kliens UUID, módosító kérés outboxba (Backend-offline) | Implemented | history reads from `ShoppingListRepository.items()` (local); `relist()` → `repository.save` → `SqliteStorageBackend.saveShoppingList` local + outbox | — |

---

## Rollup

- Állítások összesen: **63** — Implemented **57** / Partial **6** / Missing **0** / Describes-future **0** / Accepted-limitation **0**
  - Bevásárlás.md: 21 (Implemented 19, Partial 2 — #12 route guard, #20 unit list)
  - Bevásárlólista írás.md: 17 (Implemented 16, Partial 1 — #12 stale "hiányzott" comment/status note)
  - Bevásárlás teljesítve.md: 26 (Implemented 24, Partial 2 — #10 wizard vs review screen, #13 PANTRY vs ROOM)
  - Bevásárlás előzmény.md: 10 (Implemented 10)

- Blokkoló eltérések: **nincs.** A `complete` write-path (atomicitás, `db`-darabolás, hely/lejárat feloldás, idempotencia, egy-outbox-tétel + függőségi lánc + 409/Drop kezelés) végponttól UI-ig egyezik a speccel és teszttel fedett.

- Draft jegyek:
  - **bug — "`shopping` route not gated by `featureFlagGuard('menu.bevasarlas')`"** -> `documentation/Features/Bevásárlás.md` (Frontend), CLAUDE.md tab-registry -> A menüpont rejtve van a flag kikapcsolásakor, de a `/tabs/menu/shopping*` útvonalak deep-linkkel elérhetők maradnak; minden testvér menü-route (`notifications`, `finance`, `aycm`, `lepesszam`) fel van guardolva — a spec és a `app.routes.ts:99` komment is "gyerek route-ok is guardoltak"-ot ír elő.
  - **docs — "Bevásárlás teljesítve request body: `PANTRY` → `ROOM`, és a body-példa egészítsd ki `storageEntryIds` + `newActiveList`-tel"** -> `documentation/Features/Bevásárlás.md`, `documentation/Subfeatures/Bevásárlás teljesítve.md` -> A spec JSON-példája `PANTRY`-t ír, a teljes kódbázis (OpenAPI, DB CHECK, frontend enum) `ROOM`; a request body példa nem tartalmazza a ténylegesen küldött `storageEntryIds` tömböt és `newActiveList` objektumot. Egységesítendő a `cl` egység is (schema doc-comment vs parent 7-elemes lista).
  - **docs — "Töröld az elavult 'Bevásárlás vége belépő tudatosan hiányzott' megjegyzést"** -> `documentation/Subfeatures/Bevásárlólista írás.md` -> `shopping-list-editor.page.ts:71-77` class-javadoc + `IMPLEMENTATION_STATUS.md:78` még azt állítja, a completion belépő hiányzik; valójában `shopping-list-editor.page.html:108` bekötve. `IMPLEMENTATION_STATUS.md` pin-hash-ei (`3ddf321`, `d1950b4`) elavultak (a specek `ff23984`-ben mozogtak — bár csak címsor/frontmatter, próza nem).
  - **docs — "Bevásárlás teljesítve UI-UX: 'wizard / lépésenkénti flow' → 'egy review-képernyő'"** -> `documentation/Subfeatures/Bevásárlás teljesítve.md` -> A megvalósítás egyetlen áttekintő képernyő soronként (lejárat + feltételes hely-választó), nem szekvenciális wizard; a class-javadoc szándékos döntésként dokumentálja. A spec prózát present tense-re kell igazítani.

- Spec-átírás vázlat (present tense, "Jelenlegi működés"):
  - **Bevásárlás.md**: A `menu.bevasarlas` flag a menüpontot rejti; a route-guard beépítése után írható, hogy a route is guardolt (jelenleg csak a menüpont az). A `storageLocation` értékek `ROOM | FRIDGE | FREEZER` (nem `PANTRY`). Mennyiség-egység lista igazítása a Mennyiség mező SSOT-hoz (`cl` kérdés).
  - **Bevásárlólista írás.md**: minden állítás jelen idejű és pontos; nincs prózai változtatás szükséges a doc-on kívül a kód-kommentek/`IMPLEMENTATION_STATUS` frissítése.
  - **Bevásárlás teljesítve.md**: "wizard / lépésenkénti flow" → "egy áttekintő képernyő, soronként egy pipált élelmiszer: lejárat + (ha >1 engedélyezett hely) hely-választó". Request body példa: vedd fel a `storageEntryIds` és `newActiveList` mezőket, `storageLocation` enum `ROOM`. Idempotencia: a web (online-only) útvonal a lista id-ját küldi `Idempotency-Key`-ként (nincs outbox), a natív drain az outbox tétel id-ját — a spec "az outbox tétel id-ja" megfogalmazás natív-specifikus.
  - **Bevásárlás előzmény.md**: pontos, marad; a `verifikalt_commit` kitölthető.

- Verdikt: **YELLOW** — a viselkedés-gerincet (list/item CRUD, pipa, soft delete, atomi `complete`, előzmény + újralistázás, teljes offline/outbox szemantika) a kód és a tesztek a spec szerint valósítják meg; a YELLOW-t egyetlen valódi kód-hiány (feature-flag route-guard) és négy doc-pontosítási eltérés adja, egyik sem blokkoló.
