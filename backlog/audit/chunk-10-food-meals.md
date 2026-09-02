# Audit — Chunk 10: Food — meals, recipe, nutrition, stats
Audit commit: `ff23984`
Specek: `documentation/Subfeatures/Recept.md`, `documentation/Subfeatures/Étkezés.md`, `documentation/Subfeatures/Kaja statisztika.md`, `documentation/Features/Tápérték kalkulátor.md`, `documentation/Subfeatures/Élelmiszer forrású étkezés.md`, `documentation/Subfeatures/Recept forrású étkezés.md`, `documentation/Subfeatures/Egyéni forrású étkezés.md`
Kód: `backend/src/main/java/hu/bumler/lm2/food/{Recipe,RecipeIngredient,Meal,MealItem}*` + `MealCascade.java`, `backend/src/main/resources/db/migration/V14__recipe.sql`, `V15__meal.sql`, `backend/src/main/resources/openapi/components/schemas/{Meal,MealItem,Recipe,RecipeIngredient}.yaml`, `frontend/src/app/pages/food/{recipe,meal,stats}/**`, `frontend/src/app/pages/food/storage/stock-consumption.ts`, `frontend/src/app/core/data/{recipe,meal}.repository.ts`, `frontend/src/app/core/data/activity-kcal.ts`, `frontend/src/app/shared/{tdee-calculator,timezone}.ts`, `frontend/src/app/core/storage/sqlite-storage-backend.ts` (`saveRecipe`/`deleteRecipe`/`saveMeal`/`deleteMeal`), `frontend/src/app/core/sync/sync-engine.service.ts` (`mealItemCascadeTombstoneTasks`)
Tesztek: backend `food/` (RecipeServiceTest, RecipeIntegrationTest, MealServiceTest — subset), frontend `pages/food/recipe/recipe-summary.spec.ts`, `pages/food/meal/{daily-nutrition,meal-item-summary,progress-bar-status}.spec.ts`, `pages/food/stats/catalog-ratios.spec.ts`, `pages/food/storage/stock-consumption.spec.ts`, `shared/tdee-calculator.spec.ts`, `shared/timezone.spec.ts`

