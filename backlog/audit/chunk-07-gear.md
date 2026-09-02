# Audit — Chunk 07: Gear / GearCheck
Audit commit: `ff23984`
Specek: `documentation/Features/GearCheck.md`, `documentation/Subfeatures/Eszközök.md`, `documentation/Subfeatures/Sablonok.md`, `documentation/Subfeatures/Pakolás.md`
Kód: `backend/src/main/java/hu/bumler/lm2/gear/**`, `backend/src/main/resources/db/migration/V6..V8`, `backend/.../common/NestedChildResolver.java`, `frontend/src/app/pages/menu/gear/**`, `frontend/src/app/core/data/{gear-item,packing-template,packing-session}.repository.ts`, `frontend/src/app/core/storage/sqlite-storage-backend.ts`, `frontend/src/app/core/data/local-rows.ts`, `frontend/src/app/shared/{status-cycle-card,gear-item-picker,reorder-list}/**`
Tesztek: backend `gear/` (GearItem{Service,Integration}Test, PackingTemplate{Service,Integration}Test, PackingSession{Service,Integration}Test, PackingSessionItemServiceTest); frontend `pages/menu/gear/**/*.spec.ts` (5), `core/data/{gear-item,packing-template,packing-session}.repository.spec.ts`

## documentation/Features/GearCheck.md
| # | Spec-állítás (rövid + szekció) | Verdikt | Bizonyíték | Teendő |
|---|---|---|---|---|
| 1 | Menü alatti belépő, három subfeature: Eszközök \| Sablonok \| Pakolás (Frontend) | Implemented | `gear-check.page.html` 3 routerLink (`items`/`templates`/`sessions`) | — |
| 2 | Ownership: user-owned (Business) | Implemented | minden `gear`-entitás `user_id NOT NULL` (V6–V8); service-ek `currentUser.id()`-ra szűrnek | — |
| 3 | Korlátlan párhuzamos futó pakolás (Business) | Implemented | nincs "egy aktív" unique constraint (V8); `PackingSessionIntegrationTest` idempotens create, list createdAt desc | — |
| 4 | Backend-offline: helyi store olvasás/írás, mutáció outboxba, kliens UUID (Architektúra) | Implemented | `sqlite-storage-backend.ts` minden gear write = local task + `offlineQueue.buildEnqueueTasks`; `uuidV4()` a repókban | — |
| 5 | Közös API a gyerekekben: GearItem, PackingTemplate(+items), PackingSession(+items) (Backend) | Implemented | `gear/` package szerkezet + generált API interfészek | — |
| 6 | Nincs saját UI/UX (UI/UX) | Implemented | hub csak navigáció | — |

## documentation/Subfeatures/Eszközök.md
| # | Spec-állítás (rövid + szekció) | Verdikt | Bizonyíték | Teendő |
|---|---|---|---|---|
| 1 | `GearItem.id` UUID, kliens generálja (Entitás) | Implemented | `GearItemRepository.save` `uuidV4()`; `@Id UUID` no IDENTITY | — |
| 2 | `name` kötelező, egyedi a user élő katalógusán, [[Névegyediség]] | Implemented | `idx_gear_item_user_id_name_normalized ... WHERE deleted = false` (V6); `GearItemService.applyName` pre-check + `UniqueViolationException(conflictingId)`; kliens `GearItemNameConflictError`; tesztek `create_throwsUniqueViolationWithConflictingId…`, repo `save(): throws … before writing` | — |
| 3 | `notes` opcionális szabad szöveg (Entitás) | Implemented | `notes` nullable oszlop/DTO; form egysoros `ion-input` (kozmetikai) | — |
| 4 | `deleted` soft delete default false; listák szűrik | Implemented | `findByUserIdAndDeletedFalseOrderByNameAsc`; `listGearItems` `WHERE deleted = 0` | — |
| 5 | `createdAt`/`updatedAt` audit | Implemented | DB `set_updated_at` trigger + `@Generated` | — |
| 6 | Nincs `quantity`/`category`/`isFavorite` — Nem scope | Describes-future | entitás csak `name`/`notes`; spec explicit "Nem scope" | — |
| 7 | Törölt név újra felvehető (egyediség csak élő sorokra) | Implemented | partial index; `GearItemIntegrationTest.create_allowsTheNameAgain_afterTheOriginalItemWasDeleted` | — |
| 8 | Üres start, nincs seed | Implemented | nincs gear seed loader (vö. `GearItemSyncDataLoader` = csak delta pull) | — |
| 9 | CRUD: lista / létrehozás / szerkesztés / törlés | Implemented | `GearItemController` + `GearItemsPage` inline create/edit | — |
| 10 | Törlés: soft delete + cascade, megerősítő dialógus kötelező | Implemented | `GearItemsPage.delete` `AlertController`; `GearItemService.delete` softDelete + cascade | — |
| 11 | Cascade soft delete minden élő sablon-tételre (`gearItemId`) | Implemented | `GearItemService.delete` → `templateItemRepository.findByGearItemIdAndUserIdAndDeletedFalse`; tesztek `delete_cascadesToLiveTemplateItemsReferencingIt`, `deletingAGearItem_cascadesToItsLiveTemplateItems` | — |
| 12 | Cascade soft delete minden futó pakolás-tételre | Implemented | ua. `sessionItemRepository…`; `delete_cascadesToLiveSessionItemsReferencingIt`, `deletingAGearItem_cascadesToItsLiveSessionItems_butLeavesTheSessionItself` | — |
| 13 | Megerősítő szöveg jelzi (ha ismert) hány sablonból / aktív pakolásból törlődik | Implemented | `buildDeleteConfirmMessage` + `GEAR.ITEMS.DELETE_CONFIRM_CASCADE`; `countGearItemReferences` (DISTINCT template_id / session_id), `null` weben; `gear-items.page.spec.ts` 3 eset | — |
| 14 | Nem cascade-eli más userek adatait | Implemented | cascade query-k `AndUserId` szűréssel | — |
| 15 | Nincs undelete UI | Implemented | nincs ilyen kód | — |
| 16 | Soha nem syncelt draft → helyi hard remove + outbox purge | Implemented | `deleteGearItem` `enqueue.hardRemoveLocalEntity` → `DELETE FROM gear_item`; `OfflineQueueService` purge | — |
| 17 | Sablon/pakolás `gearItemId`-re hivatkozik (nem név-másolat) | Implemented | FK oszlopok; session név = élő join | — |
| 18 | Új `GearItem` csak ezen a képernyőn; picker csak meglévőt ad | Implemented | `GearItemPickerComponent` csak `picked` event meglévő sorra, nincs create | — |
| 19 | Megosztott picker (kereső + lista), csak `deleted = false` | Implemented | `GearItemPickerComponent` `repository.items()` (deleted=0 betöltés), `matchesSearch` | — |
| 20 | Lista: kereső; soron `name` + opcionális `notes` előnézet | Implemented | `gear-items.page.html` `ion-searchbar` + `h3`/`p`; `compareRank`/`matchesSearch` | — |
| 21 | Create/edit: `name` kötelező, `notes` opcionális, `name` auto-focus create-nél | Implemented | `Validators.required`; `[autofocus]="editingId() === 'new'"` | — |
| 22 | Tábla `gear_item` + unique `(user_id, name_normalized)` élő sorokra | Implemented | V6 | — |
| 23 | Minden művelet `userId`-ra szűr; idegen `id` → 404; saját törölt `GET` → 200 + `deleted` | Implemented | `findByIdAndUserId` + `EntityNotFoundException`; `get_returnsNotFound_whenItemBelongsToAnotherUser`, `delete_isIdempotent_andOwnDeletedRowStillReturns200OnGet` | — |
| 24 | `DELETE` idempotens (már törölt → 200) | Implemented | `delete` `if (!entity.isDeleted())` guard; `delete_isIdempotent_whenItemAlreadyDeleted` | — |