## documentation/Subfeatures/Recept.md
| # | Spec-állítás (rövid + szekció) | Verdikt | Bizonyíték (fájl:szimbólum / teszt) | Teendő |
|---|---|---|---|---|
| 1 | Receptkatalógus: név, megjegyzés, hozzávalók + számított összesített tápanyag/ár (Jelenlegi működés) | Implemented | `RecipeEntity` / `RecipeIngredientEntity`; `recipe-summary.ts:computeRecipeSummary`; `recipe-edit.page.ts:summary` | — |
| 2 | Ownership: shared/globális, nincs `user_id` (Jelenlegi működés / Backend) | Implemented | `V14__recipe.sql` (nincs `user_id`); `RecipeService` — nincs owner-check; `RecipeIntegrationTest.anyAuthenticatedUser_canEditAnotherUsersRecipe` | — |
| 3 | Egész feature backend-offline (lista/create/edit/törlés/kalkuláció/keresés) | Implemented | `sqlite-storage-backend.ts:saveRecipe/deleteRecipe/listRecipes`; `RecipeRepository` helyi dup-check | — |
| 4 | Recept neve kötelező | Implemented | `recipe-edit.page.ts` `Validators.required`; `recipe.name NOT NULL` (V14) | — |
| 5 | Megjegyzés opcionális, többsoros sima szöveg, nincs markdown | Implemented | `note` nullable; `IonTextarea`; nincs markdown-renderelés | — |
| 6 | Hozzávalók opcionálisak; üres hozzávalós recept menthető | Implemented | `RecipeServiceTest.create_allowsTwoEmptyIngredientRecipes_withDifferentNames` | — |
| 7 | Nincs adagszám / serving mező a recepten | Implemented | `RecipeEntity` / `Recipe.yaml` — nincs ilyen mező | — |
| 8 | Hozzávaló csak az Élelmiszerek katalógusból | Implemented | `RecipeService.requireLiveFood`; `recipe-edit` picker `foodRepository.items()`; `RecipeServiceTest.create_throwsNotFound_whenIngredientFoodIsDeleted` | — |
| 9 | Mennyiség: Mennyiség mező `quantity` módban | Implemented | `QuantityInputComponent` a `recipe-edit`-ben | — |
| 10 | Ugyanaz az élelmiszer kétszer tiltott; választóban a felvett elemek disabled | Implemented | `idx_recipe_ingredient_recipe_food ... WHERE deleted = false` (V14); `recipe-edit.page.ts:toggleFoodPick` excluded-check | — |
| 11 | Hozzávaló törölhető create és edit közben | Implemented | `recipe-edit.page.ts:removeIngredient` | — |
| 12 | Sorrend manuális reorder (web D&D / telefon fel-le); mentésre kerül; duplikáció-ellenőrzésnél nem számít | Implemented | `ReorderListComponent`; `sortOrder` mentve; `RecipeService.signatureOf` = `Set` (rendezetlen); `RecipeServiceTest.create_throwsUniqueViolation_...regardlessOfOrder` | — |
| 13 | Élelmiszer felvétel: keresős választó, többszörös kijelölés egy megnyitással | Implemented | `recipe-edit.page.ts:pickerResults` / `pickedFoodIds` / `confirmPicked` | — |
| 14 | Bezárás után a kijelölt élelmiszerek megjelennek a hozzávalólistán | Implemented | `confirmPicked` → `ingredients.update` | — |
| 15 | Mennyiség mezők üresek; üres mennyiségű hozzávaló invalid/nem menthető amíg ki nincs töltve vagy törölve | Implemented | `NO_QUANTITY`; `save()` `row.quantity().amount === null` → invalid | — |
| 16 | `db` megjelenítés: `2db (1000g)` ha nettó ismert, különben `2db` | Implemented | `recipe-summary.ts:formatIngredientQuantity`; `recipe-summary.spec.ts` 4 eset | — |
| 17 | Automatikus összegzés: ár/kcal/fehérje/szénhidrát/zsír a részleteken, számított, nem szerkeszthető + hiányjelzés | Implemented | `computeRecipeSummary` (5 érték + `incomplete`); `recipe-edit.page.ts:summaryDisplay` | — |
| 18 | Egyéb tápanyagok (só, rost, stb.) ugyanezzel a modellel számolhatók kliensen / API-n | Describes-future | `computeRecipeSummary` csak a 4 headline makrót + árat összegzi; spec: „a fenti öt + hiányjelzés elég" | jegy #6 |
| 19 | Mennyiség → tápanyag: 100 g/ml alap; `db` → darabszám × nettó; tömeg/térfogat → kanonikus; `(baseAmount/100) × per100`; receptösszeg = Σ | Implemented | `recipe-summary.ts:baseAmountOf/nutrientContribution`; `recipe-summary.spec.ts` | — |
| 20 | `unit=db` és üres nettó → `baseAmount = 0` + hiányos | Implemented | `baseAmountOf` → `{ baseAmount: 0, missing: true }`; spec-teszt „flags incomplete ... db-unit ingredient has no catalog net content" | — |
| 21 | Üres konkrét tápanyagmező → 0 az adott tápanyagban + recept hiányos jelzés | Implemented | `nutrientContribution` `per100 == null → { value: 0, missing: true }`; spec-teszt „single missing nutrient field" | — |
| 22 | Ár: Ft/csomag; `N db` → `N × priceHuf`; egyéb + ismert nettó → `(felhasznált/nettó) × priceHuf`; nettó/ár üres → 0 + hiányos | Implemented | `recipe-summary.ts:priceContribution`; spec-teszt „unit family does not match", „non-db ingredient has no catalog net content" | — |
| 23 | Duplikáció: azonos név élő recepttel ([[Névegyediség]]) VAGY azonos hozzávaló-halmaz (foodId+amount+unit, sorrendtől függetlenül); üres hozzávalós: csak név dönt | Implemented | `RecipeService.applyName` + `checkIngredientSetDuplicate`; FE `recipe.repository.ts:isDuplicateRecipe`; `RecipeServiceTest` (name + ingredient-set + két üres eset) | — |
| 24 | Backend-offline: helyi duplikáció-ellenőrzés is | Implemented | `RecipeRepository.save` — `isDuplicateRecipe` a betöltött élő listán, `RecipeDuplicateError` | — |
| 25 | CRUD offline-képes; sosem szinkronizált helyi draft → hard remove + outbox tisztítás | Implemented | `sqlite-storage-backend.ts:deleteRecipe` `enqueue.hardRemoveLocalEntity` ág (`DELETE FROM recipe` + ingredients) | — |
| 26 | Törléskor hivatkozó Étkezés/Recept-forrású rekordok: megerősítő dialógus **felsorolja** őket, majd cascade soft delete; shared → **minden user** étkezésére; a UI **jelezze**; nincs undelete UI | Partial | Cascade OK: `RecipeService.delete` → `MealCascade.cascade`; FE drain/pull `sync-engine.service.ts:mealItemCascadeTombstoneTasks`; `RecipeServiceTest.delete_cascadesToLiveMealItemReferencingThisRecipe_andSoftDeletesNowEmptyMeal`. **De** a `recipe-list.page.ts:delete` / `recipe-edit.page.ts:delete` csak sima név-alapú `AlertController` — nem sorolja fel a hivatkozó étkezéseket, nem jelzi a több-felhasználós hatást | jegy #1 |
| 27 | Név-egyediség csak élő sorokra | Implemented | `idx_recipe_name_normalized ... WHERE deleted = false` (V14); `findByNameNormalizedAndDeletedFalse` | — |
| 28 | Kapcsolat étkezéssel: recept hozzávalói alapján készletlevonás; elfogyasztott hányad az étkezés spechében | Implemented | `meal.repository.ts:consumeStock` RECIPE-ág (`ingredient × item.servings`) | — |
| 29 | UI: Kaja tab recept lista + [[Szöveges keresés]] | Implemented | `recipe-list.page.ts:filteredItems` (`matchesSearch`/`compareRank`), `IonSearchbar` | — |
| 30 | UI: külön **Részletek** nézet (név, megjegyzés, hozzávalók db-nél zárójeles nettó, összegzett értékek, hiányjelzés) | Partial | Nincs dedikált read-only részletek-oldal; a listából tap → `recipe-edit` (a szerkesztő mutatja a `summaryDisplay`-t). `kaja-stats.page.ts:open` is a szerkesztőre navigál | jegy #2 |
| 31 | UI: Szerkesztő (név, megjegyzés, hozzávaló lista törlés/reorder/mennyiség; multi-select élelmiszer felvevő) | Implemented | `recipe-edit.page.ts` + `.html` | — |
| 32 | Mentés: fix alsó footer; iOS input min. 16px | Implemented | `recipe-edit.page.html` `IonFooter`; 16px globális CSS-konvenció (nem ellenőrizve ebben a chunkban) | — |
| 33 | Későbbi külön „elkészítési lépések / idő" admin — most nem scope | Describes-future | spec explicit „most nem scope" | jegy #9 |
| 34 | Backend entitásmezők: `Recipe`(id UUID kliens, name unique élő, note, deleted/deleted_at, timestamps); `RecipeIngredient`(id, recipeId, foodId, quantityAmount, quantityUnit, sortOrder) | Implemented | `V14__recipe.sql`; entitások | — |
| 35 | Összegzett tápanyag/ár: számított (kliens/read-model), nem kötelező denormalizált oszlop | Implemented | nincs összegző oszlop; `computeRecipeSummary` kliensen | — |
| 36 | `DELETE` idempotens; törölt `GET` by id → 200 + `deleted` | Implemented | `RecipeIntegrationTest.delete_isIdempotent_andOwnDeletedRowStillReturns200OnGet` | — |
| 37 | `POST` létező id-val → idempotens upsert | Implemented | `RecipeService.create` `findById...orElseGet`; `RecipeIntegrationTest.createIsIdempotent_whenTheSameIdIsPostedTwice` | — |
| 38 | `PUT` soft-deleted soron → 409 `ENTITY_DELETED` | Implemented | `RecipeService.update` `EntityDeletedException`; `RecipeIntegrationTest.update_returnsEntityDeleted_afterTheRecipeWasDeleted` | — |
| 39 | Bármely autentikált `USER` CRUD | Implemented | `RecipeIntegrationTest.anyAuthenticatedUser_canEditAnotherUsersRecipe` | — |