## documentation/Subfeatures/Sablonok.md
| # | Spec-állítás (rövid + szekció) | Verdikt | Bizonyíték | Teendő |
|---|---|---|---|---|
| 1 | `PackingTemplate.id` UUID kliens (Entitás) | Implemented | `PackingTemplateRepository.save` `uuidV4()` | — |
| 2 | `name` kötelező, egyedi a user élő sablonjai közt | Implemented | `idx_packing_template_user_id_name_normalized … WHERE deleted = false` (V7); `applyName` pre-check; `PackingTemplateNameConflictError`; `create_throwsUniqueViolationWithConflictingId…` | — |
| 3 | `notes` opcionális | Implemented | nullable oszlop/DTO | — |
| 4 | `deleted` soft | Implemented | `findByUserIdAndDeletedFalseOrderByNameAsc` | — |
| 5 | audit mezők | Implemented | trigger + `@Generated` | — |
| 6 | `PackingTemplateItem`: id, templateId, gearItemId, sortOrder (manuális), deleted, audit | Implemented | `PackingTemplateItemEntity`; V7 | — |
| 7 | Egy sablonon `gearItemId` legfeljebb egyszer | Implemented | `idx_packing_template_item_template_gear … WHERE deleted = false` (V7) | — |
| 8 | CRUD + másolás (duplikálás) | Implemented | `PackingTemplateController` + `PackingTemplateRepository.duplicate` (kliensoldali) | — |
| 9 | Üres sablon engedélyezett (0 tétel) | Implemented | nincs min-item validáció; `GEAR.TEMPLATES.ITEMS_EMPTY` | — |
| 10 | Tétel: meglévő `GearItem` pickerrel; eltávolítás nem törli a katalógust | Implemented | `onItemPicked` / `onRemoveItem` csak draft item listát módosít | — |
| 11 | Pickerben a már bent lévők disabled + lista végére | Implemented | `GearItemPickerComponent.sortedItems` excluded → `disabled` tömb a végére | — |
| 12 | Sorrend: web DnD / telefon fel-le nyilak; `sortOrder` mentve; több sablon uniója sorrend-szabály | Implemented | `ReorderListComponent` (`isNative` arrows / `ion-reorder-group`); `PackingSessionRepository.start` union teszt `first occurrence wins` | — |
| 13 | Duplikálás: új sablon + másolt tételek (új UUID), név `„{eredeti} (másolat)"`, ütközésnél számozás | Implemented | `duplicate()` + `uniqueDuplicateName`; `packing-template.repository.spec.ts` `auto-numbers the copy name` | — |
| 14 | A másolat független; eredeti + katalógus változatlan | Implemented | `duplicate` friss id-kkel a normál `save()` úton | — |
| 15 | Törlés: soft delete sablon + összes tétel; confirmation kötelező | Implemented | `PackingTemplateService.delete` cascade; `PackingTemplatesPage.delete` alert; `delete_softDeletesTemplateAndCascadesToLiveItems` | — |
| 16 | Soha nem syncelt draft → helyi hard remove + outbox purge | Implemented | `deletePackingTemplate` `isNewTemplate` → `DELETE FROM …` | — |
| 17 | Futó pakolás érintetlen; dialógus: „aktív pakolást nem törli" | Implemented | `delete` csak template + template-item sorokat érint; `GEAR.TEMPLATES.DELETE_CONFIRM_MESSAGE` = "… Az aktív pakolást nem törli."; `delete_cascadesToLiveItems_butLeavesGearItemCatalogUntouched` | — |
| 18 | Katalógus nem törlődik; nincs undelete UI; törölt sablonnév újra felvehető | Implemented | delete nem nyúl `gear_item`-hez; partial unique index | — |
| 19 | Eszköz törlés → cascade soft delete a sablon-tételekből | Implemented | lásd Eszközök #11 | — |
| 20 | Sablon szerkesztés futó pakolás mellett: engedélyezett, a futó lista nem követi | Implemented | `packing_session_item` független sorok, nincs propagáció a session detail-ben | — |
| 21 | Új `GearItem` csak az Eszközök képernyőn | Implemented | picker nincs create | — |
| 22 | Lista soron: `name`, opcionális `notes` előnézet, **tételszám**; műveletek open/edit, másolás, törlés | Partial | `packing-templates.page.html`: `h3` név + `p` notes + copy/trash gomb — **tételszám nincs** a soron (`templates` signal csak metaadatot tart, az item lista `getDetail()`-lel töltődik) | feat — sablon lista tételszám |
| 23 | Create/edit: `name` (kötelező, auto-focus create), `notes`; alatta rendezhető tétellista + picker | Implemented | `packing-template-editor.page.html` `[autofocus]="templateId() === null"`; `ReorderListComponent` + `app-gear-item-picker` | — |
| 24 | Új sablon mentése után: vissza a listára (nem marad az editoron); friss sor finom outline (query param, nem perzisztens) | Implemented | `save()` `wasNew` → `router.navigate(['…/templates'], { queryParams: { highlight }, replaceUrl: true })`; `highlightedId` + `.newly-created` scss; `packing-template{s,-editor}.page.spec.ts` | — |
| 25 | Backend táblák + unique indexek + cascade | Implemented | V7 | — |
| 26 | OpenAPI CRUD + `POST …/duplicate` VAGY kliensoldali create+copy azonos szerződéssel | Implemented | kliensoldali `duplicate()` a `PackingTemplateDetail` create úton (SSOT engedi) | — |
| 27 | `DELETE` sablon: nem érinti a futó pakolás táblákat / `gear_item` sort; idempotens | Implemented | `delete` guard; `delete_isIdempotent_whenTemplateAlreadyDeleted` | — |
| 28 | Nested mentés: sablon + tételek egy requestben (teljes fa csere id-diff-fel) | Implemented | `PackingTemplateService.saveTree` + `NestedChildResolver`; `putReplacesTheTree_addingReorderingAndRemovingItems`, `update_revivesTombstonedItem…`, `put_rejectsItemId_thatBelongsToAnotherUsersTemplate…`; kliens tükör `savePackingTemplate` id-diff | — |

## documentation/Subfeatures/Pakolás.md
| # | Spec-állítás (rövid + szekció) | Verdikt | Bizonyíték | Teendő |
|---|---|---|---|---|
| 1 | `PackingSession.id` UUID kliens | Implemented | `PackingSessionRepository.start` `uuidV4()` | — |
| 2 | `destination` opcionális, futás közben szerkeszthető | Implemented | `updateDestination` / `saveDestination` `ionBlur` | — |
| 3 | `sourceTemplateIds` UUID lista = induláskor választott sablonok (kiválasztási sorrend); UI forrás-jelöléshez | Partial | perzisztálva `uuid[]` (V8, `create` teszt "real Postgres array"); a **lista soron** használva (`displayName`), de a **session képernyőn nincs forrás-sablon megjelenítés** (lásd #39) | feat — forrás-sablon jelölés a session képernyőn |
| 4 | audit mezők | Implemented | trigger + `@Generated` | — |
| 5 | `deleted` soft; futó lista szűri | Implemented | `findByUserIdAndDeletedFalseOrderByCreatedAtDesc` | — |
| 6 | Nincs „kész vs megszakítva"; lezárás = soft delete tombstone, nincs előzmény-UI | Implemented | `PackingSessionService.delete`; `delete_…_hasNoDoneVsCancelledDistinction`; nincs history route | — |
| 7 | `PackingSessionItem`: id, sessionId, gearItemId, status (indulás/extra = NOT_PACKED), sortOrder (aktív szekció manuális), deleted, audit | Implemented | `PackingSessionItemEntity` default `NOT_PACKED`; V8; `startPackingSession` NotPacked | — |
| 8 | Egy sessionön `gearItemId` legfeljebb egyszer | Implemented | `idx_packing_session_item_session_gear … WHERE deleted = false` (V8); `create_returnsUniqueViolation_whenTheSameGearItemAppearsTwice…`, `extraItem_…butNotTwiceForTheSameGear` | — |
| 9 | Név: élő join a `GearItem.name`-re (átnevezés azonnal látszik) | Implemented | `packing-session-detail.page.ts` `applyDetail` nameById map; spec teszt `item name is a live join…` | — |
| 10 | Tétel nem törölhető a listáról státuszváltáson kívül (nincs remove/swipe) | Implemented | detail page: nincs remove/swipe kód, csak `onStatusChange` | — |
| 11 | Enum `PackingItemStatus` 7 érték + háttérszínek | Implemented | DB `CHECK (status IN (…7…))` (V8); `status-cycle-card.component.scss` 7 szín + `.ion-palette-dark` override | — |
| 12 | Ciklus sorrend NOT_PACKED→…→NOT_NEEDED→(loop) | Implemented | `STATUS_CYCLE_ORDER` + `nextStatus` modulo | — |
| 13 | Tetszőleges ugrás; `PACKED`/`NOT_NEEDED` bármikor visszaállítható | Implemented | `selectStatus` bármely státuszra emittál; mind a 7 chip mindig látszik | — |
| 14 | Indítás: 1+ sablon (kötelező ≥1; lehet üres) | Implemented | `PackingSessionStartPage.start` `selectedIds().size === 0` guard + `START_TEMPLATES_REQUIRED` | — |
| 15 | Opcionális `destination` induláskor | Implemented | `form` destination control | — |
| 16 | Session létrejön; `sourceTemplateIds` = választott sorrend | Implemented | `start(Array.from(selectedIds), …)` → `sourceTemplateIds: templateIds` | — |
| 17 | Tételek: sablonok uniója, dedup `gearItemId`, első előfordulás marad (kiválasztási sorrend × sortOrder) | Implemented | `PackingSessionRepository.start` `seenGearItemIds`; `packing-session.repository.spec.ts` `unions … deduping … first occurrence wins`, `excludes soft-deleted template items` | — |
| 18 | Minden sablon üres → üres session OK; tételek később pickerrel | Implemented | `start` üres `items` tömböt is elfogad | — |
| 19 | Kezdeti `status` = NOT_PACKED; `sortOrder` = unió sorrend | Implemented | `start` `sortOrder: items.length` | — |
| 20 | Sablon módosítás/törlés a futó session tételeit nem változtatja | Implemented | session item-ek másolt sorok; nincs propagáció | — |
| 21 | Törölt sablon `id` a `sourceTemplateIds`-ben: UI „törölt sablon" / elrejtés; tételek maradnak | Partial | `displayName` a fel nem oldható sablon-id-t **csendben kihagyja** (tételek maradnak), de nincs explicit „törölt sablon" jelölés; a session képernyőn egyáltalán nincs forrás-sablon lista | feat — forrás-sablon jelölés a session képernyőn |
| 22 | Futás közben új sablon nem adható | Implemented | detail page-en nincs sablon-hozzáadás UI | — |
| 23 | Extra eszköz: meglévő `GearItem` pickerrel (dup disabled + végére); új tétel NOT_PACKED, sortOrder végére | Implemented | `onItemPicked` `sortOrder = items().length`; `excludedGearItemIds`; `extraItem_canBeAddedToARunningSession…`, spec teszt `onItemPicked() adds the item at the end` | — |
| 24 | Szekciók: Aktív = status ∉ {PACKED, NOT_NEEDED}; Kész/nem kell = PACKED & NOT_NEEDED külön, nem törlődnek, visszaállíthatók | Implemented | `activeItems`/`doneItems` computed `DONE_STATUSES`; spec teszt `splits items into the active section … and the done section`, `excludes soft-deleted items` | — |
| 25 | Kártya felső sor: 7 státusz, jelenlegi kiemelve; bármely státuszra tap → azonnal arra áll | Implemented | `status-cycle-card.component.html` `@for statuses` + `.status-chip.active` (border-width 2px); `selectStatus` | — |
| 26 | Alsó sor: balra nagy betűvel eszköznév, jobbra jelenlegi státusz felirat | Implemented | `.status-body-name` (18px/600) + `.status-body-current` | — |
| 27 | Kártya paddingolt; háttérszín = jelenlegi státusz színkódja | Implemented | `.status-card` `--status-bg` + `statusClass()` | — |
| 28 | Tap a kártyára (nem chipre) → következő státusz | Implemented | `.status-body (click)="cycleNext()"`; chip `$event.stopPropagation()` | — |
| 29 | Kereső a lista tetején | Implemented | detail page `ion-searchbar` + `filteredItems` | — |
| 30 | Státusz-sort gomb az aktív szekcióra (NOT_PACKED→…→BUY_ON_THE_WAY); Kész/nem kell szekciót nem rendezi | Implemented | `sortActiveByStatus` `ACTIVE_STATUS_ORDER` (= első 5); spec teszt `sortActiveByStatus(): orders the active section … and leaves the done section alone` | — |
| 31 | Manuális reorder az aktív szekcióban: web DnD; telefon fel-le nyilak | Implemented | `isNative` `moveActiveItem` (chevron gombok) / `ion-reorder-group` `onWebReorder`; `moveActiveItem` tesztek | — |
| 32 | Egyetlen „Pakolás lezárása" gomb | Implemented | toolbar `close()` gomb | — |
| 33 | Confirmation kötelező → soft delete session + összes item; nincs előzmény-képernyő | Implemented | `close()` `AlertController` → `closeAndNavigateBack` → `sessionRepository.close`; `delete_softDeletesSessionAndCascadesToLiveItems` | — |
| 34 | Soha nem syncelt helyi session → helyi hard remove + outbox purge | Implemented | `closePackingSession` never-synced ág → `DELETE FROM packing_session` | — |
| 35 | `GearItem` törlés → cascade soft delete minden futó session élő tételéből | Implemented | lásd Eszközök #12; `deletingAGearItem_cascadesToItsLiveSessionItems_butLeavesTheSessionItself` | — |
| 36 | Sablon törlés → session érintetlen | Implemented | `PackingTemplateService.delete` nem nyúl session táblákhoz | — |
| 37 | Belépő „Aktív pakolás": lista + új indítás, korlátlan darabszám | Implemented | `packing-sessions.page.html` list + `routerLink="start"` | — |
| 38 | Lista soron cím: destination; ha nincs → forrás-sablon nevek vesszővel; ha egyik sem oldható fel → „Névtelen pakolás" | Implemented | `PackingSessionsPage.displayName`; `packing-sessions.page.spec.ts` 4 eset (destination / joined names / ignores deleted id / placeholder only when none resolvable) | — |
| 39 | Session képernyő: úticél szerkesztő; **forrás-sablonok jelölése**; kereső; státusz-sort; manuális reorder; tételkártyák; picker; lezárás + confirmation | Partial | minden megvan a `packing-session-detail.page` -ben **kivéve a forrás-sablonok jelölését** (nincs `sourceTemplateIds` render a detail nézetben) | feat — forrás-sablon jelölés a session képernyőn |
| 40 | Indítás flow: multi-select sablon(ok) (≥1) + opcionális úticél | Implemented | `packing-session-start.page` toggle + destination | — |
| 41 | Táblák `packing_session` (`source_template_ids uuid[]`) / `packing_session_item`; unique élő sorokra; session DELETE cascade; `gear_item` törlés cascade | Implemented | V8; `createWithItems_persistsSourceTemplateIdsAsARealPostgresArray_andIsIdempotent` | — |
| 42 | Lezárás / user törlés: soft delete (listák `deleted = false`); nincs archive UI MVP | Implemented | `delete` softDelete; nincs archive route | — |
| 43 | OpenAPI CRUD; korlátlan élő session/user (nincs unique); `DELETE` idempotens | Implemented | nincs constraint; `delete_isIdempotent_whenSessionAlreadyDeleted` | — |
| 44 | Item status/sortOrder/add-item = külön outbox op, nem nested session save; csak a session-létrehozás nested atomi írás | Implemented | `PackingSessionItemService` önálló endpointok (`statusAndSortOrder_areUpdatedThroughTheStandaloneItemEndpoint`); V8 fejléc-komment; kliens `updatePackingSessionItem` / `addPackingSessionItem` külön enqueue | — |

## Rollup
- Állítások összesen: 102 — Implemented 98 / Partial 3 / Missing 0 / Describes-future 1 / Accepted-limitation 0
  - Partial: Sablonok #22 (lista tételszám), Pakolás #3 & #21 & #39 — mind a **forrás-sablon jelölés a session képernyőn** hiányára fut ki (egy jegy fedi #3/#21/#39-et).
- Blokkoló eltérések: nincs. Mindkét eltérés kizárólag UI-megjelenítés; az adatmodell, a state-gép, a cascade-ek, a nested-tree mentés, az offline/outbox réteg és a sync mind spec szerint működik, széles backend + frontend teszttel fedve.
- Draft jegyek:
  - feat — "Sablon lista sor: tételszám megjelenítése" -> Sablonok — a Sablonok UI/UX szekció explicit kéri a `tételszám`-ot minden sablon-soron; jelenleg csak `name` + `notes` előnézet látszik, mert a `templates` signal csak metaadatot tart (az item lista `getDetail()`-lel töltődik). Kellene egy olcsó élő-tétel-count a lista lekérdezésbe / summary DTO-ba.
  - feat — "Pakolás session képernyő: forrás-sablonok jelölése + törölt sablon jelzés" -> Pakolás — a spec (UI/UX + „Indítás") szerint a session képernyőn látszaniuk kell a forrás-sablonoknak, és a fel nem oldható (`törölt`) sablont explicit „törölt sablon" felirattal kell jelezni; a `packing-session-detail.page` jelenleg egyáltalán nem rendereli a `sourceTemplateIds`-t (csak a lista `displayName`-je használja, az is csendben kihagyja a törölt id-t).
- Spec-átírás vázlat:
  - Mindhárom subfeature: `verifikalva` frontmatter kitöltése commit `ff23984`-re; jelen idejű megfogalmazás („A katalógus…", „A sablon…", „A session…") — a specek nagyrészt már így vannak írva.
  - Eszközök: rögzíteni, hogy a `notes` a UI-n jelenleg egysoros mező (ha ez szándékos, a „szabad szöveg" mellé odaírni; ha nem, külön apró jegy). A „csak picker, nincs create" és a cascade-count-a-dialógusban ténylegesen implementált — megtartani.
  - Sablonok: a lista-sor leírásából vagy törölni a `tételszám`-ot, vagy (jobb) meghagyni és a feat-jeggyel implementálni. A „Duplikálás" pontnál rögzíteni, hogy **kliensoldali** create+copy valósult meg (nincs `POST …/duplicate` endpoint) — a spec ezt már alternatívaként engedi, csak élesíteni kell a megfogalmazást.
  - Pakolás: a „Session képernyő" felsorolásból a „forrás-sablonok jelölése" pontot vagy a feat-jeggyel implementálni, vagy a specben „lásd backlog" jelöléssel függőben hagyni; a „Törölt sablon `id` … UI »törölt sablon« / elrejtés" mondatot pontosítani: jelenleg csak a **lista cím** esik vissza (a törölt sablonnév kimarad a vesszős összefűzésből), külön „törölt sablon" felirat nincs.
  - Pakolás: rögzíteni, hogy a session-item mutációk (status / sortOrder / add) külön outbox-műveletek, és csak a session-létrehozás nested atomi írás — ez a V8 migráció fejlécében dokumentált és implementált; a spec Architektúra/Frontend szakaszába átemelni.
- Verdikt: YELLOW — a domain lényegében teljes és erősen tesztelt; két, kizárólag UI-megjelenítést érintő, nem blokkoló hiány van a specek UI/UX szakaszaihoz képest (sablon-lista tételszám; forrás-sablonok jelölése a session képernyőn).