## documentation/Subfeatures/Étkezés.md
| # | Spec-állítás (rövid + szekció) | Verdikt | Bizonyíték (fájl:szimbólum / teszt) | Teendő |
|---|---|---|---|---|
| 1 | Napi étkezés-dashboard (egy nap, nincs többnapos történet/diagram) | Implemented | `meal-dashboard.page.ts` — `selectedDate` egy nap, nincs diagram | — |
| 2 | Bevitt tápanyag az aznapi tételekből; célok a [[Tápérték kalkulátor]]ból | Implemented | `daily-nutrition.ts:computeDailyNutrition`; `meal-dashboard.page.ts:tdee = computeTdee(...)` | — |
| 3 | Készletlevonás recept- és élelmiszer-tételeknél | Implemented | `meal.repository.ts:consumeStock` + `stock-consumption.ts:planStockConsumption` | — |
| 4 | Forrás gyerekek: RECIPE \| FOOD \| CUSTOM | Implemented | `MealItem.yaml` enum; `MealService.applyItem` switch | — |
| 5 | Dátumválasztó: mai nap default (kliens TZ); bal/jobb ±1 nap; Mai nap gomb | Implemented | `meal-dashboard.page.ts:selectedDate = signal(today())`, `previousDay`/`nextDay`/`goToday` | — |
| 6 | 4 progress bar: Kalória (`dailyAllowanceKcal`), Fehérje (`proteinGoalG`), Szénhidrát (`carbsGoalG`), Zsír (`fatGoalG`) | Implemented | `meal-dashboard.page.ts:bars` computed | — |
| 7 | Minden barnál `bevitt / cél` + állapot szöveg (hátra ≤ cél / túllépés > cél) | Implemented | `nutrition-progress-bar.component.html` (`{{ intake }} / {{ goal }}`); `progress-bar-status.ts:progressStatus`; `progress-bar-status.spec.ts` | — |
| 8 | Kalória bar alatt másodlagos: opcionális `+N kcal aktivitás` (`activityExtraKcal`) | Implemented | `meal-dashboard.page.html` `@if (activityExtraKcal() > 0)` `activity-extra` note | — |
| 9 | Napi ár (összeg az aznapi tételekből), a barok mellett/alatt egy sorban | Implemented | `meal-dashboard.page.ts:dailyPriceHuf`; `.html` `daily-price` note | — |
| 10 | Étkezések listája az adott napra | Implemented | `meal-dashboard.page.ts:dayMeals` (`calendarDayInZone` szűrés) | — |
| 11 | Nincs: makró összesítő sor / cél+aktivitás kártya / diagram / többnapos történet / Energiaegyenleg | Implemented | `meal-dashboard.page.html` — egyik sincs | — |
| 12 | Kalória színek: `lo=0.95A`, `hi=1.05A`; sárga `<lo`; zöld `lo..hi`; `>hi`: fogyás (A<M) narancs ha `≤M` piros ha `>M`; megtartás/tömegelés (A≥M) azonnal piros | Implemented | `progress-bar-status.ts:calorieBarColor`; `progress-bar-status.spec.ts` (mindkét ág, band-élek) | — |
| 13 | Makró színek: sárga `<0.95cél`; zöld ±5%; narancs `>1.05cél`; piros nincs | Implemented | `progress-bar-status.ts:macroBarColor`; spec-teszt „orange above the band — never red" | — |
| 14 | Étkezés entitás: Időpont kötelező, default = most (készülék TZ); Megjegyzés opcionális; Tételek ≥1 kötelező, vegyes forrástípus OK | Implemented | `meal-edit.page.ts` form validators + `items().length === 0`; `MealService.saveTree` `ValidationException`; `MealServiceTest.create_rejectsEmptyItemList` | — |
| 15 | Szerkeszthető, soft delete megerősítéssel; backend-offline; szinkronizálatlan → hard remove | Implemented | `meal-edit.page.ts:delete` `AlertController`; `sqlite-storage-backend.ts:deleteMeal` `hardRemoveLocalEntity` ág | — |
| 16 | Tétel közös: forrás típus RECIPE\|FOOD\|CUSTOM; adagszorzó `servings > 0`, `0` tilos | Implemented | `MealItem.yaml` `servings minimum 0 exclusiveMinimum: true`; `meal-edit.page.ts:save` `invalidServings = servings() <= 0` | — |
| 17 | Napi összeg: tételek effektív értékeinek összege (élő katalógus ahol ID van) | Implemented | `daily-nutrition.ts` → `meal-item-summary.ts:computeMealItemEffective` (élő `recipes`/`foods`); `daily-nutrition.spec.ts` | — |
| 18 | Élő hivatkozás: ID + mennyiség/szorzó; tápanyag az aktuális katalógusból; törlés → **warning + cascade** | Partial | Élő kalkuláció + cascade OK (`MealCascade`, `mealItemCascadeTombstoneTasks`); a törlés-warning **nem** sorolja fel a hivatkozó étkezéseket (lásd Recept #26) | jegy #1 |
| 19 | Készlet: create mentéskor recept/élelmiszer levonás; egyéni nem; szerkesztés/törlés nincs visszapótlás | Implemented | `meal.repository.ts:save` `isCreate` gate → `consumeStock`; CUSTOM kihagyva; nincs restock-ág | — |
| 20 | Időzóna: időpont kliens TZ; DB `eatenAt` UTC `timestamptz` + `timeZoneId` (IANA); dashboard nap = megjelenítő kliens TZ naptári napja; megosztott tesztelt DateTime modul (DST) | Implemented | `V15__meal.sql` (`eaten_at timestamptz`, `time_zone_id text`); `timezone.ts:calendarDayInZone`, `deviceTimeZoneId`; `meal-dashboard.page.ts:dayMeals` a *megjelenítő* zónával; `timezone.spec.ts` DST spring-forward teszt | — |
| 21 | UI: dashboard; Fejléc „Étkezés rögzítése"; Űrlap időpont/megjegyzés/tételek; mentés footer; iOS 16px | Implemented | `meal-edit.page.ts` + `.html` (`IonFooter`); 16px globális konvenció | — |
| 22 | Értesítés kalória túllépésre → [[Értesítések]] | Describes-future | külön feature/chunk (Értesítések) | — |
| 23 | Backend: `Meal`(id UUID, eatenAt timestamptz, timeZoneId, note, deleted, timestamps); `MealItem`(id, mealId, type, servings, típusmezők, sortOrder) | Implemented | `V15__meal.sql`; `MealEntity`/`MealItemEntity` | — |
| 24 | Cascade: `Food`/`Recipe` delete → itemek, majd üres meal soft delete | Implemented | `MealCascade.cascade`; `sync-engine.service.ts:mealItemCascadeTombstoneTasks` (drain + pull ág); `MealServiceTest.delete_softDeletesMealAndCascadesToLiveItems`, `RecipeServiceTest.delete_cascadesToLiveMealItemReferencingThisRecipe_andSoftDeletesNowEmptyMeal` | — |
| 25 | Meal user-owned; idegen meal → 404 (nem 403) | Implemented | `MealService.requireOwner` / `findByIdAndUserId`; `MealServiceTest.create_rejectsForeignMeal_whenIdBelongsToAnotherUser`, `get/update_throwsNotFound_whenMealBelongsToAnotherUser` | — |
| 26 | `MealItem`-nek nincs saját `user_id`; `sync_changes` a szülő `Meal`-en át vetíti | Implemented | `V15__meal.sql` — `MealItem` arm `JOIN meal m ON mi.meal_id = m.id` | — |
| 27 | `POST` létező id-val idempotens upsert; `PUT` deleted meal → 409 ENTITY_DELETED; revive tombstoned item ha id visszatér | Implemented | `MealService.create`/`update`; `MealServiceTest.update_throwsEntityDeleted_whenMealAlreadyDeleted`, `update_revivesTombstonedItem_whenItsIdReappearsInIncomingLiveList` | — |

## documentation/Subfeatures/Kaja statisztika.md
| # | Spec-állítás (rövid + szekció) | Verdikt | Bizonyíték (fájl:szimbólum / teszt) | Teendő |
|---|---|---|---|---|
| 1 | Katalógus-alapú rangsorok: külön listák Élelmiszerekre és Receptekre; read-only; számítás a helyi katalógusból | Implemented | `catalog-ratios.ts:rankFoods/rankRecipes`; `kaja-stats.page.ts` (nincs szerkesztés) | — |
| 2 | A UI bővíthető későbbi statisztika-típusokra (pl. „mit ettem legtöbbet") — nem ebben a körben, de az IA hagy helyet | Describes-future | `kaja-stats.page.ts` javadoc: `statType` diszkriminátor csak típus-szinten létezik | jegy #4 |
| 3 | Statisztika-típusok táblázat: Katalógus arányok (`Kész`) + Egyéb (későbbi specek) | Partial | Katalógus arányok kész; a második típus nincs, és nincs látható típusváltó | jegy #4 |
| 4 | UI: típusválasztó / szegmens; új típus ne törje a meglévő képernyőt | Partial | Nincs renderelt típus-vezérlő (szándékosan, amíg egy opció van); `CatalogRatioRow` return-shape „kész nőni" | jegy #4 |
| 5 | Katalógus arányok — két külön lista (Élelmiszerek, Receptek), nincs közös összevont rangsor | Implemented | `kaja-stats.page.ts:catalogKind` `'FOOD' | 'RECIPE'`; `rankFoods` / `rankRecipes` külön | — |
| 6 | Mutatók (egy aktív): fehérje/kalória, fehérje/szénhidrát, fehérje/ár; magasabb = jobb | Implemented | `catalog-ratios.ts:RatioMetric` 3 érték; `foodRatio`/`recipeRatio` | — |
| 7 | Bázis mennyiség — Élelmiszer: 100 g/ml alap; `ár_per_100 = priceHuf × (100 / nettó_baseAmount)`; nettó dimenzió egyezzen; nettó/ár hiány → hiányos | Implemented | `catalog-ratios.ts:pricePer100` (+ `db`-kizárás); `catalog-ratios.spec.ts` 3 eset | — |
| 8 | Bázis mennyiség — Recept: teljes összegzett tápanyag + ár; egy adag = az összeg | Implemented | `catalog-ratios.ts:recipeRatio` → `computeRecipeSummary`; `recipePricePer100` per-100-ra normál | — |
| 9 | Hiányos adat: nem számolható mutató (0 nevező, hiányzó fehérje, hiányzó nettó) → nincs arányszám; hiányos csoport az érvényes rangsor **után**; azon belül név szerint ABC | Implemented | `catalog-ratios.ts:computeRatio` null-kezelés; `buildRanking` partíció + `incomplete.sort(localeCompare)`; spec-teszt „places hiányos items after every ranked item" | — |
| 10 | Érvényes tételek a választott mutató szerint rendezve | Implemented | `buildRanking` `valid.sort` | — |
| 11 | Rendezés: csökkenő ÉS növekvő; hiányos blokk mindig a lista végén | Implemented | `SortDirection` `DESC/ASC`; `kaja-stats.page.ts:toggleDirection`; `buildRanking` mindig a végére fűzi az incomplete-et | — |
| 12 | Keresés: [[Szöveges keresés]] a listán | Implemented | `kaja-stats.page.ts:rows` `matchesSearch` szűrő | — |
| 13 | Helyezés oszlop: helyezés a *teljes* (keresés nélküli) érvényes rangsorban; kereséskor is ez látszik; hiányosnál nincs helyezésszám | Implemented | `kaja-stats.page.ts:ranking` (query-független) vs `rows` (utólagos szűrés); `buildRanking` `rank: null` incomplete-nél; spec-teszt „with no rank" | — |
| 14 | Navigáció: lista tétel koppintás → Élelmiszerek vagy Recept részletek | Implemented | `kaja-stats.page.ts:open` → `/tabs/food/{catalog|recipe}/:id` (recept esetén a szerkesztő, lásd Recept #30) | — |
| 15 | UI: Statisztika belépő; Élelmiszer/Recept váltó; mutató választó; irány ↓/↑; kereső; oszlopok helyezés/név/mutatóérték + hiányos badge; read-only | Implemented | `kaja-stats.page.ts` signalok + `.html` szegmens; `kaja.statisztika` flag be | — |
| 16 | Backend: nincs backend érintettség | Implemented | nincs stats-kód a backendben; spec is így mondja | — |
| 17 | Backend-offline: olvasás a helyi store-ból; nincs saját módosító API → nincs outbox | Implemented | `kaja-stats.page.ts` csak `foodRepository`/`recipeRepository` `items()` signalt olvas | — |

## documentation/Features/Tápérték kalkulátor.md
| # | Spec-állítás (rövid + szekció) | Verdikt | Bizonyíték (fájl:szimbólum / teszt) | Teendő |
|---|---|---|---|---|
| 1 | Profile + napi aktivitás → szintentartás, aznapi kalória/makrócélok, `activityExtraKcal` | Implemented | `tdee-calculator.ts:computeTdee` → `TdeeResult` | — |
| 2 | Az Étkezés dashboard progress barjai ebből az SSOT-ból olvasnak | Implemented | `meal-dashboard.page.ts:tdee/bars` | — |
| 3 | Nincs külön energiaegyenleg-feature | Implemented | nincs ilyen kód | — |
| 4 | Jövőbeli: célok intervallumra (zöld sáv = intervallum); most: egy szám + ±5% | Describes-future | jelenleg egy szám + ±5% (`progress-bar-status.ts`) | jegy #8 |
| 5 | Bemenetek: testsúly, magasság, nem, szül. dátum → életkor; cél enum; `kgPerWeek > 0` (csak fogyás/tömeg); aznapi lépésszám (hiányzó = 0), edzésnaplók MET | Implemented | `TdeeProfileInput`; `activity-kcal.ts` (`stepKcalForDay` hiányzó nap → 0) | — |
| 6 | Életkor: teljes évek, kliens TZ mai dátum vs szül. dátum, `floor` period | Implemented | `tdee-calculator.ts` `ageInYears(birthDate, todayIso)`; `tdee-calculator.spec.ts` 3 „age" eset | — |
| 7 | Nincs Profile aktivitási szint / lépéskövetés ki-be: PAL **mindig 1.2** | Implemented | `tdee-calculator.ts` `const PAL = 1.2` | — |
| 8 | BMR Mifflin–St Jeor: férfi `10m+6.25h−5a+5`; nő `10m+6.25h−5a−161` | Implemented | `computeTdee` `bmr = ...`; `tdee-calculator.spec.ts` male/female | — |
| 9 | `PAL = 1.2` fix; lépéskalória csak a baseline felett ad többletet; flag off → lépéság 0, PAL 1.2 | Implemented | `stepKcalForDay` `max(0, stepCount - STEP_BASELINE)`; flag-off → üres logok → 0 | — |
| 10 | `maintenanceKcal = BMR × 1.2` (edzés és Δ nélkül) | Implemented | `computeTdee` `maintenanceKcal = bmr * PAL` | — |
| 11 | `Δ_cél`: FAT_LOSS `−|kgPerWeek|×1100`; MAINTENANCE 0; WEIGHT_GAIN `+|kgPerWeek|×1100` | Implemented | `goalDeltaKcal`; `KG_PER_WEEK_TO_KCAL = 1100`; spec-teszt „WEIGHT_GAIN delta" | — |
| 12 | `baseDailyCalorieGoal` érvényes = `max(nyers, floor)`; floor férfi 1500 / nő 1200 | Implemented | `computeTdee` `Math.max(..., CALORIE_FLOOR[sex])`; `CALORIE_FLOOR = { MALE: 1500, FEMALE: 1200 }`; spec-teszt mindkét floor | — |
| 13 | `dailyAllowanceKcal = baseDailyCalorieGoal (clamped) + activityExtraKcal` | Implemented | `computeTdee` `dailyAllowanceKcal = baseDailyCalorieGoal + activityExtraKcal` | — |
| 14 | `M_day = maintenanceKcal + activityExtraKcal` (kcal szín narancs/piros határhoz) | Implemented | `computeTdee` `maintenanceWithActivityKcal`; `progress-bar-status.ts:calorieBarColor` argumentum | — |
| 15 | Lépéskalória: `STEP_BASELINE = 3000` nem konfigurálható; `max(0, lépés − 3000) × m × 0.00045` | Implemented | `activity-kcal.ts` `STEP_BASELINE = 3000`, `STEP_KCAL_PER_STEP = 0.00045`, `stepKcalForDay` | — |
| 16 | Edzéskalória univerzális MET: `kcal = MET × m × durationMinutes/60` | Implemented | `pages/workout/**` metrics modulok (Edzés chunk); `activity-kcal.ts:workoutKcalForDay` bekötve | — |
| 17 | MET táblák (úszás/bicikli/mászás aktív-passzív/erő) | Implemented | `swim-metrics`/`bike-metrics`/`climbing-metrics`/`workout-metrics` (Edzés chunk); `activity-kcal.ts` mind az öt `*ForDay` | — |
| 18 | `activityExtraKcal` = lépéskalória + Σ edzéskalóriák az napra | Implemented | `meal-dashboard.page.ts:workoutExtraKcal` = `stepKcalForDay + workoutKcalForDay + swimKcalForDay + bikeKcalForDay + climbingKcalForDay` | — |
| 19 | Makrók: fehérje nyers `2.0×m`; zsír nyers `0.9×m`; szénhidrát `(allowance − P×4 − F×9)/4` | Implemented | `computeMacroGoals` `PROTEIN_G_PER_KG=2.0`, `FAT_G_PER_KG=0.9`; spec-teszt „raw protein/fat goals with no reduction" | — |
| 20 | Carb cycling: `activityExtraKcal` növeli a keretet → többlet a szénhidrátba; P/F g/kg fix | Implemented | `activityExtraKcal` → `dailyAllowanceKcal` → `computeMacroGoals`; spec-teszt „passes activityExtraKcal through ... macro budget" | — |
| 21 | `P×4 + F×9 > allowance` esetén szekvenciális, korai-kilépéses redukció: carb floor 20 g; `F_min = 0.6m`; `P_min = 1.5m`; végül `carbsGoalG = 0` nem blokkolt | Implemented | `computeMacroGoals` 2–6. lépés; `CARB_FLOOR_G=20`, `FAT_MIN_G_PER_KG=0.6`, `PROTEIN_MIN_G_PER_KG=1.5`; `tdee-calculator.spec.ts` minden lépésre (fat-reduce, protein-reduce, carbs bottoms out at 0) | — |
| 22 | Végső szénhidrát: `(allowance − P×4 − F×9)/4`, sosem `< 20 g` | Implemented | `finalCarbGoal` `Math.max(CARB_FLOOR_G, ...)` | — |
| 23 | Reaktivitás: profilsúly/cél/edzés/lépés változás → pure TS azonnal újraszámol (Signal/store); offline is | Implemented | `meal-dashboard.page.ts` `computed()` láncok; `tdee-calculator.ts` pure TS, nincs I/O | — |
| 24 | UI: napi barok az Étkezés dashboardon (elsődleges); saját magyarázó/debug UI később opcionális; offline „becsült" jelölés csak ha adat hiányzik (`~` / homokóra) | Partial | Dashboard OK; hiányos profilnál (`computable: false`) egyetlen szöveges figyelmeztetés (`PROFILE_INCOMPLETE_NOTICE`) jelenik meg a barok helyett — nincs per-érték `~`/homokóra részleges-becslés jelölés | jegy #5 |
| 25 | Makró barnál nincs piros; kcal barnál az Étkezés kiértékelési sorrend érvényes | Implemented | `progress-bar-status.ts:macroBarColor` (nincs red tier), `calorieBarColor` | — |
| 26 | Backend: **ugyanazok a képletek szerveroldali validációhoz / read-modelhez (OpenAPI); kanonikus konstanslista szinkronban a frontenddel** | Missing | Nincs backend TDEE-kód (grep: `maintenanceKcal`/`Mifflin`/`dailyAllowance` — 0 találat a `backend/`-ben); `IMPLEMENTATION_STATUS.md:74` rögzíti a szándékos eltérést („a spec … mondata ellenére sincs owner-endpoint") | jegy #3 |

## documentation/Subfeatures/Élelmiszer forrású étkezés.md
| # | Spec-állítás (rövid + szekció) | Verdikt | Bizonyíték (fájl:szimbólum / teszt) | Teendő |
|---|---|---|---|---|
| 1 | Étkezés-tétel egy Élelmiszerek tételből: élő `foodId` + mennyiség + adagszorzó; effektív = mennyiség × szorzó; tápanyag/ár a katalógusból az effektívre; készletlevonás | Implemented | `MealItem type=FOOD`; `meal-item-summary.ts:computeMealItemEffective` FOOD-ág; `meal.repository.ts:consumeStock` FOOD-ág | — |
| 2 | Forrás típus: `FOOD` | Implemented | `MealItem.yaml` enum; `MealService.applyItem` `case FOOD` | — |
| 3 | Élelmiszer választó (keresés), többszörös kijelölés → minden kiválasztott külön tételsor; mennyiség mezők üresek | Implemented | `meal-edit.page.ts:foodPickerResults` / `confirmPicked` (`quantity: signal(NO_QUANTITY)`) | — |
| 4 | Adagszorzó `> 0` (350 g × 2 → effektív 700 g a kalkulációhoz és a készletlevonáshoz) | Implemented | `meal-item-summary.ts:scale`; `consumeStock` `canonical * item.servings`; `save` `invalidServings` | — |
| 5 | Tárolás: `foodId` + `quantityAmount` + `quantityUnit` + `servings`; effektív mennyiség nem külön oszlop | Implemented | `V15__meal.sql` `meal_item` — nincs `effective_*` oszlop; `MealItemEntity` | — |
| 6 | Effektív tápanyag/ár: ugyanaz a modell mint Recept/Élelmiszerek (`db` → nettó; `/100` × tápanyag) az effektívre; hiányos katalógusmező → 0 | Implemented | `computeMealItemEffective` FOOD-ág `computeRecipeSummary([1 hozzávaló])`; `meal-item-summary.spec.ts` | — |
| 7 | Készlet: create mentéskor effektív mennyiség levonása; szerkesztés/törlés nincs visszapótlás | Implemented | `meal.repository.ts:save` `isCreate` gate | — |
| 8 | Élelmiszer törlésekor: warning + cascade az érintett tételekre/étkezésekre | Partial | Cascade OK (`FoodService.delete` → `MealCascade`; `sync-engine.service.ts` Food-delete ág → `mealItemCascadeTombstoneTasks`); a törlés-warning nem sorolja fel a hivatkozó étkezéseket | jegy #1 |
| 9 | UI: tételsor élelmiszer neve, mennyiség (üresen indul), adagszorzó, számított makrók/ár élő; tétel törölhető | Implemented | `meal-edit.page.ts:effectiveOf` / `removeItem` + `.html` | — |
| 10 | Backend: `MealItem type=FOOD`: `foodId`, `quantityAmount`, `quantityUnit`, `servings`; cascade a `Food` törlésre | Implemented | `MealService.applyItem` `case FOOD` (mind kötelező, `requireLiveFood`); `MealServiceTest.create_savesFoodAndCustomItems_withTypeSpecificFields`, `create_rejectsFoodItem_whenFoodIsMissingReferencedQuantity` | — |
| 11 | Backend-offline: helyi food + meal + storage store; create-kor levonás; outbox | Implemented | `sqlite-storage-backend.ts:saveMeal` + `meal.repository.ts:consumeStock` (`ensureConsumeInputsLoaded`) | — |

## documentation/Subfeatures/Recept forrású étkezés.md
| # | Spec-állítás (rövid + szekció) | Verdikt | Bizonyíték (fájl:szimbólum / teszt) | Teendő |
|---|---|---|---|---|
| 1 | Étkezés-tétel egy meglévő Recept alapján: élő `recipeId` + adagszorzó; tápanyag/ár = aktuális receptösszeg × szorzó; készletlevonás a hozzávalókból × szorzó | Implemented | `MealItem type=RECIPE`; `computeMealItemEffective` RECIPE-ág (`scale(summary, servings)`); `consumeStock` RECIPE-ág | — |
| 2 | Forrás típus: `RECIPE` | Implemented | `MealService.applyItem` `case RECIPE` | — |
| 3 | Recept választó a Recept katalógusból (keresés); többszörös kijelölés → külön tételsor; adagszorzó UI default **1** (`> 0`) | Implemented | `meal-edit.page.ts:recipePickerResults` / `confirmPicked` (`servings: signal(1)`) | — |
| 4 | Tárolás: `recipeId` + `servings` (nincs tápanyag-snapshot) | Implemented | `MealService.applyItem` `case RECIPE` — csak `recipeId`; a többi típusmező `null`-ra állítva | — |
| 5 | Effektív makrók/ár: Recept aktuális összegzése × `servings` | Implemented | `computeMealItemEffective` `scale(computeRecipeSummary(recipe.ingredients), item.servings)`; `meal-item-summary.spec.ts` | — |
| 6 | Készlet (étkezés **létrehozás** mentésekor): minden hozzávaló effektív mennyisége (`hozzávaló × servings`) levonása; opened-first szabályok; szerkesztés/törlés nincs visszapótlás | Implemented | `meal.repository.ts:consumeStock` RECIPE-ág (Σ `canonicalQuantityAmount(ingredient) × item.servings`) → `planStockConsumption`; `stock-consumption.spec.ts` opened-first | — |
| 7 | Recept törlésekor: warning + cascade | Partial | Cascade OK (`RecipeService.delete` → `MealCascade`); warning nem sorolja fel a hivatkozó étkezéseket | jegy #1 |
| 8 | UI: tételsor recept neve (élő), adagszorzó, számított makrók/ár (read-only, élő); tétel törölhető | Implemented | `meal-edit.page.ts:recipeOf` / `effectiveOf` / `removeItem` | — |
| 9 | Backend: `MealItem type=RECIPE`: `recipeId`, `servings`; FK / cascade a `Recipe` törlésre | Implemented | `V15__meal.sql` `recipe_id uuid REFERENCES recipe (id)` + `idx_meal_item_recipe_id`; `MealService.requireLiveRecipe`; `MealServiceTest.create_rejectsRecipeItem_whenRecipeIsDeleted` | — |
| 10 | Backend-offline: helyi recept + meal store; create-kor helyi készletlevonás; outbox | Implemented | `sqlite-storage-backend.ts:saveMeal` (`dependsOn` a lokál-only receptre) + `consumeStock` | — |

## documentation/Subfeatures/Egyéni forrású étkezés.md
| # | Spec-állítás (rövid + szekció) | Verdikt | Bizonyíték (fájl:szimbólum / teszt) | Teendő |
|---|---|---|---|---|
| 1 | Étkezés-tétel katalógus nélkül: kézi makrók/ár/megjelenő név + adagszorzó; **nem** módosítja a készletet | Implemented | `MealItem type=CUSTOM`; `meal.repository.ts:consumeStock` — CUSTOM kihagyva; `daily-nutrition.ts:toSaveItem` CUSTOM-ág | — |
| 2 | Forrás típus: `CUSTOM` | Implemented | `MealItem.yaml` enum; `MealService.applyItem` `case CUSTOM` | — |
| 3 | Mezők: Megjelenő név kötelező; Kalória kötelező; Fehérje/Szénhidrát/Zsír/Ár opcionális (üres → 0); Adagszorzó `> 0`, effektív = begépelt × szorzó | Implemented | `MealService.applyItem` `case CUSTOM` (`displayName`+`caloriesKcal` `orElseThrow`, többi `orElse(null)`); `meal-edit.page.ts:save` `invalidCustom`; `computeMealItemEffective` CUSTOM `?? 0` + `scale(..., servings)`; `meal-item-summary.spec.ts` „treating missing optional fields as 0" | — |
| 4 | Nincs `foodId` / `recipeId` | Implemented | `MealService.applyItem` CUSTOM-nál `setRecipeId(null)` / `setFoodId(null)` | — |
| 5 | Készlet: **soha** nem von le / nem pótol | Implemented | `consumeStock` csak RECIPE/FOOD ágat kezel | — |
| 6 | Későbbi scope (nem most): étel típus (péksüti, tészta, …) becsléshez | Describes-future | spec explicit „nem most" | jegy #7 |
| 7 | UI: kézi űrlapmezők a tételsoron / expandolt szerkesztőben; adagszorzó; effektív összeg jelzése opcionális | Implemented | `meal-edit.page.ts:addCustomRow` (`CustomItemRow` signalok) + `.html` | — |
| 8 | Backend: `MealItem type=CUSTOM`: `displayName`, `caloriesKcal`, `proteinG`, `carbsG`, `fatG`, `priceHuf`, `servings` | Implemented | `MealItem.yaml` nullable superset; `MealItemEntity`; `MealServiceTest.create_savesFoodAndCustomItems_withTypeSpecificFields` | — |
| 9 | Backend-offline: helyi meal store; outbox; nincs storage hívás | Implemented | `sqlite-storage-backend.ts:saveMeal`; `consumeStock` a `demand.size === 0` esetén no-op | — |

## Rollup
- Állítások összesen: **142** — Implemented **121** / Partial **9** / Missing **1** / Describes-future **10** / Accepted-limitation **1**
  - Partial: Recept #26, #30; Étkezés #18; Kaja statisztika #2 (részben), #3, #4; Tápérték #24; Élelmiszer-forrású #8; Recept-forrású #7 (a „warning felsorolja a hivatkozó étkezéseket" hiánya 4 spec-en át ismétlődik + a recept-részletek-nézet + a stats típusválasztó)
  - Missing: Tápérték #26 (backend képletek / read-model)
  - Accepted-limitation: a készletlevonás **tisztán kliensoldali** (`MealService` nem von le) — két offline eszköz étkezés-naplózásakor a `stored_food` relatív csökkentése elveszhet a sor-szintű last-write-wins alatt ([[Backend-offline first]] §17). Kódszinten szándékos: `MealService` javadoc + `IMPLEMENTATION_STATUS.md:75`.
- Blokkoló eltérések: nincs igazi blokkoló. A leghangsúlyosabb: (a) a Recept / Élelmiszer / Étkezés törlés-megerősítő dialógusai nem sorolják fel a hivatkozó étkezéseket és nem jelzik a több-felhasználós cascade-hatást, holott 4 spec expliciten megköveteli; (b) nincs szerveroldali Tápérték-kalkulátor a spec Backend szekciója ellenére; (c) nincs dedikált Recept-részletek nézet.
- Draft jegyek:
  - `enhancement` — „Recept / Élelmiszer / Étkezés törlés-megerősítő: sorolja fel a hivatkozó étkezés-rekordokat és jelezze a több-felhasználós cascade-et" -> Recept.md, Étkezés.md, Élelmiszer forrású étkezés.md, Recept forrású étkezés.md — a specek szerint a dialógusnak fel kell sorolnia a hivatkozó rekordokat és jeleznie a shared-katalógus miatti több-userre kiterjedő hatást; jelenleg csak sima név-alapú megerősítés van (`recipe-list/recipe-edit/meal-*.page.ts:delete`).
  - `feature` — „Recept read-only részletek nézet" -> Recept.md — a spec „Részletek" alfejezete (név, megjegyzés, hozzávalók db-nél zárójeles nettóval, összegzett ár/kcal/makrók, hiányjelzés) külön nézetet ír le; jelenleg a listából tap egyből a szerkesztőbe visz.
  - `chore` — „Tápérték kalkulátor: szerveroldali képletek/read-model vagy a spec Backend szekció jelen-idejűsítése" -> Tápérték kalkulátor.md — a spec „## Backend: ugyanazok a képletek szerveroldali validációhoz / read-modelhez (OpenAPI)" nincs implementálva; vagy készüljön el, vagy a spec mondja ki, hogy kliens-only (mint `recipe-summary`/`shelf-life`).
  - `enhancement` — „Kaja statisztika: `statType` típusválasztó UI + a második (fogyasztás-alapú) statisztika-típus" -> Kaja statisztika.md — a spec típusválasztó szegmenst és jövőbeli fogyasztás-alapú típusokat ír le; jelenleg csak a kód-szintű diszkriminátor létezik, renderelt vezérlő nincs.
  - `enhancement` — „Tápérték kalkulátor: per-érték »becsült« (`~`/homokóra) jelölés részleges profilnál" -> Tápérték kalkulátor.md — a spec hiányzó adatnál becslés-jelölést kér; a dashboard helyette az összes bart egyetlen szöveges figyelmeztetésre cseréli, ha a profil hiányos.
  - `enhancement` — „Recept: egyéb tápanyagok (só, rost, …) összegzése" -> Recept.md — a spec szerint „ugyanezzel a modellel számolhatók a kliensen / API-n"; `computeRecipeSummary` csak a 4 headline makrót + árat összegzi.
  - `future` — „Egyéni forrású étkezés: étel-típus (péksüti, tészta, …) becsléshez" -> Egyéni forrású étkezés.md — expliciten későbbi scope.
  - `future` — „Tápérték kalkulátor: célok intervallumra váltása (zöld sáv = intervallum)" -> Tápérték kalkulátor.md — expliciten jövőbeli.
  - `future` — „Recept: külön »elkészítési lépések / idő« admin" -> Recept.md — expliciten nem scope, most a megjegyzésben él.
- Spec-átírás vázlat:
  - **Recept.md** — „### Jelenlegi működés" cím a template szerint `### Célállapot` + jelen idő; „Törléskor … megerősítő dialógus felsorolja őket" → pontosítani, hogy a cascade (backend + kliens drain/pull) kész, de a *felsorolás* a dialógusban még nincs; a „Részletek" alfejezetnél jelezni, hogy jelenleg a szerkesztő tölti be ezt a szerepet; az „egyéb tápanyagok" mondatot jövő-jelölővel ellátni.
  - **Étkezés.md** — jelen időre; „Élő hivatkozás … törlés: warning + cascade" → cascade kész, warning-felsorolás nem; egyébként a dashboard-leírás (4 bar + színek + aktivitás-sor + napi ár + lista) pontosan illik a kódra, megtartható.
  - **Kaja statisztika.md** — „típusválasztó / szegmens" → jelen állapot: egyetlen típus, nincs renderelt választó, a return-shape készen áll a bővítésre; „mit ettem legtöbbet" típusok maradnak jövő-jelöléssel.
  - **Tápérték kalkulátor.md** — „## Backend" szekciót átírni: nincs szerveroldali implementáció, a számítás kliens-only pure TS (`shared/tdee-calculator.ts` + `core/data/activity-kcal.ts`), a konstanslista egyetlen helyen (frontend) él; „offline becsült jelölés (~/homokóra)" → jelenleg hiányos profilnál teljes szöveges figyelmeztetés.
  - **Élelmiszer/Recept/Egyéni forrású étkezés.md** — jelen időre; a három gyerek-spec kódra illeszkedik, csak a törlés-warning-felsorolás pontosítandó (Élelmiszer/Recept-forrásnál); a készletlevonás kliens-only voltát és a §17 relatív-frissítés-veszteséget explicit „Backend-offline" bekezdésbe emelni.
- Verdikt: **YELLOW** — a feature-készlet lényegében implementált és erősen tesztelt (backend `RecipeServiceTest`/`RecipeIntegrationTest`/`MealServiceTest`; frontend 8 pure-TS spec fájl). Az eltérések nem blokkolóak, de valósak: (1) a törlés-megerősítő dialógusok nem felelnek meg a specek „sorold fel a hivatkozó étkezéseket + jelezd a több-user hatást" előírásának, (2) nincs szerveroldali Tápérték-kalkulátor a spec Backend szekció ellenére, (3) nincs Recept-részletek nézet, (4) a Kaja-statisztika típusválasztó nincs felszínen.
