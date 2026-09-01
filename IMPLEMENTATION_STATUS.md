# Implementáció státusz

Ez a fájl a **kódban ténylegesen megvalósított** állapotot követi, elkülönítve a
`documentation/` vault "Státusz" mezőjétől — az utóbbi a **spec** készültségét jelzi
(jelenleg minden spec `Kész`), nem azt, hogy van-e hozzá kód. Ez a fájl a hiányzó
darab: mit implementáltunk *eddig*, mit nem, és melyik spec változott *a
megvalósítás után* (→ újra-ellenőrizendő).

Nem spec — nem kell `#### Backend-offline` szekció, nem a `documentation/` vault
része, ezért `IMPLEMENTATION_STATUS.md` néven a repo gyökerében él.

## Karbantartási szabály (fontos!)

Minden sorhoz tartozik egy **"Spec commit"** oszlop: annak a commitnak a rövid
hash-e, ami *utoljára érintette* az adott spec fájlt **akkor, amikor a sort
`Kész`-re állítottuk**. Ha egy `Kész` feature specje később módosul (pl. UX
finomítás, új mező, viselkedés-változás), a spec fájl commit hash-e elmozdul a
rögzítetthez képest.

**Frissítéskor / auditáláskor:**

```bash
git log -1 --format="%h %ad" --date=short -- "documentation/Features/<Feature>.md"
```

Ha a kapott hash **eltér** a táblázatban rögzítettől → a sor **nem tekinthető
Kész-nek többé**, tedd át "Ellenőrizendő" állapotba, nézd meg a spec diffjét
(`git log -p <régi hash>..HEAD -- <fájl>`), és csak akkor tedd vissza `Kész`-nek,
ha a kód még mindig lefedi az új specet (vagy frissítetted a kódot, és rögzítetted
az új hash-t).

Ha implementálsz egy új feature-t: vedd fel a sort, `Kész`-re állítva, a
**friss** spec commit hash-sel.

## Architektúra SSOT-k (nem feature, de a fenti mechanika ide is vonatkozik)

| Doksi | Spec commit | Infra állapot |
|---|---|---|
| [Backend-offline first](documentation/Architektúra/Backend-offline%20first.md) | `18b1ace` (2026-08-28) | Kész — outbox, sync engine, storage backend megvalósítva; §8 a pull utáni repository-cache invalidálással (`DataChangeNotifier`) bővült |
| [Backend](documentation/Architektúra/Backend.md) | `d1950b4` (2026-08-19) | Kész — OpenAPI spec-first pipeline, Flyway, hibaszerződés áll |
| [Frontend](documentation/Architektúra/Frontend.md) | `18b1ace` (2026-08-28) | Kész — layering, signals, tab registry, feature flags áll; `core/data` repo-k in-memory olvasás-cache-e + `core/sync/DataChangeNotifier` dokumentálva |

## Kész feature-k

| Feature / Subfeature | Spec commit | Backend | Frontend | Megjegyzés |
|---|---|---|---|---|
| [Bejelentkezés](documentation/Features/Bejelentkezés.md) | `7763ca0` (2026-08-19) | `auth/` (JWT, refresh token, admin API) | `pages/login/` | |
| [Profile](documentation/Features/Profile.md) | `d1950b4` (2026-08-19) | `profile/` (Profile + WeightHistory) | `pages/menu/profile/` | Súlytörténet is kész |
| [Szinkronizációs központ](documentation/Features/Szinkronizációs%20központ.md) | `b16939c` (2026-08-25) | — (kliens-oldali infra) | `core/sync/`, `pages/menu/sync/` | Legutóbb "Sync fix" commit — spec + kód együtt frissült |
| [Dark&Light mode](documentation/Features/Dark&Light%20mode.md) | `4562923` (2026-08-19) | — | `pages/menu/theme/`, `core/config/theme.service.ts` | |
| [Nyelv választás](documentation/Features/Nyelv%20választás.md) | `4562923` (2026-08-19) | — | `pages/menu/language/`, `core/config/language.service.ts` | |
| [GearCheck](documentation/Features/GearCheck.md) | `a5c281b` (2026-08-14) | `gear/` (GearItem, PackingTemplate(+Item), PackingSession(+Item)) | `pages/menu/gear/` (items/templates/sessions) | |
| ↳ [Eszközök](documentation/Subfeatures/Eszközök.md) | `56923be` (2026-08-19) | `GearItem*` | `gear/items/` | |
| ↳ [Sablonok](documentation/Subfeatures/Sablonok.md) | `dc3a5d9` (2026-08-20) | `PackingTemplate*` | `gear/templates/` | Post-create redirect+highlight UX |
| ↳ [Pakolás](documentation/Subfeatures/Pakolás.md) | `dc3a5d9` (2026-08-20) | `PackingSession*` | `gear/sessions/` | Cél nélküli session-elnevezés fallback |
| [Tennivalók](documentation/Features/Tennivalók.md) | `d1950b4` (2026-08-19) | `hu.bumler.lm2.tasks` (`LifePlan*`, `HouseholdRoom*`, `HouseholdTask*`, `CalendarEvent*`) | `pages/tasks/` (hub + life-plans/household/events/calendar) | 4/4 subfeature kész, hub + routing véglegesítve. Flag-ek (`tab.feladatok` + 3 csempe) bekapcsolva a `features.json`-ban. Értesítések (`HOUSEHOLD_TASK_DUE`, `EVENT_OCCURRENCE`) és Google export nincs ebben a körben — lásd alul. |
| ↳ [Élet tervek](documentation/Subfeatures/Élet%20tervek.md) | `2b44ec6` (2026-08-19) | `LifePlan*` | `pages/tasks/life-plans/`, `core/data/life-plan.repository.ts` | |
| ↳ [Háztartási feladatok](documentation/Subfeatures/Háztartási%20feladatok.md) | `56923be` (2026-08-19) | `HouseholdRoom*`, `HouseholdTask*` | `pages/tasks/household/`, `core/data/household-{room,task}.repository.ts` | Naptár-producer: `core/data/household-occurrence.ts` |
| ↳ [Események](documentation/Features/Események.md) | `d1950b4` (2026-08-19) | `CalendarEvent*` | `pages/tasks/events/`, `core/data/calendar-event.repository.ts` | Naptár-producer: `core/data/event-occurrence.ts` (DAILY/WEEKLY/YEARLY, feb-29 skip) |
| ↳ [Naptár](documentation/Features/Naptár.md) | `2b44ec6` (2026-08-19) | — (nincs saját adat) | `pages/tasks/calendar/` | Csak frontend aggregátor; hónap-rács + napi lista; swipe gesztus nincs implementálva, csak chevron (lásd Megjegyzések) |

## Folyamatban

| Feature / Subfeature | Spec commit | Backend | Frontend | Megjegyzés |
|---|---|---|---|---|
| [Kaja](documentation/Features/Kaja.md) | `3b4564f` (2026-08-19) | — | — | Csak a hub navigáció; mind a hat subfeature (Élelmiszerek, Élelmiszer tárolás, Recept, Tápérték kalkulátor, Étkezés, Kaja statisztika) kész — lásd alul. (A Bevásárlás a Kaja domainben kapcsolódik, de önálló feature a Menü tab alatt — mindhárom subfeature-je is kész, lásd lent.) |
| ↳ [Élelmiszerek](documentation/Subfeatures/Élelmiszerek.md) | `56923be` (2026-08-19) | `hu.bumler.lm2.food` (`Food`) | `pages/food/catalog/` (lista + kereső + törlés), `core/data/food.repository.ts` | **Kész** — első shared/global (nem user-owned) entitás a kódbázisban; a duplikáció-ellenőrzés alkalmazás-szintű, minden mezőre ([[Névegyediség]]). |
| ↳ [Élelmiszer hozzáadása](documentation/Subfeatures/Élelmiszer%20hozzáadása.md) | `74583ce` (2026-07-24) | — | `pages/food/catalog/` "+" FAB → action sheet (manuális / vonalkód / import) | **Kész** — mindhárom csatorna aktív. |
| ↳ [Élelmiszer manuális bevitele](documentation/Subfeatures/Élelmiszer%20manuális%20bevitele.md) | `d1950b4` (2026-08-19) | (ua., mint Élelmiszerek) | `pages/food/catalog/food-edit.page.ts` | **Kész** — teljes űrlap (13 tápanyag mező fix sorrendben, só→nátrium/klorid auto-számítás touched-állapottal, romlási idők) + Open Food Facts "sync" gomb (diff-megerősítő dialógussal). |
| ↳ [Vonalkódos élelmiszer beolvasás](documentation/Subfeatures/Vonalkódos%20élelmiszer%20beolvasás.md) | `74583ce` (2026-07-24) | — | `pages/food/catalog/food-barcode-scanner.service.ts`, `open-food-facts(.service).ts`, `food-prefill.service.ts` | **Kész, on-device ellenőrzés hátravan** — `@capacitor-mlkit/barcode-scanning` bekötve (`npx cap sync android` lefutott, `AndroidManifest.xml` CAMERA permission + ML Kit meta-data hozzáadva), OFF hívás kliens-oldalról. A natív scan()/modul-telepítés unit-tesztelhetetlen (a Capacitor `registerPlugin` Proxy-ja miatt `spyOn` nem fogja meg — lásd a service fájl kommentjét); csak a `pickBarcodeValue` tiszta logika tesztelt. |
| ↳ [Élelmiszer importálása clipboard-ról](documentation/Subfeatures/Élelmiszer%20importálása%20clipboard-ról.md) | `56923be` (2026-08-19) | — | `pages/food/catalog/food-import.page.ts`, `food-import.ts` (parser) | **Kész** — 22 oszlopos TSV parser (fejléc-felismerés, `-`/üres kezelés, tizedesvessző, só-auto-számítás), élő Új/Duplikátum/Invalid előnézet, csak az Új sorokat menti. |
| ↳ [Élelmiszer tárolás](documentation/Subfeatures/Élelmiszer%20tárolás.md) | `3ddf321` (2026-08-14) | `hu.bumler.lm2.food` (`StoredFood`, per-user, `food_id` a globális katalógusra) | `pages/food/storage/` (lista: hely-szűrő + lejárat-sorrend + romlott/felbontott badge; szerkesztő: kereshető Food-választó → mennyiség/hely/lejárat), `core/data/stored-food.repository.ts`, `pages/food/storage/shelf-life.ts` | **Kész a manuális CRUD + felbontás körre.** Bevásárlásból létrehozás (`db` egység szerinti darabolás) a [[Bevásárlás teljesítve]] flow-val együtt jön, az még nincs elkezdve. Készletcsökkenés étkezéskor a [[Étkezés]] slice-szal együtt jön (az orchestrálja). Lejárat-számítás (előtöltés + felbontás) naptári hónap/év-hozzáadással (`shelf-life.ts`, nem a Mennyiség mező fix napszámú egyenlőség-táblájával — az kifejezetten csak összehasonlításra szolgál). Törléskori cascade (Food törlésekor a rá hivatkozó StoredFood sorok is soft delete-elődnek, minden felhasználónál) mindkét oldalon (backend `FoodService.delete`, frontend `SqliteStorageBackend.deleteFood` + `SyncEngine` tombstone/pull ágak) megvan. Értesítések (lead-time emlékeztető, "megromlott" push) még nincs — az `[[Értesítések]]` közös réteggel együtt jön, ahogy a Háztartási feladatok/Élet tervek esetén is. Nincs teljes szegmentált Kaja hub — a Katalógus/Tárolás váltás egyelőre egy egyszerű `ion-segment` mindkét lista tetején. |
| ↳ [Recept](documentation/Subfeatures/Recept.md) | `d1950b4` (2026-08-19) | `hu.bumler.lm2.food` (`Recipe`, `RecipeIngredient`, mindkettő shared/global mint `Food`) | `pages/food/recipe/` (lista + szerkesztő: multi-select Food-választó, up/down natíven / drag-and-drop weben rendezés, élő ár/kcal/fehérje/szénhidrát/zsír összegzés + hiányos-jelzés), `core/data/recipe.repository.ts`, `pages/food/recipe/recipe-summary.ts` | **Kész.** Nested aggregate PUT (mint `PackingTemplate`/`PackingTemplateItem`), de `user_id` nélkül mindkét táblán. Két független duplikáció-szabály: recept **neve** (valódi globális Névegyediség-scope, ellentétben a Food mezőhalmaz-szabályával) + élő hozzávaló-halmaz (`foodId`+`amount`+`unit` párok, sorrendtől függetlenül, csak ha van hozzávaló). Összegzés + `db` megjelenítés tisztán kliens-oldali (`recipe-summary.ts`), a helyi Food-katalógus pillanatképéből — nincs backend endpoint rá. Food törléskor cascade a rá hivatkozó RecipeIngredient sorokra (minden recepten) mindkét oldalon (backend `FoodService.delete`, frontend `SqliteStorageBackend.deleteFood` + `SyncEngine` tombstone/pull ágak). Recept törlésekor cascade a saját hozzávalóira; az Étkezés/Recept forrású étkezés felé mutató cascade majd azzal a slice-szal együtt jön. Nincs teljes szegmentált Kaja hub — a Katalógus/Tárolás/Recept váltás egyelőre egy egyszerű `ion-segment` mindhárom lista tetején. |
| ↳ [Tápérték kalkulátor](documentation/Features/Tápérték%20kalkulátor.md) | `d1950b4` (2026-08-19) | — | `shared/tdee-calculator.ts` (`computeTdee`, `computeMacroGoals`) | **Kész a számítási motorra.** Tisztán kliens-oldali pure TS, nincs backend endpoint rá (a spec "szerveroldali validáció/read-model" mondata ellenére sincs owner-endpoint, ugyanaz a "kliens gördíti tovább" minta, mint a `recipe-summary.ts`/`shelf-life.ts` esetén). Mifflin–St Jeor BMR, PAL fix 1.2, cél-Δ (±1100 kcal/kg/hét), nemenkénti napi kalória-floor (férfi 1500 / nő 1200), és a hat lépéses szekvenciális makró-redukciós lánc (fehérje/zsír csökkentése 20g szénhidrát-padlóig, majd 0g-ig) mind implementálva, egységtesztelve minden lépésre. **`activityExtraKcal` bemeneti paraméter, alapértéke 0** — a hívó adja át. Az **Edzés A4** óta a MET-alapú edzéskalória-fele él: `core/data/activity-kcal.ts` `workoutKcalForDay` (Σ `sessionKcal()` az aznapi élő session-ökre) a Kaja dashboard `computeTdee`-hívásába kötve. A **Lépésszám követés L1** óta a lépéskalória-fele is él: `activity-kcal.ts` `stepKcalForDay` (`max(0, stepCount − 3000) × testsúly × 0.00045`) a Kaja dashboard `workoutExtraKcal`-jában. Nincs saját képernyő (a spec szerint opcionális); az [[Étkezés]] dashboard az első tényleges fogyasztó. |
| ↳ [Étkezés](documentation/Subfeatures/Étkezés.md) | `8a2d452` (2026-07-27) | `hu.bumler.lm2.food` (`Meal`, `MealItem` — per-user, `MealItem` polimorf RECIPE/FOOD/CUSTOM) | `pages/food/meal/` (dashboard: dátum-nav + 4 progress bar + aktivitás-sor + napi ár + napi lista; szerkesztő: időpont+megjegyzés+vegyes tételtípus-lista), `core/data/meal.repository.ts`, `pages/food/storage/stock-consumption.ts`, `shared/timezone.ts`, `pages/food/meal/daily-nutrition.ts`, `pages/food/meal/progress-bar-status.ts`, `pages/food/meal/nutrition-progress-bar.component.ts` | **Kész, 6a+6b együtt.** Nested aggregate PUT (mint `Recipe`/`RecipeIngredient`), de `PackingTemplate` mintájára user-owned (`Meal.user_id`); `MealItem`-nek nincs saját `user_id`-ja, a `sync_changes` view a szülő `Meal`-en keresztül vetíti ki — ez az első user-owned gyerektábla a kódbázisban (a korábbi `RecipeIngredient` NULL-owner mintája itt nem alkalmazható). Készletlevonás ([[Élelmiszer tárolás]]) **tisztán kliens-oldali**, csak étkezés **létrehozáskor** (`MealRepository.consumeStock`, `stock-consumption.ts` pure FIFO/opened-first terv), nincs backend endpoint rá — ugyanaz a "kliens gördíti tovább" minta, mint `StoredFoodService` saját javadoc-ja szerint már eddig is várt volt. `eatenAt` (UTC timestamptz) + `timeZoneId` (IANA) az első ilyen pár a kódbázisban (a `CalendarEvent` csak sima helyi dátum/idő stringeket tárol) — a `shared/timezone.ts` új modul (`deviceTimeZoneId`, `calendarDayInZone`, `instantFromLocalDateTime`), DST-váltás + eltérő megjelenítő-zóna tesztekkel. Food/Recipe törléskor cascade a rá hivatkozó MealItem sorokra + az emiatt üressé váló Meal soft delete-jére (`MealCascade` helper, megosztva `FoodService.delete`/`RecipeService.delete` között), mindkét oldalon (backend + `SyncEngine` tombstone/pull ágak). **6b (dashboard):** a 4 progress bar (kalória/fehérje/szénhidrát/zsír) + színlogika (`progress-bar-status.ts`, pure TS, a spec ±5%-os sáv + fogyás-vs-megtartás/tömegelés elágazás szerint) + napi összesítés (`daily-nutrition.ts`, `computeMealItemEffective`-t hívja tételenként) + a dashboard az első tényleges `computeTdee`/`ProfileRepository` fogyasztó a kódbázisban (nincs önálló Tápérték kalkulátor képernyő). Hiányos profilnál (`computable: false`) a barok helyett egy szöveges figyelmeztetés jelenik meg, nincs kitalált szín/cél. `activityExtraKcal` az **Edzés A4** óta a tényleges aznapi edzéskalória (`core/data/activity-kcal.ts` `workoutKcalForDay`, a `WorkoutSessionRepository`-ból), a **Lépésszám követés L1** óta `+ stepKcalForDay` (a `DailyStepLogRepository`-ból). A másodlagos aktivitás-sor csak `> 0` esetén jelenik meg. A tab-root redirect mostantól `meal`-re mutat (a korábbi `catalog` helyett), a Katalógus/Tárolás/Recept/Étkezés/Statisztika váltás egyelőre egy egyszerű `ion-segment` mind az öt lista tetején — teljes szegmentált Kaja hub még nincs. |
| ↳ [Kaja statisztika](documentation/Subfeatures/Kaja%20statisztika.md) | `cfa7e2e` (2026-08-19) | — | `pages/food/stats/kaja-stats.page.ts` (Élelmiszer/Recept váltó + mutató-választó + irány + kereső), `catalog-ratios.ts` (pure rangsoroló) | **Kész — tisztán frontend, nincs backend érintettség** (a spec saját szava szerint is). Egyetlen kidolgozott statisztika-típus (Katalógus arányok); a `statType` diszkriminátor a Frontend.md architektúra-jegyzet kérése szerint típus-szinten létezik, de nincs hozzá látható UI-választó, amíg csak egy opció van (elkerülve a felesleges egy-opciós vezérlőt). Három mutató (fehérje/kalória, fehérje/szénhidrát, fehérje/ár), mindhárom "magasabb jobb". Élelmiszernél az ár/100 g-ra hozás a `recipe-summary.ts` már meglévő `db`-egység-kizárási szabályát követi (nincs súly/térfogat dimenzió egy darabszámos nettóhoz, ezért hiányos). Receptnél a már meglévő `computeRecipeSummary` összesítését használja (egy adag = a recept teljes összege). A rangsor a teljes, szűretlen katalóguson számolódik, a keresés csak utólag szűri a már kiosztott helyezéseket — így egy találat helyezése mindig a teljes listás pozíció, a specnek megfelelően. Az öt meglévő Kaja-tab oldal (`meal-dashboard`, `storage-list`, `food-list`, `recipe-list`, `kaja-stats`) mindegyike saját, egymással szinkronban tartott `ion-segment`+`switchSection` másolatot tartalmaz — nincs megosztott szegment-komponens, ez már korábban is így volt. `kaja.statisztika` feature flag bekapcsolva. |
| [Bevásárlás](documentation/Features/Bevásárlás.md) | `3ddf321` (2026-08-14) | — | — | Csak a hub navigáció (Menü tab, nem Kaja alatt); mindhárom subfeature (Bevásárlólista írás, Bevásárlás teljesítve, Bevásárlás előzmény) kész — lásd alul. |
| ↳ [Bevásárlólista írás](documentation/Subfeatures/Bevásárlólista%20írás.md) | `3ddf321` (2026-08-14) | `hu.bumler.lm2.food` (`ShoppingList`, `ShoppingListItem` — per-user, `ShoppingListItem` polimorf FOOD/NON_FOOD, kolokálva a `food` csomagban a `Food` FK-referencia miatt, ugyanúgy mint `Meal`/`MealItem`) | `pages/menu/shopping/` (lista + szerkesztő: névmező, FOOD-picker a meal-edit mintájára, NON_FOOD inline sor név+mennyiség+szabad szöveggel, pipa checkbox), `core/data/shopping-list.repository.ts` | **Kész.** Nested aggregate PUT (mint `Meal`/`MealItem`), de a Meal-lel ellentétben **nincs "legalább egy tétel" megkötés** — a spec explicit megengedi az üres aktív listát (kézi törléssel, nem automatikus cascade-del). `status`/`completedAt` mezők megvannak a sémában, de ezt a kört tekintve read-only-k voltak — a [[Bevásárlás teljesítve]] slice azóta beköti a `status` írását. Food törléskor cascade a rá hivatkozó ShoppingListItem sorokra (`ShoppingListItemCascade`, a `MealCascade`-től eltérően **nem** töröl automatikusan üresen maradt listát), mindkét oldalon. A "Bevásárlás vége" belépő ebben a körben még tudatosan hiányzott — a [[Bevásárlás teljesítve]] slice pótolta. `menu.bevasarlas` feature flag bekapcsolva. |
| ↳ [Bevásárlás teljesítve](documentation/Subfeatures/Bevásárlás%20teljesítve.md) | `d1950b4` (2026-07-27) | `hu.bumler.lm2.food` (`ShoppingListService.complete`, `IdempotencyKeyEntity`/`IdempotencyKeyRepository`, `ShelfLifeCalculator`) | `pages/menu/shopping/shopping-list-complete.page.ts` (egy review-képernyő: lejárat + — ha 1-nél több engedélyezett — tárolási hely soronként), `shopping-list-complete.ts` (pure draft builder), `ShoppingListRepository.complete()` | **Kész — a projekt első `Idempotency-Key`-alapú replay-védelmet implementáló végpontja.** `POST /api/shopping-lists/{id}/complete`: egy tranzakcióban StoredFood sorokat hoz létre a pipált élelmiszer tételekből (`db` egység → N külön sor, katalógus nettó tartalommal vagy `1 db` alapértelmezéssel), archiválja a listát (`status = ARCHIVED`), és — ha maradt pipálatlan tétel — új aktív listát hoz létre azokból. Az `idempotency_key` tábla (V1 migrációból) eddig üresen állt; ez az első entitás, ami ténylegesen olvassa/írja — replay esetén a tárolt választ adja vissza, nem fut le újra a tranzakció. Tárolási hely / lejárat feloldás: pontosan egy engedélyezett katalógus-hely esetén a szerver tud alapértelmezni (helyet és — `ShelfLifeCalculator`, a `shelf-life.ts` szerver-oldali portja — lejáratot is); egyébként a kliensnek explicit meg kell adnia mindkettőt. A kliens **helyi-first**: a wizard már a kérés elküldése előtt felold minden mezőt (ugyanazzal a `shelf-life.ts`-szel, mint a manuális Tárolás-felvétel), és minden új sor id-ját (StoredFood, új lista, új tételek) ő generálja — a szerver visszaigazolja, nem újakat oszt ki. A `sync-engine.service.ts` a `ShoppingList` entityType alatt két válaszformát különböztet meg szerkezet szerint (`'archivedListId' in dto`), a `PackingSession` két-válaszformájú mintáját követve; egy 409 a `.../complete` URL-en nem tombstone-ol (a lista ARCHIVED, nem törölt). |
| ↳ [Bevásárlás előzmény](documentation/Subfeatures/Bevásárlás%20előzmény.md) | `3ddf321` (2026-08-14) | — | `pages/menu/shopping/shopping-history.page.ts` (archivált listák + kereső), `shopping-history-detail.page.ts` (read-only tétellista + Újralistázás), `shopping-history.ts` (pure keresés/rangsorolás) | **Kész — tisztán frontend, nincs backend érintettség** (a spec saját szava szerint is: a `GET /api/shopping-lists` már eddig is minden nem-törölt listát visszaadott `status`-tól függetlenül, csak a Bevásárlás teljesítve kör óta létező `ShoppingListsPage`-szűrő rejtette el az ARCHIVED sorokat az aktív nézetből). Keresés egy összefűzött szöveg ellen fut (lista neve + minden élő tétel megjelenített szövege — FOOD-nál a katalógusból feloldott név, NON_FOOD-nál name+note), a meglévő `matchesSearch`/`compareRank` (Szöveges keresés) újrafelhasználásával; alapértelmezett sorrend `completedAt` szerint csökkenő, keresés közben az ékezet-pontos találat előre kerül. Az előzmény-részlet nem az editor egy módja — külön, csak-olvasható oldal, hogy az editor "csak ACTIVE listát érint" invariánsa ne sérüljön. Újralistázás a Bevásárlás teljesítve kör `toSaveItem` helperét használja újra (export-olva), és a létrejött másolat editorába navigál. |
| [Edzés](documentation/Features/Edzés.md) | `61daa22` (2026-08-19) | `hu.bumler.lm2.workout` (a gyerekek entitásai; közös edzés-domain) | `pages/workout/` (tab shell + `workout-segment-header.component.ts` megosztott felső szegmens + `workout-sections.ts` registry), `app.routes.ts` `/tabs/workout` fa, `core/data/activity-kcal.ts` | **Kész (A0–A6 + M0–M8) — mind az 5 alkör (Edzésnapló, Heti terv, Mászónapló, Úszás napló, Biciklizés napló) kész és élő.** Edzésnapló \| Heti terv \| Mászás \| Úszás \| Bicikli felső szegmens; mind az 5 szegmens-route (`log`, `weekly-plan`, `climbing`, `swimming`, `cycling`) be van kötve, és az M8 óta a `climbing` alatt a teljes fa élő (hub + 4 kontextus-napló + admin + statisztikák), `edzes.maszonaplo` → `true`. **A4:** `tab.edzes` + `edzes.hetiTerv` → `true`; `activity-kcal.ts` `workoutKcalForDay` bekötve a Kaja dashboard `computeTdee` 3. argumentumába. **A5:** [[Úszás napló]] — `edzes.uszas` → `true`, `swimKcalForDay` hozzáadva a Kaja dashboard aktivitás-kalóriájához. **A6 (ebben a commitban):** [[Biciklizés napló]] — lásd külön sor lent; `edzes.bicikli` → `true`, `bikeKcalForDay` a `workoutKcalForDay` + `swimKcalForDay` mellé adva. Lépéskalória továbbra is 0 ([[Lépésszám követés]] nincs kész). **M0:** [[Mászónapló]] pure TS alap — `pages/workout/climbing/` skála/konverziós-mátrix/kcal modulok + spec, wiring nélkül. **M1:** climbing hub váz + `climbing` szegmens route (`edzes.maszonaplo` flag `false`). **M2a-i:** indoor törzsadat backend — `hu.bumler.lm2.climbing` csomag (`Gym` + `GymColorBand` + `IndoorRoute` flat CRUD), `common/HexColorNormalizer`, Flyway `V22`, hand-written OpenAPI. **M2a-o:** outdoor törzsadat backend — a közös helyszínfa `Crag` + `Sector` + `Route` + `BoulderProblem` flat CRUD (mind user-owned, névegyediség nélkül), Flyway `V23`, hand-written OpenAPI (8 path + 8 schema), 4 `*SyncDataLoader`. **M2b (ebben a commitban):** session nested aggregate backend — `ClimbingSession` → `AscentAttempt` → `PitchLog` háromszintű nested aggregate a `WorkoutSessionService` `saveTree` mintájára, egyetlen lapos `climbing_session` tábla `location_type` + `discipline` diszkriminátorral, `GET/POST/PUT/DELETE /api/climbing/sessions`, Flyway `V24`, hand-written OpenAPI (2 path + 4 schema), 3 `*SyncDataLoader`. **M3a:** indoor törzsadat admin frontend — `Gym` + `GymColorBand` + `IndoorRoute` teljes frontend + offline-sync bekötése (`shared/hex-color-normalization.ts` + fixture-paritás, 3 repository, SQLite séma `v20`, `pages/workout/climbing/admin/` képernyők, `climbing/admin` route-fa, i18n), regenerált Angular kliens. **M3b (ebben a commitban):** outdoor törzsadat admin frontend — `Crag` → `Sector` → (`Route` \| `BoulderProblem`) teljes frontend + offline-sync bekötése (4 repository névegyediség nélkül, SQLite séma `v21`, mélyen ágyazott `climbing/admin/crags` route-fa hierarchikus szerkesztőkkel, i18n). **M4 (ebben a commitban):** Indoor boulder napló + a `ClimbingSession` → `AscentAttempt` → `PitchLog` nested aggregate teljes frontend offline-sync bekötése (SQLite séma `v22`, `local-rows`/`StorageBackend`/`SqliteStorageBackend`/`HttpStorageBackend`/`OutboxEntityType`/`OutboxEntityRegistry`/`SyncEngine` ágak, `climbing-session.repository.ts`, `pages/workout/climbing/naplo/` list + indoor-boulder edit screen, `climbing/indoor-boulder` route-fa). **M5:** Indoor köteles napló — a 2. kontextus-napló (`INDOOR` + `ROPE`), a megosztott list page + saját `indoor-rope-session-edit.page` (safety chip, francia/YDS grade parser, opcionális `IndoorRoute` / ad-hoc név, terem-falmagasság length default, nincs szín-sáv / PitchLog); nincs séma/backend/offline-wiring változás; `climbing/indoor-rope` route-fa + `indoor-rope` `wired: true`. **M6:** Outdoor boulder napló — a 3. kontextus-napló (`OUTDOOR` + `BOULDER`), a megosztott list page + saját `outdoor-boulder-session-edit.page` (`Crag` + `Sector` helyszín-picker, opcionális master `BoulderProblem` vagy ad-hoc név „mentés a katalógusba" kapcsolóval, session-szintű `rockType`, szektorból öröklődő `aspect`, `weatherConditions` chip, nincs szín-sáv / PitchLog); nincs séma/backend/offline-wiring változás; `climbing/outdoor-boulder` route-fa + `outdoor-boulder` `wired: true`. **M7:** Outdoor köteles napló — a 4. és utolsó kontextus-napló (`OUTDOOR` + `ROPE`), a megosztott list page + saját `outdoor-rope-session-edit.page` (outdoor helyszín-picker + köteles rész: `TOPROPE`\|`LEAD`\|`TRAD` safety chip, opcionális master `Route` vagy ad-hoc név, opcionális kísérletenkénti `PitchLog` szerkesztő `isLead` toggle-lel); nincs séma/backend/offline-wiring változás; `climbing/outdoor-rope` route-fa + `outdoor-rope` `wired: true` (mind a 4 csempe él). **M8 (ebben a commitban):** mászó statisztikák + a Mászónapló-alkör lezárása — `pages/workout/climbing/climbing-stats.ts` (pure TS: kontextusonkénti max fokozat + összes volumen + Onsight/Flash/Redpoint/Sikertelen sikerarány, mind összesített; 30/90/365 napos grade-piramis) + `stats/climbing-stats.page`, `climbing/stats` route; `activity-kcal.ts` `climbingKcalForDay` a Kaja dashboard `workoutExtraKcal`-jába (a `workoutKcalForDay` + `swimKcalForDay` + `bikeKcalForDay` mellé); **`edzes.maszonaplo` → `true`** (a teljes Mászás szegmens + hub + 4 kontextus-napló + admin + statisztikák élő). Lásd a Mászónapló-alkör szakaszt lent. Hátra az Edzésből: nincs — a Mászónapló volt az utolsó alkör (a repo szintjén Pénzügyek + AYCM tracker van még hátra). |
| ↳ [Gyakorlat](documentation/Subfeatures/Gyakorlat.md) | `d1950b4` (2026-08-19) | `hu.bumler.lm2.workout` (`ExerciseEntity` + Controller/Service/Mapper/Repository/SyncDataLoader, `exercise_catalog` tábla V17) | `pages/workout/exercises/` (katalógus lista: kereső + kategória-chipek + kedvencek szűrő + inline csillag; create/edit: név/kategória/kind/pihenőidő/eszköz/kedvenc + kind-hint), `core/data/exercise.repository.ts` (+ read-cache mint Food/Recipe), `core/data/exercise-seed.ts` + `assets/data/exercise-seed.json` (12 beépített gyakorlat, determinisztikus v5 id), teljes offline-sync bekötés (`Exercise` outbox entityType, `local-rows`, `SyncEngine` ágak, SQLite séma v15) | **Kész (A1).** User-owned katalógus a `GearItem` slice mintájára: idempotens upsert kliens id-ra, `409 UNIQUE_VIOLATION` + `conflictingId`, `409 ENTITY_DELETED` PUT-after-delete-re, cross-user 404, soft delete cascade nélkül (a napló/heti terv snapshotol). Seed: első indításkor (üres store), determinisztikus id-k → két offline eszköz konvergál; weben `localStorage` latch tartja egyszeri-örökre. |
| ↳ [Edzésnapló](documentation/Subfeatures/Edzésnapló.md) | `58a0212` (2026-08-25) | `hu.bumler.lm2.workout` (`WorkoutSession` + `WorkoutExerciseEntry` + `WorkoutSetEntry` — Controller/Service/3 Mapper/3 Repository/3 SyncDataLoader, `workout_session`/`workout_exercise_entry`/`workout_set_entry` táblák V18) | `pages/workout/log/` (dashboard: session-kártyák + „Új edzés” / „Ugyanaz mint legutóbb” / „Utólagos rögzítés” / élő-draft „folytatás” banner; `workout-session-edit.page.ts` utólagos szerkesztő; `active-workout.page.ts` élő Active Workout View: futó stopper + per-szett rest timer haptic + beep-pel, PR-badge-ek, HIIT kör-segédek; `workout-fields.ts` megosztott `visibleFields` / `formatStopwatch` / `nextRestValue`), `workout-metrics.ts` (pure TS: MET kcal, Epley 1RM, volumen, PR-detektálás, ghost) + spec, `core/data/workout-session.repository.ts` (+ read-cache), `core/data/workout-draft.service.ts` (élő draft `@capacitor/preferences`-ben, nem outbox), `shared/exercise-picker/` megosztott picker, teljes offline-sync bekötés (`WorkoutSession` outbox entityType, `local-rows` 3 szint, `SyncEngine` drain/pull/tombstone ágak mindhárom entitásra, SQLite séma v16) | **Kész (A2a + A2b).** Háromszintű nested aggregate PUT (`MealService.saveTree` mintájára kiterjesztve): session + gyakorlatok + szettek egy `@Transactional` fában, `NestedChildResolver` create/undelete/reject per szint; a válasz minden sort (élő + tombstone) visszaad. User-owned mint a `Meal`; a két gyerektábla `user_id` nélkül, a `sync_changes` view a `workout_session`-ig visszajoinol. `exercise_name`/`category`/`kind` snapshot — master átnevezés/törlés nem írja felül; `exercise_id` puha link (ad-hoc = null, `dependsOn` a még nem szinkronizált katalógus-sorra). Nincs szerveroldali kcal; `activityExtraKcal` = `sessionKcal()` × (Profile testsúly), tisztán kliens. **A2b:** az élő session egyetlen device-local draft (`@capacitor/preferences`, mint a `ThemeService`), **nem** outbox sor — csak „Befejezés" épít belőle `WorkoutSessionDraft`-ot és enqueue-olja; app-kill / tab-váltás után helyreáll. Nincs backend / SQLite séma változás A2b-ben. |
| ↳ [Úszás napló](documentation/Features/Úszás%20napló.md) | `8a2d452` (2026-07-27) | `hu.bumler.lm2.workout` (`SwimLog` — Controller/Service/Mapper/Repository/SyncDataLoader, `swim_log` tábla V20) | `pages/workout/swimming/` (lista: időrendi úszáskártyák + kcal; `swim-log-edit.page.ts` create/edit űrlap; `swim-metrics.ts` pure TS: `SWIM_MET` / `swimKcal` / `swimDistanceMeters`) + spec, `core/data/swim-log.repository.ts`, `core/data/activity-kcal.ts` `swimKcalForDay` (Kaja dashboard-ba kötve), teljes offline-sync bekötés (`SwimLog` outbox entityType, `local-rows`, `SyncEngine` drain/pull/tombstone/`_needs_refetch` ágak, SQLite séma v18) | **Kész (A5).** Lapos, user-owned CRUD a `LifePlan` mintájára (nincs nested aggregate, nincs névegyediség): idempotens upsert kliens id-ra, `409 ENTITY_DELETED` PUT-after-delete-re, cross-user 404, soft delete. `distanceMeters` = `poolLengthMeters × lapCount` amikor mindkettő megvan (szerver felülírja a küldött értéket); `OPEN_WATER`-nél a medence mezők tiltva (400), a táv kézi. Nincs szerveroldali kcal — `swimKcal()` (MET × Profile testsúly × perc/60) tisztán kliens, `swimKcalForDay` a `workoutKcalForDay` mellé adódik az `activityExtraKcal`-ban. `edzes.uszas` flag **bekapcsolva**. |
| ↳ [Biciklizés napló](documentation/Features/Bicikliz%C3%A9s%20napl%C3%B3.md) | `8a2d452` (2026-07-27) | `hu.bumler.lm2.workout` (`BikeRideLog` — Controller/Service/Mapper/Repository/SyncDataLoader, `bike_ride_log` tábla V21) | `pages/workout/cycling/` (lista: időrendi kerékpárkártyák + táv/szint/kcal; `bike-ride-log-edit.page.ts` create/edit űrlap átlagsebesség + soft MET-kategória javaslattal; `bike-metrics.ts` pure TS: `BIKE_MET` / `bikeKcal` / `avgSpeedKmH` / `suggestedIntensity`) + spec, `core/data/bike-ride-log.repository.ts`, `core/data/activity-kcal.ts` `bikeKcalForDay` (Kaja dashboard-ba kötve), teljes offline-sync bekötés (`BikeRideLog` outbox entityType, `local-rows`, `SyncEngine` drain/pull/tombstone/`_needs_refetch` ágak, SQLite séma v19) | **Kész (A6).** Lapos, user-owned CRUD az [[Úszás napló]] mintáját tükrözve, de a medence-mező párosítási szabály **nélkül**: `distanceKm` és `elevationGainMeters` opcionális, független mezők (`≥ 0`, per-oszlop domain a OpenAPI + DB check-en). Idempotens upsert kliens id-ra, `409 ENTITY_DELETED` PUT-after-delete-re, cross-user 404, soft delete. Nincs szerveroldali kcal — `bikeKcal()` (MET × Profile testsúly × perc/60) tisztán kliens; `distanceKm`/`elevationGainMeters` sosincs a képletben, csak napló + UI átlagsebesség-hint (`avgSpeedKmH` → `suggestedIntensity`, sosem írja felül a user választását). `edzes.bicikli` flag **bekapcsolva**. |
| ↳ [Heti terv](documentation/Subfeatures/Heti%20terv.md) | `2cced0f` (2026-08-28) | `hu.bumler.lm2.workout` (`WorkoutPlan` + `WorkoutPlanExercise` + `WorkoutPlanSet` háromszintű nested aggregate `saveTree`; `WeeklyPlan` + `WeeklyPlanSlot` kétszintű; Controller/Service/5 Mapper/5 Repository/5 SyncDataLoader, `workout_plan`/`workout_plan_exercise`/`workout_plan_set`/`weekly_plan`/`weekly_plan_slot` táblák V19; FK `workout_session.plan_id → workout_plan.id` is V19-ben) | `pages/workout/plan/` (sablon lista Aktív/Inaktív/Mind szűrő + soronkénti aktív toggle + `goalLabel` csoport-fejléc; `plan-edit.page.ts` nested gyakorlat/cél-szett szerkesztő a `shared/exercise-picker` + `workout-fields.ts` `visibleFields` újrahasználásával), `pages/workout/weekly-plan/` (7 napos dashboard: nap→sablon kiosztás action-sheet, „Teljesítve" jelvény adherence szerint, „Edzés indítása" CTA `?planId=`-del az élő nézetbe, prev/next hét nav, „Másolás következő hétre"), `pages/workout/weekly-plan/weekly-plan-adherence.ts` (pure: `mondayOf`/`weekDates`/`isSlotCompleted`) + spec, `core/data/workout-plan.repository.ts` + `core/data/weekly-plan.repository.ts` (read-cache; `WeeklyPlan.id` determinisztikus v5 `(userId, weekStartDate)`-ből), teljes offline-sync bekötés (`WorkoutPlan` + `WeeklyPlan` outbox entityType, `local-rows` 5 tábla, `SyncEngine` drain/pull/tombstone/`_needs_refetch` ágak mind az 5 entitásra, SQLite séma v17) | **Kész (A3a + A3b).** A2 mintáit követi: háromszintű `saveTree` `NestedChildResolver`-rel (`WorkoutPlan`), kétszintű (`WeeklyPlan`), user-owned szülő + `user_id` nélküli gyerektáblák a `sync_changes` view-ig visszajoinolva. `active` sima mező a nested PUT-on (nincs külön endpoint); kikapcsolása csak a pickerekből rejt el, a múltbeli `planId` / slot érintetlen. `WorkoutPlanExercise.exercise_id` **NOT NULL** (kötelező a sablonban, ellentétben a naplóval), `dependsOn` a még nem szinkronizált katalógus-sorra; `WeeklyPlanSlot.plan_id` `dependsOn` a még nem szinkronizált sablonra. `WeeklyPlan.id` = determinisztikus v5, POST egy létező/törölt hétre feléleszti. Adherence: nem törölt `WorkoutSession` a hét `[weekStart, weekStart+6]` tartományában `planId` egyezéssel, tartalmi vizsgálat nélkül. Nested aggregate → nincs Fix a sync központban (csak Skip/Drop/payload-nézet). `edzes.hetiTerv` flag **bekapcsolva** az A4-ben. |
| [Pénzügyek](documentation/Features/Pénzügyek.md) | `d1950b4` (2026-08-19) | — | `pages/menu/finance/finance-dashboard.page` (3 kártya: Nettó / Havi kiadások / Maradék, mind szám vagy `~` a [[Profile]]/[[Tápérték kalkulátor]] „hiányos → `~`" mintája szerint; tap → gyerek route), `menu.page` Pénzügyek-pont (`menu.penzugyek` flag), `finance` index route `featureFlagGuard('menu.penzugyek')`-kel. | **Kész (P1+P2+P3).** Menü → Pénzügyek hub + két gyerek, három slice-ban (P1 Rendszeres kiadások → P2 Nettó fizetés kalkulátor → P3 hub + Menü-pont). A hubnak **nincs** saját entitása / OpenAPI-ja / offline-wiringje; tisztán fogyasztó: Nettó = `computeNetPay` `net` (vagy `~` üres bruttónál), Havi kiadások = `sumMonthlyEquivalentHuf` a beszámított sorokra (üres → `0 Ft`, sosem `~`), Maradék = `net − havi` előjeles, 0-ra nem clampelve (vagy `~`, ha a nettó `~`). Képlet nem másolódik — import a gyerek utility-kből. `menu.penzugyek` flag `true`. Lásd „Lezárt kör: Pénzügyek". |
| ↳ [Rendszeres kiadások](documentation/Subfeatures/Rendszeres%20kiadások.md) | `7801d47` (2026-08-19) | `hu.bumler.lm2.finance` (`RecurringExpense` — Controller/Service/Mapper/Repository/SyncDataLoader, `recurring_expense` tábla V25; első `finance` csomag) | `pages/menu/finance/` (`recurring-expense-list.page` szekciók Lejárt/Ma/Később/Szüneteltetett + kategória-chip szűrő + kereső + sliding törlés/szünet + „Fizetve"; `recurring-expense-edit.page` create/edit; `recurring-expense-math.ts` pure TS: `monthlyEquivalentHuf` / `addPeriod` / `countsInMonthlyEquivalent` / `classifyExpenseSection` / `dayLag` + spec; `finance-labels.ts`), `core/data/recurring-expense.repository.ts`, teljes offline-sync bekötés (`RecurringExpense` outbox entityType, `local-rows`, `SyncEngine` drain/pull/tombstone/`_needs_refetch` ágak, SQLite séma v23), `finance/recurring-expenses` route-fa `featureFlagGuard('menu.penzugyek')`-kel. | **Kész (P1).** Lapos, user-owned CRUD az [[Úszás napló]] / [[Biciklizés napló]] mintáját tükrözve: idempotens upsert kliens id-ra, `409 ENTITY_DELETED` PUT-after-delete-re, cross-user 404, soft delete, `name` trim-non-empty a service-ben (nem egyedi). „Fizetve" = sima `PUT` kliens-számolt `addPeriod`-dátummal (a szerver **nem** rollol, **nem** számol havi ekvivalenst); `billingDayOfMonth` csak create-en / kézi dátum-szerkesztésen szinkronizál a dátum napjához. `monthlyEquivalentHuf` (MONTHLY→amount, QUARTERLY→/3, YEARLY→/12, `Math.round`) az SSOT — a [[Pénzügyek]] hub (P3) és a jövőbeli [[AYCM tracker]] „megéri-e" ezt importálja. Beszámított sor = `deleted = false ∧ active = true`. Nincs Fix-kizárás a sync központban (lapos entitás → van `buildFixWriteTask`). |
| ↳ [Nettó fizetés kalkulátor](documentation/Subfeatures/Nettó%20fizetés%20kalkulátor.md) | `b2ddad4` (2026-08-19) | — (tisztán kliens, nincs OpenAPI / szerver-számítás) | `shared/net-pay-calculator.ts` (`TB_RATE` 0.185 / `SZJA_RATE` 0.15 / `UNDER_25_AGE_LIMIT` 25 / `UNDER_25_SZJA_EXEMPTION_CAP_HUF` 715 765 konstansok + `computeNetPay` + spec), `shared/local-date.ts` `ageInYears` (kiemelve a `tdee-calculator.ts`-ből, közös „teljes évek, floor period" — a `computeTdee` most importálja), `pages/menu/finance/net-pay.page` (Bruttó/TB/SZJA/Nettó sorok, `~` csak üres bruttónál, 25-alatti badge, disclaimer, CTA → Profile), `finance/net-pay` route. | **Kész (P2).** Ugyanaz a „kliens gördíti tovább" minta, mint a [[Tápérték kalkulátor]] (`shared/tdee-calculator.ts`): pure TS, nincs backend/store, hiányzó bruttó → `computable: false` (`~`), sosem dob. Egyszerűsített **munkavállalói** becslés: `tb = round(gross × 0.185)`; `szja = round(0.15 × gross)` vagy 25 alatt `round(0.15 × max(0, gross − 715 765))`; `net = gross − tb − szja`. `under25ExemptionApplied` = `birthDate` kitöltve ∧ `age < 25` (a plafon felett is true). Kitöltött 0 bruttó érvényes. Nincs saját séma/offline-wiring változás. |
| [AYCM tracker](documentation/Features/AYCM%20tracker.md) | `d1950b4` (2026-08-19) | `hu.bumler.lm2.aycm` (`AycmSettings` singleton — Entity/Mapper/Repository/Service/Controller/SyncDataLoader, `aycm_settings` tábla V28; `common/DeterministicUuid`), a gyerekek entitásai külön sorokban | `pages/menu/aycm/aycm-dashboard.page` (4 kártya: E havi látogatások / E havi érték / Megéri-e / Bérlet — mind szám, `0 Ft`, vagy `~` a [[Pénzügyek]] „hiányos → `~`" mintája szerint; FAB → Check-In; Bérlet-picker action-sheet + deep-link a Rendszeres kiadás create-re), `core/data/aycm-settings.repository.ts` (determinisztikus v5 id `AycmSettings:<userId>`, `ProfileRepository` minta), `pages/menu/aycm/aycm-pass-cost.ts` (`passCostComputable` / `passCostHuf` / `worthItHuf` — `monthlyEquivalentHuf` import a [[Rendszeres kiadások]]ból, nem másolat), teljes offline-sync bekötés (`AycmSettings` singleton ág a `UserProfile` tükreként — `_needs_refetch` re-pull, 2-arg tombstone, SQLite séma v26), `menu.page` AYCM-pont (`menu.aycm` flag), `aycm` index route `featureFlagGuard('menu.aycm')`-kel. | **Kész (AY1–AY4).** Menü → AYCM hub + három gyerek, négy slice-ban (AY1 elfogadóhely+árszabály → AY2 Check-In → AY3 `AycmSettings`+Statisztikák → AY4 hub+Menü-pont). A hub tisztán fogyasztó — `passCostHuf` / `worthItHuf` a gyerek utility-kből importál, képletet nem másol; `visitValueHuf = listPriceHuf`, a `coPaymentHuf` sehol nem adódik hozzá. `AycmSettings` 1:1-user singleton: `GET` üresen lazy `{ id: v5(userId), linkedRecurringExpenseId: null }` (200, nem 404), `PUT` upsert a determinisztikus id-ra `userId`-scope-pal. `linked_recurring_expense_id` **nincs DB-FK** a `recurring_expense` táblára (laza csatolás; a kliens ellenőrzi a beszámítást). Deep-link: `recurring-expense-edit.page` mostantól honorálja a `?returnTo` query paramot (mentés után oda navigál a friss `RecurringExpense.id`-t `createdExpenseId` paraméterben átadva); a hub `?createdExpenseId=` esetén auto-`linkExpense` + param-strip `replaceUrl`-lel. `menu.aycm` flag `true`. Lásd „Lezárt kör: AYCM". |
| ↳ [AYCM elfogadóhely hozzáadása](documentation/Subfeatures/AYCM%20elfogadóhely%20hozzáadása.md) | `56923be` (2026-08-19) | `hu.bumler.lm2.aycm` (`AycmPartner` + `AycmPriceRule` — Controller/Service/Mapper/Repository/2 SyncDataLoader, `aycm_partner` + `aycm_price_rule` táblák V26) | `pages/menu/aycm/` (`aycm-partner-list.page` kereső + élő-sávszám; `aycm-partner-edit.page` név/notes + inline ársáv-lista idő-picker + 7 nap-checkbox + egész Ft mezők + kliens overlap-check; `aycm-price-rule.ts` pure TS: `minutesOfDay` / `displayLabel` / `rulesOverlap` / `matchPriceRule`), `core/data/aycm-partner.repository.ts` (partner+szabály közös flow, `dependsOn` a még nem szinkronizált partnerre), teljes offline-sync bekötés (`AycmPartner` + `AycmPriceRule` outbox entityType, SQLite séma v24), `aycm/partners` route-fa. | **Kész (AY1).** Partner: user-owned CRUD `NameNormalizer` egyediséggel → `409 UNIQUE_VIOLATION` + `conflictingId`; `DELETE` = soft delete + cascade a partner élő szabályaira (a Check-In sorokra **nem** — snapshot marad). Szabály: `[startTime, endTime)` félig zárt, `24:00` engedélyezett end-en; nincs éjfél-átlépés; overlap-check kliensen (`rulesOverlap`, barátságos üzenet) **és** szerveren (`ValidationException`). `co_payment_huf` metaadat, sosem a `visitValueHuf`-ban. |
| ↳ [AYCM Check-In](documentation/Subfeatures/AYCM%20Check-In.md) | `d1950b4` (2026-08-19) | `hu.bumler.lm2.aycm` (`AycmCheckIn` — Controller/Service/Mapper/Repository/SyncDataLoader, `aycm_check_in` tábla V27) | `pages/menu/aycm/aycm-check-in.page` (egy űrlap, nincs lista: partner-picker + dátum (múlt/jövő szabad) + percpontos idő + **Most** gomb + notes; reaktív előnézet `matchPriceRule`-lal — zöld illeszkedő sávnál, sárga + 0 Ft résnél, mentés így is; `?date=YYYY-MM-DD` → adott nap edit/create), `core/data/aycm-check-in.repository.ts` (kész snapshot bemenet — a szerver nem re-matchel), teljes offline-sync bekötés (`AycmCheckIn` outbox entityType, `nameUniqueness: null` — `(userId, checkInDate)` scope nem fejezhető ki, a szerver 409-e véd, `HouseholdTask` precedens; SQLite séma v25), `aycm/check-in` route. | **Kész (AY2).** Lapos user-owned CRUD (RecurringExpense minta) + napi egyediség: `(user_id, check_in_date) WHERE deleted = false` partial unique → create-en és dátum-átíráson `409 UNIQUE_VIOLATION`. Snapshot oszlopok (`partner_name` / `rule_id` nullable / `rule_label` / `list_price_huf` / `co_payment_huf` / `visit_value_huf`), mind integer `>= 0`; `visitValueHuf = listPriceHuf`. Múlt **és jövő** dátum szabad, max 1 / naptári nap (kliens TZ). |
| ↳ [AYCM Statisztikák](documentation/Subfeatures/AYCM%20Statisztikák.md) | `d1950b4` (2026-08-19) | — (tisztán frontend, nincs backend érintettség) | `pages/menu/aycm/aycm-stats.page` (read-only: 3-preset `ion-segment` THIS_MONTH/PREV_MONTH/LAST_3_MONTHS + 3 kártya darab/Σ érték/megéri-e + helyszín-bontás + látogatáslista, sor tap → `check-in?date=`), `pages/menu/aycm/aycm-stats.ts` pure TS (`windowRange` / `filterCheckIns` élő+zárt intervallum jövővel / `summarize` / `groupByPartner` élő-név vagy törölt→lexikálisan első snapshot-név / `visitList` dátum-idő csökkenő) + spec | **Kész (AY3).** Nincs saját séma / OpenAPI / offline-wiring — a live `AycmCheckIn` snapshotokból számol. „Megéri-e" = `worthItHuf(Σ visitValueHuf, passCostHuf(..., monthCount))` vagy `~` ha `!passCostComputable` (Pénzügyek flag ki / nincs beszámított link). `passCostHuf` a `monthlyEquivalentHuf` SSOT-ot importálja, a `/1 /3 /12` képletet nem másolja. |
| [Lépésszám követés](documentation/Features/Lépésszám%20követés.md) | `d1950b4` (2026-08-19) | `hu.bumler.lm2.steps` (`DailyStepLog` — Entity/Mapper/Repository/Service/Controller/SyncDataLoader, `daily_step_log` tábla V29) | `pages/menu/steps/` (`step-tracker.page` mai érték + múltbeli lista + Health Connect státusz-sáv, `step-log-edit.page` per-nap), `core/data/daily-step-log.repository.ts`, `core/data/activity-kcal.ts` `stepKcalForDay`, `core/health/` (`activity-step-sync.service` + `step-sync-plan.ts` + `health-connect(.plugin)`), `android/.../health/HealthConnectStepsPlugin.kt`, teljes offline-sync bekötés (`DailyStepLog` outbox entityType, SQLite séma v27) | **Kész (L1) + Kész (L2, on-device funkcionális próba hátravan).** Lapos user-owned CRUD `SwimLog` mintára, `id` = determinisztikus v5 `DailyStepLog:<userId>:<date>` → két offline eszköz konvergál, POST törölt napra `WeeklyPlan`-mintára revive. Szerver sima last-write-wins; a felülírási szabály (manuális mindig nyer, sync csak ha nagyobb) a `DailyStepLogRepository`-ban (`saveManual` / `maxWinsUpsert`). Parciális unique index `(user_id, log_date)` védőháló + `GlobalExceptionHandler` map. Lépéskalória SSOT: `stepKcalForDay` = `max(0, stepCount − 3000) × testsúly × 0.00045` (`STEP_BASELINE` a fix 1.2 PAL-ban), bekötve a Kaja dashboard `workoutExtraKcal`-jába. **L2 (Health Connect):** `activity-step-sync.service` app-nyitáskor + `App` `resume`-kor a mai napot + 7 napos hiánypótló backfillt húzza (`datesNeedingBackfill` pure) `maxWinsUpsert`-tel; `HealthConnectStepsPlugin.kt` app-lokális Capacitor plugin (`androidx.health.connect:connect-client:1.1.0`, `getSdkStatus` / `permissionController` / `aggregate(StepsRecord.COUNT_TOTAL)`), `MainActivity`-ben regisztrálva; Kotlin a app-modulban (`kotlinVersion` a `variables.gradle`-ben). `./gradlew :app:assembleDebug` zöld, a plugin + a HC SDK benne a debug APK-ban; a valós Samsung Health adathalmazzal való funkcionális próba on-device hátravan. AndroidManifest: `health.READ_STEPS` + `SHOW_PERMISSIONS_RATIONALE` + `VIEW_PERMISSION_USAGE` activity-alias + `<queries>` + `uses-sdk tools:overrideLibrary` (HC minSdk 26 vs app 24). **Tudatosan kihagyva:** valódi 08:00 `WorkManager` háttér-worker (nincs `background-runner`; az app-open backfill a tartalék), `STEPS_LOW` értesítés (az [[Értesítések]] körrel), „Frissítés most" gomb, iOS Health. `menu.lepesszam` flag `true`. Lásd „Lezárt kör: Lépésszám követés". |
| [Mennyiség mező](documentation/Architektúra/Mennyiség%20mező.md) (architektúra SSOT) | `d1950b4` (2026-08-19) | `hu.bumler.lm2.common.QuantityConverter` (kanonikus egyenlőség) | `shared/quantity.ts`, `shared/quantity-input/`, `shared/help-input/` | **Kész** — parser + `QuantityInputComponent` (`quantity`/`duration` mód), kanonikus bázisegység-tábla mindkét oldalon a közös `shared/fixtures/quantity-conversion.json`-nal paritásban tesztelve. A helper-ikon + inline hiba-note kiemelve a közös `HelpInputComponent`-be (`shared/help-input/`), amin a `GradeInputComponent` is osztozik. |
| [Névegyediség](documentation/Architektúra/Névegyediség.md) (architektúra SSOT) | `56923be` (2026-08-19) | `hu.bumler.lm2.common.BarcodeNormalizer` (a `NameNormalizer` már megvolt) | `shared/barcode-normalization.ts` (a `name-normalization.ts` már megvolt) | **Kész** a Food mezőhalmaz-egyediséghez szükséges rész (barcode normalizálás); a hex szín normalizálás ([[Indoor boulder admin]]) még nem kellett, nincs implementálva. |

## Nincs elkezdve

Nincs backend package, nincs frontend page/repository ezekhez — teljes egészében
hátravan. (Az **Edzés**, a **Pénzügyek** és az **AYCM tracker** kör, valamint a
**Lépésszám követés** L1+L2 lezárult; lásd a megfelelő "Lezárt kör" szakaszokat
lent. Hátralévő feature az alábbi táblában.)

| Feature | Subfeature-ök | Fő függőségek |
|---|---|---|
| [Értesítések](documentation/Features/Értesítések.md) | — | Több más feature helyi notification-hookjait szolgálja ki (Háztartási feladatok, Élet tervek, Élelmiszer tárolás, Lépésszám `STEPS_LOW` stb.) |

## Lezárt kör: Tennivalók (2026-08-25)

A teljes Tennivalók feature elkészült a jóváhagyott terv szerinti sorrendben —
Élet tervek → Háztartási feladatok → Események → Naptár → hub + routing
véglegesítés, mindegyik saját commitban, minden lépés után backend
(Testcontainers) + frontend (Karma + `ng build` template-ellenőrzéssel) +
lint zöld. `hu.bumler.lm2.tasks` backend csomag (4 entitás, saját OpenAPI
végpontokkal, kivéve a Naptárt, aminek nincs saját adata), `pages/tasks/`
frontend fa, teljes offline-sync bekötés mind a 4 entitásra (outbox entity
type, local-rows, sync-engine ágak, SQLite séma v5→v7).

**Tudatosan kihagyva ebből a körből** (a terv "Nem cél" szakasza szerint):
- Értesítések (`HOUSEHOLD_TASK_DUE`, `EVENT_OCCURRENCE`) — külön menetben,
  amikor több más forrás-feature (Élelmiszer tárolás, Lépésszám, Étkezés) is
  készen áll, mert az Értesítések egy közös, több feature-t kiszolgáló réteg.
- Google Calendar export — a spec is MVP-n kívülinek jelöli, `feladatok.googleExport`
  flag megvan hozzá, alapból kikapcsolva.
- Napi rács swipe gesztus (Naptár hónapváltás) — csak chevron gombok készültek;
  a swipe natív gesztuskezelést igényelne (pl. Ionic Gesture API), ami külön
  belépő nélkül scope-kúszás lett volna.

## Lezárt kör: Kaja + Bevásárlás (2026-08-27)

A teljes Kaja feature (Élelmiszerek, Élelmiszer tárolás, Recept, Tápérték
kalkulátor, Étkezés 6a+6b, Kaja statisztika) és a vele domainben kapcsolódó,
de önálló Bevásárlás feature (Bevásárlólista írás, Bevásárlás teljesítve,
Bevásárlás előzmény) mindkettő teljesen elkészült — 9 subfeature egy
jóváhagyott plan-sorozatban, subfeature-önkénti bontásban, mindegyik saját
commitban, minden lépés után backend (Testcontainers, ahol van backend) +
frontend (Karma + `ng build`) + lint zöld.

## Lezárt kör: **Edzés** (2026-08-28–2026-08-31)

A Tennivalók-hoz és a Kaja/Bevásárlás körhöz hasonló méretű "gyors győzelem"
feature-ök elfogytak — az Edzés volt az egyetlen érdemi hátralévő nagy feature-ág.
A0–A6 + a Mászónapló-alkör M0–M8 mind kész és élő, subfeature-önkénti bontásban:

- **A0 — tab-váz** (`e924657`): `/tabs/workout` route + Edzésnapló \| Heti terv \|
  Mászás \| Úszás \| Bicikli felső szegmens (`WorkoutSegmentHeaderComponent` +
  `workout-sections.ts` registry). `tab.edzes` kikapcsolva.
- **A1 — Gyakorlat törzsadat** (`eeb7a44`): `hu.bumler.lm2.workout` /
  `exercise_catalog` (V17) + `pages/workout/exercises/` + `exercise.repository.ts`
  + seed (12 beépített, determinisztikus v5 id) + teljes offline-sync bekötés.
- **A2a — Edzésnapló (backend + data + utólagos szerkesztő)** (`1b4034d`):
  `WorkoutSession` + `WorkoutExerciseEntry` + `WorkoutSetEntry` (V18, háromszintű
  nested aggregate `saveTree`), OpenAPI `/api/workout-sessions`, `pages/workout/log/`
  dashboard + utólagos szerkesztő, `workout-metrics.ts` (MET kcal / Epley / volumen /
  PR / ghost) + spec, `shared/exercise-picker/`, teljes offline-sync bekötés (SQLite
  séma v16).
- **A2b — Edzésnapló élő Active Workout View**: `pages/workout/log/active-workout.page.ts`
  (futó stopper, per-szett rest timer haptic + rövid beep-pel a lejáratkor, PR-badge-ek
  a `detectPrs`-ből, HIIT kör-segédek), `core/data/workout-draft.service.ts` (egyetlen
  élő draft `@capacitor/preferences`-ben — **nem** outbox sor; app-kill után helyreáll;
  csak „Befejezés" enqueue-olja `WorkoutSessionRepository.save`-val), `workout-fields.ts`
  megosztott `visibleFields` / `formatStopwatch` / `nextRestValue` (a szerkesztővel
  közösen), dashboard „folytatás" banner + `active` route. Nincs backend / séma
  változás. Nincs pause / kör-per-kör külön nézet az első körben.
- **A3a — Heti terv (backend)** (`bfae798`): `WorkoutPlan` + `WorkoutPlanExercise` +
  `WorkoutPlanSet` (háromszintű nested aggregate `saveTree`) + `WeeklyPlan` +
  `WeeklyPlanSlot` (kétszintű), V19 migráció (+ a V18-ban halasztott
  `workout_session.plan_id → workout_plan.id` FK), OpenAPI `/api/workout-plans` +
  `/api/weekly-plans`, 5 SyncDataLoader, `sync_changes` view kiegészítés, backend +
  integrációs tesztek. Regenerált Angular kliens is a commitban.
- **A3b — Heti terv (frontend)** (ebben a commitban): `core/data/workout-plan.repository.ts`
  + `core/data/weekly-plan.repository.ts` (read-cache; `WeeklyPlan.id` determinisztikus
  v5), `pages/workout/plan/` (sablon lista + nested szerkesztő) + `pages/workout/weekly-plan/`
  (7 napos dashboard + adherence + „Másolás következő hétre" + `?planId=` gyorsindítás),
  `weekly-plan-adherence.ts` pure modul + spec, teljes offline-sync bekötés (SQLite séma
  v17, `WorkoutPlan` + `WeeklyPlan` outbox entityType, `SyncEngine` drain/pull/tombstone/
  `_needs_refetch` ágak). `edzes.hetiTerv` flag még kikapcsolva.
- **A4 — aktiválás + activityExtraKcal** (`a1ef360` előtt): `tab.edzes` + `edzes.hetiTerv`
  → `true` a `features.json`-ban (az Edzés tab + a Heti terv szegmens most látható);
  `core/data/activity-kcal.ts` (`workoutKcalForDay` — Σ `sessionKcal()` az aznapi élő
  `WorkoutSession`-ökre a Profile aktuális testsúlyával) + spec, bekötve a
  `pages/food/meal/meal-dashboard.page.ts`-be: a `computeTdee` 3. argumentuma most a
  tényleges edzéskalória (eddig fix 0), így a kalória-bar kerete és a másodlagos
  „+N kcal aktivitás" sor él. Lépéskalória továbbra is 0 (a [[Lépésszám követés]]
  feature nincs kész). Nincs backend / séma változás.
- **A5 — Úszás napló** (ebben a commitban): `SwimLog` (V20, lapos user-owned CRUD a
  `LifePlan` mintájára), OpenAPI `/api/swim-logs`, `hu.bumler.lm2.workout` 6 fájl +
  Service/Integration teszt, `pages/workout/swimming/` (lista + create/edit űrlap),
  `swim-metrics.ts` pure modul (`SWIM_MET` / `swimKcal` / `swimDistanceMeters`) + spec,
  `core/data/swim-log.repository.ts`, teljes offline-sync bekötés (SQLite séma v18,
  `SwimLog` outbox entityType, `SyncEngine` drain/pull/tombstone/`_needs_refetch`).
  `edzes.uszas` → `true`; `activity-kcal.ts` `swimKcalForDay` a `workoutKcalForDay`
  mellé adva a Kaja dashboard aktivitás-kalóriájában. Regenerált Angular kliens is
  a commitban.

- **A6 — Biciklizés napló** (ebben a commitban): `BikeRideLog` (V21, lapos user-owned
  CRUD az Úszás napló mintájára, de medence-párosítás nélkül — `distanceKm` +
  `elevationGainMeters` opcionális, független `≥ 0` mezők), OpenAPI `/api/bike-ride-logs`,
  `hu.bumler.lm2.workout` 6 fájl + Service/Integration teszt, `pages/workout/cycling/`
  (lista + create/edit űrlap átlagsebesség + soft MET-javaslattal), `bike-metrics.ts`
  pure modul (`BIKE_MET` / `bikeKcal` / `avgSpeedKmH` / `suggestedIntensity`) + spec,
  `core/data/bike-ride-log.repository.ts`, teljes offline-sync bekötés (SQLite séma v19,
  `BikeRideLog` outbox entityType, `SyncEngine` drain/pull/tombstone/`_needs_refetch`).
  `edzes.bicikli` → `true`; `activity-kcal.ts` `bikeKcalForDay` a `workoutKcalForDay` +
  `swimKcalForDay` mellé adva. Regenerált Angular kliens is a commitban.

### Mászónapló-alkör (2026-08-29–2026-08-31): kész (M0–M8)

17 al-spec, Indoor/Outdoor × Boulder/Kötél, 4 dashboard-belépő, közös
`ClimbingSession` + `AscentAttempt` (+ `PitchLog`) nested aggregate, indoor
(`Gym`/`GymColorBand`/`IndoorRoute`) és outdoor (`Crag`/`Sector`/`Route`/
`BoulderProblem`) törzsadat-fa, nehézségi konverziós mátrix, aktív/passzív MET
kalóriamodell. Külön commit-sorozatban (M0–M8), az Edzés A0–A6 ritmusát követve.

- **M0 — nehézségi skála + konverziós mátrix + mászás-kalória (pure TS alap)**
  (ebben a commitban): `pages/workout/climbing/climbing-grade-matrix.ts` (a
  [[Nehézségi szint skálája (konverziós mátrix)]] SSOT tábla — a fix anchor sorok
  francia/UIAA/YDS/V-skála cellái szó szerint, a Font-oszlop önellentmondó alsó
  cellái szigorúan növekvő, deduplikált létrára rendezve; `gradeToIndex` /
  `colorBandMidIndex`), `grade-scale.ts` (a [[Nehézségi szint skálája]] parser:
  pre-parsing kis/nagybetű + trim, EMPTY/VALID/AMBIGUOUS/UNKNOWN állapotgép, skála-
  regex-ek, csupasz `4`/`5` diszciplína-default vs `6`+ INVALID), `climbing-metrics.ts`
  (a [[Mászónapló]] kanonikus kcal: kísérletenkénti aktív zóna + MET 2.0 rest zóna,
  `pumpMultiplier` lineáris interpoláció, TRAD +6 kg csak az aktív ágon, másodmászó
  dupla 0.8, `durationFallbackMinutes`, `climbingVolume`) — mindhárom + spec, 39 új
  teszt. Nincs wiring: se route, se backend, se flag — a modulok az M1/M4-ben
  kötődnek be. Ha később kell szerveroldali index/kcal-paritás, a mátrix `shared/
  fixtures/`-be emelendő (ma csak kliens-fogyasztó, mint `swim-metrics` / `bike-metrics`).
- **M1 — hub váz + `climbing` szegmens route** (ebben a commitban):
  `pages/workout/climbing/climbing-contexts.ts` (a 4 dashboard-belépő SSOT-ja —
  `INDOOR`/`OUTDOOR` × `BOULDER`/`ROPE` kulcs → relatív route + label key + ikon; a
  `WORKOUT_SECTIONS` climbing-megfelelője, az M4–M8 innen oldja fel a kontextust),
  `climbing-hub.page.ts`/`.html` (a „Mászás" szegmens landing képernyője: 4 csempe
  `ion-list`-ben + fejléc stat/admin gomb; `WorkoutSegmentHeaderComponent` a headerben,
  `current="climbing"`), `app.routes.ts` `climbing` blokk (`featureFlagGuard('edzes.maszonaplo')`,
  csak a `''` hub route — a per-kontextus / stats / admin route-ok a későbbi slice-okban),
  `WORKOUT.CLIMBING` i18n namespace (hu + en), 3 új ikon a `core/config/icons.ts`-ben
  (`business-outline`, `earth-outline`, `stats-chart-outline`), `climbing-contexts.spec.ts`
  (3 invariáns-teszt). `edzes.maszonaplo` marad `false` — a hub a flag bekapcsolásáig
  elérhetetlen; a csempék/fejléc-gombok routerLinkjei a még nem létező slice-route-okra
  mutatnak (a bevett inkrementális minta). Nincs backend, nincs offline-wiring.
- **M2a-i — indoor törzsadat backend** (ebben a commitban): új `hu.bumler.lm2.climbing`
  feature-csomag, három flat, user-owned CRUD resource a bike-ride-log mintára —
  `Gym` (`/api/climbing/gyms`; `name` + `name_normalized` per-user élő egyediség
  `UNIQUE_VIOLATION` + `conflictingId`-vel, `disciplines text[]` ⊆ {BOULDER,ROPE},
  rope-only `default_wall_height_meters` + `available_safety_styles text[]` ⊆ {TOPROPE,LEAD}),
  `GymColorBand` (`/api/climbing/gym-color-bands`; `hex_color` kanonikus alakon egyedi a
  terem élő sávjai közt — új `common/HexColorNormalizer` + `shared/fixtures/
  hex-color-normalization.json` paritásteszt; `variant`, grade alsó/felső + kliens-adta
  `absolute_difficulty_index_lower/upper`), `IndoorRoute` (`/api/climbing/indoor-routes`;
  opcionális termi út-katalógus, névegyediség nélkül). Flyway `V22__climbing_indoor_master.sql`
  (3 tábla + trigger + parciális unique indexek + a `sync_changes` view teljes újraírása a
  `Gym`/`GymColorBand`/`IndoorRoute` sorokkal), hand-written OpenAPI (6 path + 6 schema),
  3 `*SyncDataLoader`. Tesztek: `HexColorNormalizerTest` (fixture-paritás), 3 service unit
  teszt, `ClimbingIndoorMasterIntegrationTest` (idempotens POST, 409 UNIQUE_VIOLATION
  field+conflictingId gym-névre és sáv-hexre, 409 ENTITY_DELETED, cross-user 404, delta
  pull). Se frontend, se offline-wiring, `edzes.maszonaplo` marad `false`.
- **M2a-o — outdoor törzsadat backend** (ebben a commitban): a `hu.bumler.lm2.climbing`
  csomag négy további flat, user-owned CRUD resource-szal — a közös helyszínfa
  `Crag` → `Sector` → (`Route` | `BoulderProblem`), névegyediség nélkül (ugyanaz a
  crag/route név több helyen is előfordulhat). `Crag` (`/api/climbing/crags`; opcionális
  GPS `latitude`/`longitude` + CHECK-tartomány, free-text `default_rock_type`),
  `Sector` (`/api/climbing/sectors`; `crag_id` FK, free-text `default_aspect`),
  `Route` (`/api/climbing/routes`; `sector_id` FK, kötelező `guidebook_grade` nyers
  string — a szerver nem számol grade-indexet —, opcionális `length_in_meters`/
  `total_pitches`/`rock_type`/`aspect` napló-előtöltéshez), `BoulderProblem`
  (`/api/climbing/boulder-problems`; `sector_id` FK, `guidebook_grade`; a master sor
  opcionális, a napló ad-hoc is létrehozhat). Flyway `V23__climbing_outdoor_master.sql`
  (4 tábla + trigger + delta-pull/FK indexek + a `sync_changes` view teljes újraírása a
  `Crag`/`Sector`/`Route`/`BoulderProblem` sorokkal), hand-written OpenAPI (8 path +
  8 schema), 4 `*SyncDataLoader`. Tesztek: 4 service unit teszt,
  `ClimbingOutdoorMasterIntegrationTest` (idempotens POST mind a 4-re, 409 ENTITY_DELETED,
  own-deleted 200 GET, cross-user 404, delta pull mind a 4 entityType-ra). Se frontend,
  se offline-wiring, `edzes.maszonaplo` marad `false`.
- **M2b — session nested aggregate backend** (ebben a commitban): a `hu.bumler.lm2.climbing`
  csomag háromszintű nested aggregate-tel — `ClimbingSession` → `AscentAttempt` → `PitchLog`,
  a `WorkoutSessionService` `saveTree` mintájára (egy `@Transactional` metódus, a válasz
  minden sort visszaad, élőt és tombstone-t is; a bejövő `attempts` / `pitches` a teljes
  kívánt élő fa, a kimaradó gyerekeket a szerver állítja `deleted = true`-ra). Egyetlen lapos
  `climbing_session` tábla, nem polimorf hierarchia: `location_type` (`INDOOR`|`OUTDOOR`) +
  `discipline` (`BOULDER`|`ROPE`) diszkriminátor oszlopok, a kontextus-specifikus mezők
  (`gym_id` vs `crag_id`/`sector_id` snapshot-tal, `weather_conditions` csak outdoor,
  `rock_type`/`aspect`, `pump_rating`/`headspace_rating` 1–5) mind nullable, a kombináció
  helyességét a kliens dönti el (szerver oldalon laza, mint a `workout_set_entry`). `AscentAttempt`:
  `is_success`, nyers `user_raw_input` + kliens-számolt `absolute_difficulty_index` (a szerver
  nem számol), `ascent_style`/`safety_style` enum (utóbbi csak kötél), `failure_point`,
  `attempt_count` (≥1, csak statisztika — nem a duration fallback), `color_band_id`/
  `indoor_route_id`/`route_id`/`boulder_problem_id` opcionális soft-link FK + `*_name`/`color_*`/
  `grade_range` snapshot, `length_in_meters` (kötél), `order_index`. `PitchLog` (csak outdoor
  multi-pitch): `pitch_number`, `is_lead` (`false` = másodmászó), `raw_grade` +
  `absolute_difficulty_index`, `length_in_meters`. A session **nem tárol** `calculatedCalories` /
  volumen mezőt (pure kliens számítás — [[Tápérték kalkulátor]]). `GET/POST /api/climbing/sessions`,
  `GET/PUT/DELETE /api/climbing/sessions/{id}` (idempotens upsert, 409 `ENTITY_DELETED` PUT-ra
  törlés után, cascade soft delete, own-deleted 200 GET). Flyway `V24__climbing_session.sql`
  (3 tábla + trigger + delta-pull indexek + a `sync_changes` view teljes újraírása a
  `ClimbingSession`/`AscentAttempt`/`PitchLog` sorokkal — a két gyerektábla `user_id` nélkül,
  a session-ön keresztül joinolva), hand-written OpenAPI (2 path + 4 schema), 3 `*SyncDataLoader`.
  Tesztek: `ClimbingSessionServiceTest` (10 Mockito unit), `ClimbingSessionIntegrationTest`
  (idempotens POST, diszkriminátor + outdoor mezők verbatim round-trip, PUT fa-csere attempt +
  pitch szinten, 409 `ENTITY_DELETED`, cascade delete + own-deleted 200 GET, cross-user 404,
  delta pull mind a 3 entityType-ra). Se frontend, se offline-wiring, `edzes.maszonaplo` marad
  `false`.

- **M3a — indoor törzsadat admin frontend** (ebben a commitban): a `Gym` + `GymColorBand` +
  `IndoorRoute` backend (M2a-i) teljes frontend + offline-sync bekötése. Új `shared/
  hex-color-normalization.ts` (`normalizeHexColor`) a `common/HexColorNormalizer` párja, a közös
  `shared/fixtures/hex-color-normalization.json` fixture-rel tesztelve (`hex-color-normalization.spec.ts`).
  3 flat repository (`core/data/gym.repository.ts` per-user névegyediség pre-check +
  `GymNameConflictError`; `gym-color-band.repository.ts` termre-scope-olt kanonikus-hex egyediség +
  `GymColorBandHexConflictError` + `forGym()`; `indoor-route.repository.ts` egyediség nélkül +
  `forGym()`), mind a `DataChangeNotifier` post-pull invalidálással. Teljes offline-wiring: SQLite
  séma `v20` (`gym` / `gym_color_band` / `indoor_route` táblák; `disciplines` /
  `available_safety_styles` JSON string a TEXT oszlopban, mint `packing_session.source_template_ids`),
  `local-rows.ts` Row/rowToDto/localWrite/serverApply/tombstone mind a 3-ra, `StorageBackend` +
  `SqliteStorageBackend` (a `GymColorBand`/`IndoorRoute` `dependsOn` a még nem szinkronizált `gym`-re —
  `findLocalOnlyIds('gym', …)`) + `HttpStorageBackend`, `OutboxEntityType` (`Gym`/`GymColorBand`/
  `IndoorRoute`), `OutboxEntityRegistry` (`Gym` névegyediség-mezővel, a másik kettő `null` a scope
  miatt, mint `HouseholdTask`), `SyncEngine` `_needs_refetch` drain + `buildServerApplyTasks` +
  `applyTombstone` (nincs cascade — a sávok/utak saját tombstone-t visznek) + pull `buildApplyTasks`
  ágak. Képernyők `pages/workout/climbing/admin/` alatt: `climbing-admin.page` (Beltéri / Kültéri
  landing; a Kültéri belépő M3b), `gym-list.page`, `gym-edit.page` (ágazat-checkboxok, csak-kötél
  falmagasság + safety-style szekció, beágyazott szín-sáv- és beltéri-út-allisták), `gym-color-band-edit.page`
  (hex pattern + kanonikus-alak egyediség, alsó/felső fokozat a közös `parseGrade`-del → mátrix-index),
  `indoor-route-edit.page` (ágazatonkénti `parseGrade` → index). `app.routes.ts` `climbing/admin` fa,
  `WORKOUT.CLIMBING.{ADMIN_*,DISCIPLINE,SAFETY,VARIANT,GYM,BAND,INDOOR_ROUTE,GRADE_UNPARSED}` i18n (hu + en).
  Regenerált Angular kliens is a commitban (a teljes climbing tag-halmaz — outdoor + session modellek/
  service-ek is bekerülnek, M3b/M4-ig használatlanul). `edzes.maszonaplo` marad `false` — az admin fa a
  flag bekapcsolásáig elérhetetlen. Kliens-tesztek (review-10commits.md E-02, 2026-08-31 pótolva):
  `gym` / `gym-color-band` / `indoor-route` `*.repository.spec.ts` (név- ill. terem-scope-olt hex-ütközés,
  `forGym`, drain-ágak, `DataChangeNotifier` invalidálás) + `gym-edit` / `gym-color-band-edit` /
  `indoor-route-edit` `*.page.spec.ts` (form → `save()` továbbítás, ütközés-jelzés, grade-parse gate).
- **M3b — outdoor törzsadat admin frontend** (ebben a commitban): a `Crag` + `Sector` + `Route` +
  `BoulderProblem` backend (M2a-o) teljes frontend + offline-sync bekötése, az M3a mintáját tükrözve.
  4 flat repository (`core/data/{crag,sector,route,boulder-problem}.repository.ts`) — egyik sem
  névegyediség-ellenőrzött (a helyszínfában ugyanaz a név többször is előfordulhat), `DataChangeNotifier`
  post-pull invalidálással; `SectorRepository.forCrag()` + `RouteRepository.forSector()` +
  `BoulderProblemRepository.forSector()` szűrő-helperekkel. Teljes offline-wiring: SQLite séma `v21`
  (`crag` / `sector` / `route` / `boulder_problem` táblák), `local-rows.ts` Row/rowToDto/localWrite/
  serverApply/tombstone mind a 4-re, `StorageBackend` + `SqliteStorageBackend` (a `Sector` `dependsOn` a
  még nem szinkronizált `crag`-re, a `Route`/`BoulderProblem` a `sector`-ra — `findLocalOnlyIds`
  kiterjesztve `'crag' | 'sector'`-ral) + `HttpStorageBackend`, `OutboxEntityType`
  (`Crag`/`Sector`/`Route`/`BoulderProblem`), `OutboxEntityRegistry` (mind `nameUniqueness: null`),
  `SyncEngine` `_needs_refetch` drain + `buildServerApplyTasks` + `applyTombstone` (nincs cascade) +
  pull `buildApplyTasks` ágak mind a 4-re. Képernyők `pages/workout/climbing/admin/` alatt:
  `crag-list.page`, `crag-edit.page` (opcionális GPS lat/lng + `defaultRockType` + beágyazott
  szektor-allista), `sector-edit.page` (`defaultAspect` + beágyazott út- és boulder-allista),
  `route-edit.page` (`guidebookGrade` szabad szöveg — a szerver szó szerint tárolja, nincs parse —
  + `lengthInMeters`/`totalPitches`/`rockType`/`aspect` napló-előtöltés), `boulder-problem-edit.page`
  (`guidebookGrade`). `climbing-admin.page` Kültéri belépője most élő `routerLink`. `app.routes.ts`
  `climbing/admin/crags` mélyen ágyazott fa, `WORKOUT.CLIMBING.{CRAG,SECTOR,ROUTE,PROBLEM}` i18n (hu + en).
  `edzes.maszonaplo` marad `false`. Kliens-tesztek (review-10commits.md E-02, 2026-08-31 pótolva):
  `crag` / `sector` / `route` / `boulder-problem` `*.repository.spec.ts` (nincs névegyediség, `forCrag`/
  `forSector`, drain-ágak, `DataChangeNotifier` invalidálás) + a 4 `*-edit.page.spec.ts` (form → `save()`
  továbbítás, `guidebookGrade` verbatim, GPS-tartomány gate).

- **M4 — Indoor boulder napló + `ClimbingSession` offline-sync bekötés** (ebben a commitban): a
  `ClimbingSession` → `AscentAttempt` → `PitchLog` háromszintű nested aggregate (M2b backend) teljes
  frontend + offline-sync bekötése, a `WorkoutSession` → `WorkoutExerciseEntry` → `WorkoutSetEntry`
  mintáját tükrözve, plusz a beltéri boulder kontextus-napló (a *reference* flow). SQLite séma `v22`
  (`climbing_session` / `ascent_attempt` / `pitch_log`; `climbing_partners` JSON string TEXT-ben),
  `local-rows.ts` Row/rowToDto/localWrite/serverApply/tombstone (+ gyerekekhez localRemove) mind a
  háromra, `StorageBackend` + `SqliteStorageBackend` (`saveClimbingSession` 3-szintű id-diff
  save-tree, `dependsOn` a még nem szinkronizált `gym`/`crag`/`sector`/`gym_color_band`/`indoor_route`/
  `route`/`boulder_problem` soft-link FK-kra — `findLocalOnlyIds` union kiterjesztve) +
  `HttpStorageBackend`, `OutboxEntityType` (`ClimbingSession`), `OutboxEntityRegistry`
  (`nameUniqueness: null`, nested aggregate → Fix kizárva), `SyncEngine` `_needs_refetch` drain +
  `climbingSessionApplyTasks` (session + attempts + pitches) + `applyTombstone` (cascade a gyerekekre)
  + pull `buildApplyTasks` ágak `ClimbingSession` (cascade) / `AscentAttempt` / `PitchLog`.
  `core/data/climbing-session.repository.ts` (signal-facade, `forContext()`, post-pull invalidálás
  `ClimbingSession`/`AscentAttempt`/`PitchLog` change-type-okra). Képernyők
  `pages/workout/climbing/naplo/` alatt: `climbing-session-list.page` (kontextus a route `data`-ból,
  kártyák siker/kísérlet számmal + élő kcal/volumen), `indoor-boulder-session-edit.page` (dátum +
  boulder-terem picker legutóbbi-terem előtöltéssel + duration/pump/headspace/társak/jegyzet,
  kísérlet-lista szín-sáv chip gyorsválasztással **és** szabad Font/V grade parserrel, siker toggle,
  ascent style, `attemptCount`, élő kcal/volumen lábléc). `app.routes.ts` `climbing/indoor-boulder`
  fa (list / new / :id). `climbing-hub` a nem-bekötött 3 csempét letiltva mutatja
  (`ClimbingContextDef.wired`). `WORKOUT.CLIMBING.{SESSION,ASCENT_STYLE,SOON}` i18n (hu + en).
  `edzes.maszonaplo` marad `false`. Kliens-tesztek: `climbing-session.repository.spec.ts` +
  `indoor-boulder-session-edit.page.spec.ts` + `climbing-contexts.spec.ts` `wired` állítás.

- **M5 — Indoor köteles napló** (ebben a commitban): a 2. kontextus-napló (`INDOOR` + `ROPE`), a
  megosztott `climbing-session-list.page` + saját `indoor-rope-session-edit.page`. Nincs
  offline-wiring / séma / backend változás — a `v22` `ascent_attempt` már hordja a
  `safety_style` / `failure_point` / `indoor_route_id` / `route_name` / `length_in_meters`
  oszlopokat, a `StorageBackend` / `SyncEngine` ágak generikusak. Eltérés a boulder reference-től:
  nincs szín-sáv; kézi francia/YDS grade parser **vagy** opcionális `IndoorRoute` választás /
  ad-hoc `routeName`; `TOPROPE | LEAD` biztosítás-chip (TRAD rejtve, default `LEAD`, a terem
  `availableSafetyStyles` beállítására szűkítve); opcionális `lengthInMeters` a terem
  `defaultWallHeightMeters` defaulttal; sikertelen kísérletnél opcionális `failurePoint`; nincs
  PitchLog; duration fallback kísérlet × 15 perc (a `climbing-metrics` intézi). `climbing-contexts`
  `indoor-rope` → `wired: true` + `app.routes.ts` `climbing/indoor-rope` fa (list / new / :id).
  `WORKOUT.CLIMBING.SESSION` i18n bővítés (hu + en): a boulder-specifikus `EMPTY` / `NEW_TITLE`
  generikussá téve, új `NO_ROPE_GYM` / `FIELD_ROUTE` / `ROUTE_PLACEHOLDER` / `FIELD_ROUTE_NAME` /
  `FIELD_GRADE_ROPE` / `GRADE_PLACEHOLDER_ROPE` / `FIELD_LENGTH` / `FIELD_SAFETY` /
  `FIELD_FAILURE_POINT`. `edzes.maszonaplo` marad `false`. Kliens-tesztek:
  `indoor-rope-session-edit.page.spec.ts` (8) + frissített `climbing-contexts.spec.ts` `wired` állítás.

- **M6 — Outdoor boulder napló**: a 3. kontextus-napló (`OUTDOOR` + `BOULDER`), a
  megosztott `climbing-session-list.page` + saját `outdoor-boulder-session-edit.page`. Nincs
  offline-wiring / séma / backend változás — a `v22` `climbing_session` már hordja a
  `crag_id` / `crag_name` / `sector_id` / `sector_name` / `rock_type` / `aspect` /
  `weather_conditions` oszlopokat, a `ascent_attempt` a `boulder_problem_id` / `route_name`
  oszlopokat; a `StorageBackend` / `SyncEngine` ágak generikusak (a `dependsOn` a még nem
  szinkronizált `crag` / `sector` / `boulder_problem` soft-link FK-kra már M4 óta be van kötve).
  Eltérés a boulder reference-től: `Crag` + `Sector` helyszín-picker snapshot nevekkel (gym helyett);
  opcionális master `BoulderProblem` választás **vagy** ad-hoc név opcionális „mentés a katalógusba"
  kapcsolóval (a `BoulderProblemRepository.save` a kiválasztott szektor alá, csak ha van szektor);
  session-szintű `rockType` (crag default, felülírható — nincs attempt-szintű mező); a szektorból
  öröklődő `aspect`; `weatherConditions` chip (`COLD_DRY` / `HOT_HUMID` / `WINDY` / `WET`); nincs
  szín-sáv, nincs PitchLog; grade parser Font/V; duration fallback kísérlet × 5 perc. A megosztott
  `climbing-session-list.page` kártya-alcíme `gymName || cragName || NO_VENUE`-ra bővítve (mind a 4
  kontextusra jó). `climbing-contexts` `outdoor-boulder` → `wired: true` + `app.routes.ts`
  `climbing/outdoor-boulder` fa (list / new / :id). `WORKOUT.CLIMBING` i18n bővítés (hu + en): új
  `WEATHER` blokk + `SESSION` alatt `NO_VENUE` / `NO_CRAG` / `FIELD_CRAG` / `CRAG_PLACEHOLDER` /
  `CRAG_REQUIRED` / `FIELD_SECTOR` / `FIELD_ROCK_TYPE` / `FIELD_ASPECT` / `FIELD_WEATHER` /
  `FIELD_PROBLEM` / `PROBLEM_PLACEHOLDER` / `FIELD_PROBLEM_NAME` / `SAVE_TO_CATALOG`.
  `edzes.maszonaplo` marad `false`. Kliens-tesztek: `outdoor-boulder-session-edit.page.spec.ts` (9) +
  frissített `climbing-contexts.spec.ts` `wired` állítás.

- **M7 — Outdoor köteles napló**: a 4. és utolsó kontextus-napló (`OUTDOOR` +
  `ROPE`), a megosztott `climbing-session-list.page` + saját `outdoor-rope-session-edit.page`. Nincs
  offline-wiring / séma / backend változás — a `v22` `climbing_session` / `ascent_attempt` /
  `pitch_log` már mindent hordoz, a `StorageBackend` / `SyncEngine` ágak (a `dependsOn` a még nem
  szinkronizált `crag` / `sector` / `route` soft-link FK-kra) generikusak. A form az outdoor boulder
  napló helyszín-részét (`Crag` + `Sector` picker snapshot nevekkel, session-szintű
  `rockType` / `aspect`, `weatherConditions` chip, opcionális master `Route` **vagy** ad-hoc név
  „mentés a katalógusba" kapcsolóval — `RouteRepository.save` a kiválasztott szektor alá) kombinálja
  az indoor köteles napló köteles részével (francia/YDS grade parser, `TOPROPE` \| `LEAD` \| `TRAD`
  safety chip, `lengthInMeters`, `failurePoint` bukott kísérletnél). Új: opcionális kísérletenkénti
  `PitchLog` szerkesztő (`pitchNumber` auto, `isLead` toggle — `isLead=false` → aktív MET ×0.8 a
  kliens kcal-ban, `climbing-metrics` már kezeli; `rawGrade` → per-pitch index parse; `lengthInMeters`;
  ha üres a lista, elég a session + teljes úthossz). Öröklési sorrend `rockType` / `aspect`-re: kiválasztott
  `Route` saját értéke → különben `Sector` / `Crag` default → session szinten mindig felülírható. TRAD
  a `climbing-metrics` aktív ágában +6 kg. `climbing-contexts` `outdoor-rope` → `wired: true` (mind a
  4 csempe él) + `app.routes.ts` `climbing/outdoor-rope` fa (list / new / :id). `WORKOUT.CLIMBING`
  i18n bővítés (hu + en): `SAFETY.TRAD` + `SESSION` alatt `FIELD_OUTDOOR_ROUTE` /
  `OUTDOOR_ROUTE_PLACEHOLDER` / `PITCHES` / `ADD_PITCH` / `PITCH_N` / `PITCH_LEAD` / `PITCH_GRADE` /
  `PITCH_LENGTH` / `REMOVE_PITCH`. `edzes.maszonaplo` marad `false`. Kliens-tesztek:
  `outdoor-rope-session-edit.page.spec.ts` (13) + frissített `climbing-contexts.spec.ts` `wired` állítás.

- **M8 — Mászó statisztikák + a Mászónapló-alkör lezárása** (ebben a commitban): a
  [[Mászónapló]] "Statisztikák (2.0 scope)" képernyő + a `edzes.maszonaplo` flag
  bekapcsolása + a mászás-kalória bekötése a Kaja dashboardba. `pages/workout/climbing/
  climbing-stats.ts` (pure TS, se DOM, se Angular — mint `weekly-plan-adherence.ts` /
  `catalog-ratios.ts`): `computeClimbingStats(sessions, periodDays, today)` kontextusonként
  (mind a 4 dashboard-belépőre, `CLIMBING_CONTEXTS` sorrendben) — **összesített** max
  fokozat (a legnehezebb *sikeres* kísérlet `absoluteDifficultyIndex`-e, a `userRawInput`
  címkéjével), **összesített** volumen (`climbingVolume()` a session-ök felett, ugyanaz a
  per-kísérlet `mászott méter × I` / `4 m × I` modell, mint a napló élő előnézete),
  **összesített** sikerarány (minden naplózott kísérlet Onsight / Flash / Redpoint /
  Sikertelen bontásban — a stílus nélküli siker redpointnak számít) — és az **egyetlen
  időszak-szűrt** mutató: a 30 / 90 / 365 napos grade-piramis (sikeres bemászások mátrix-
  index szerinti bucketekbe, legnehezebb felül). `stats/climbing-stats.page.ts`/`.html`/
  `.scss` (period `ion-segment` + kontextusonkénti `ion-list` szekció, `ion-progress-bar`
  piramis-sávok; a hub fejléc chart gombja már ide mutatott), `app.routes.ts` `climbing/
  stats` route (nincs külön flag — a `climbing` fa `edzes.maszonaplo` guardja alatt).
  `core/data/activity-kcal.ts` új `climbingKcalForDay` (a `bikeKcalForDay` mintájára —
  `climbingKcal()` a session `discipline`-jével, aktív/passzív MET, nem `duration × MET`),
  bekötve a `meal-dashboard.page.ts` `workoutExtraKcal` computedjébe a `workoutKcalForDay` +
  `swimKcalForDay` + `bikeKcalForDay` mellé (+ a repo `load()` és a spec provider-stub).
  `WORKOUT.CLIMBING.STATS_PAGE` i18n blokk (hu + en, 11 kulcs). **`edzes.maszonaplo` →
  `true`** a `features.json`-ban — ezzel a teljes Mászás szegmens (felső szegmens-gomb +
  hub + 4 kontextus-napló + admin-fa + statisztikák) élővé válik; a `tab.edzes` függőség
  már teljesült, a `validateFeatureFlags` nem borul. Nincs backend / Flyway / SQLite séma /
  offline-sync változás. Kliens-tesztek: `climbing-stats.spec.ts` (8, pure modul) +
  `climbing-stats.page.spec.ts` (3, view-model) + `activity-kcal.spec.ts` `climbingKcalForDay`
  blokk (2).

- **M8 után — review-fixek (7 finding, ebben a commitban):** a lezárt alkör
  kód-review-jának észrevételei, korrektségi hiba / tárolt-adat- vagy sync-törés
  nélkül. **(1)** A közös `climbing-session-list.page` kcal/volumen most a
  `pitches`-t is átadja — multi-pitch outdoor-köteles session a lista-kártyán is a
  pitch-hosszak összegével számol, egyezésben a szerkesztő élő előnézetével, a
  statokkal és a Kaja dashboard `climbingKcalForDay` összegével. **(6)** Új
  `pages/workout/climbing/climbing-attempt-input.ts` (`climbingAttemptInput`):
  egyetlen `AscentAttempt → ClimbingAttemptInput` adapter, amit a lista, a
  `climbing-stats.ts` és az `activity-kcal.ts` is használ (a korábbi három
  külön másolat helyett; a `climbing-metrics.ts` API-model-mentes marad). **(3)**
  A „nem értelmezhető fokozat" ad-hoc figyelmeztetés (`WORKOUT.CLIMBING.GRADE_UNPARSED`,
  `gradeUnparsed()` / `pitchGradeUnparsed()`) helyét átvette a teljes shared
  grade-beviteli komponens — lásd a **Szín-sáv / fokozat input kör** szakaszt lent
  ([[Nehézségi szint skálája]] `GradeInputComponent`: badge + kétértelműség-chipek +
  súgó modal + inline hiba, a közös `HelpInputComponent` fölött). **(4)** „Legalább
  idő vagy kísérlet" kereszt-mező validáció mind a 4 formban (`minFieldsMet`
  computed, gate-eli a `save()`-et és a Mentés gombot, `WORKOUT.CLIMBING.SESSION.MIN_FIELDS`
  jelzés) — a spec (`Indoor boulder napló.md`) „minimális kötelező: dátum + terem +
  legalább idő vagy kísérletek" elvárása. **(5)** Halott „SOON" ág törölve:
  `ClimbingContextDef.wired` mező, a `climbing-hub` `@else` disabled-csempéje +
  `IonNote` import, a `WORKOUT.CLIMBING.SOON` kulcs (hu + en), a
  `climbing-contexts.spec.ts` `wired` állítása (a tab-registry + feature flag
  routing szinten kezeli a „nincs kontextus" esetet, a `wired` M4–M7 alatti
  állványzat volt). **(2 + 7)** `Mászónapló.md` pontosítva: az `attemptCount`
  tájékoztató mező — sem a Volumen-, sem a sikerarány-képlet **nem szoroz vele**
  (mindkettő attempt-soronként számol), csak a statisztikai nézetek jeleníthetik
  meg; a „Statisztikák" sor szövege a tényleges Onsight / Flash / Redpoint /
  Sikertelen bontásra igazítva (a `Edzés.md` spec-commit hash nem mozdul, csak a
  `Mászónapló.md` al-spec). Új teszt: `climbing-attempt-input.spec.ts` (4). Nincs
  backend / Flyway / SQLite séma / offline-sync változás; `lint` tiszta, `test:ci`
  1110/1110.

Mászónapló-alkör: **kész (M0–M8 + review-fixek)**. Ezzel az [[Edzés]] feature is
lezárult (Edzésnapló + Heti terv + Úszás + Bicikli + Mászónapló mind kész és élő).

### Szín-sáv / fokozat input kör (2026-08-31): kész

A [[Nehézségi szint skálája]] „egységes nehézség-beviteli komponens" célállapota
megvalósítva, a korábbi ad-hoc `GRADE_UNPARSED` note helyett:

- **Új közös `HelpInputComponent`** (`shared/help-input/`, `app-help-input`) — buta
  prezentációs héj: `ion-input` + záró badge + súgó-ikon gomb (`AlertController`,
  i18n kulcs) + inline hiba-`ion-note`, `[value]` / `(valueChange)` + `[chips]`
  projekció. Kompozíció, nem ősosztály.
- **`QuantityInputComponent` refaktor** — a saját `ion-input` + súgó markup helyett
  `app-help-input`-ot komponál; viselkedés bitre azonos, a spec zöld.
- **Új `GradeInputComponent`** (`shared/grade-input/`, `app-grade-input`) — CVA +
  `[value]`/`(valueChange)` kettős API, `@Input() discipline`. Badge (`FRA`/`YDS`/
  `UIAA`/`FONT`/`V`, ill. `?`), kétértelműség-chipek (`candidates` → koppintásra
  feloldás), súgó modal (`SHARED.GRADE_INPUT.HELP_*`), inline hiba
  (`SHARED.GRADE_INPUT.ERROR_UNKNOWN` / `_AMBIGUOUS`), 250 ms debounce csak a
  vizuális deriváción (a form-érték minden leütésre propagál).
- **Parser áthelyezés** — `grade-scale.ts` + `climbing-grade-matrix.ts` (+ specek)
  `pages/workout/climbing/` → `shared/climbing/` (a `shared/` nem függhet
  `pages/`-től); importfix `climbing-contexts` / `climbing-metrics` / 6 page.
- **Bevezetés** — `admin/gym-color-band-edit` (alsó/felső fokozat),
  `admin/indoor-route-edit` (ágazatfüggő `disciplineValue()`), mind a 4
  `naplo/*-session-edit` (kísérlet + outdoor-köteles per-pitch). A `parseGrade`
  a `save()` gate-ekben / index-feloldásban marad; a `gradeUnparsed()` /
  `pitchGradeUnparsed()` helperek törölve, `WORKOUT.CLIMBING.GRADE_UNPARSED` i18n
  kulcs törölve (hu + en), `SHARED.GRADE_INPUT.*` hozzáadva.
- Nincs backend / Flyway / SQLite séma / OpenAPI / offline-sync változás. Új
  tesztek: `help-input.component.spec.ts`, `grade-input.component.spec.ts`;
  `lint` tiszta, `test:ci` 1125/1125.

## Lezárt kör: **Pénzügyek** (2026-08-31)

A teljes Pénzügyek feature elkészült a jóváhagyott terv szerinti sorrendben,
három slice-ban, mindegyik saját commitban, minden lépés után backend
(Testcontainers, ahol van backend) + frontend (`npm run build` + `test:ci`) +
`lint` zöld:

- **P1 — Rendszeres kiadások** (`a97f08f`): új `hu.bumler.lm2.finance` csomag
  (első `finance` package), `RecurringExpense` lapos user-owned CRUD az [[Úszás
  napló]] / [[Biciklizés napló]] mintájára, Flyway `V25`, kézzel írt OpenAPI
  (2 path + 2 schema), regenerált Angular kliens. `recurring-expense-math.ts`
  pure TS SSOT (`monthlyEquivalentHuf` / `addPeriod` / `countsInMonthlyEquivalent`
  / `classifyExpenseSection` / `dayLag`), lista + szerkesztő oldal, teljes
  offline-sync bekötés (`RecurringExpense` outbox entityType, SQLite séma v23),
  `finance/recurring-expenses` route `featureFlagGuard('menu.penzugyek')`-kel.
- **P2 — Nettó fizetés kalkulátor** (`d2341b5`): tisztán kliens, nincs backend /
  OpenAPI / offline-wiring. `shared/net-pay-calculator.ts` (`TB_RATE` 0.185 /
  `SZJA_RATE` 0.15 / 25-alatti SZJA-plafon `715_765` + `computeNetPay`),
  `ageInYears` kiemelve a `tdee-calculator.ts`-ből közös `shared/local-date.ts`
  helperré, `net-pay.page` read-only bontás, `finance/net-pay` route.
- **P3 — hub + Menü-pont** (ebben a commitban): `finance-dashboard.page` (3 kártya:
  Nettó / Havi kiadások / Maradék, mind szám vagy `~`), `finance` index route,
  `menu.page` Pénzügyek-pont (`menu.penzugyek` flag). A hub tisztán fogyasztó —
  a képleteket a gyerek utility-kből importálja, nem másolja. `menu.penzugyek`
  már eddig is `true` volt a `features.json`-ban.

**Tudatosan kihagyva ebből a körből** (a specek "Nem scope" szerint): közelgő
fizetés-értesítés ([[Értesítések]] későbbi típus, forrás: [[Rendszeres kiadások]]),
`WEEKLY` / tetszőleges interval, auto-roll app-nyitáskor, `endDate`, duplikálás,
undelete, naptár-producer, AYCM mező / FK ezen a táblán (a `linkedRecurringExpenseId`
kötés az [[AYCM tracker]] spechen él, nem itt), NAV-pontos adó, családi / egyéb
kedvezmény, what-if bruttó, szerveroldali nettó vagy havi ekvivalens.

## Lezárt kör: **AYCM tracker** (2026-08-31)

A teljes AYCM tracker feature (hub + AYCM elfogadóhely hozzáadása + AYCM Check-In
+ AYCM Statisztikák) elkészült a jóváhagyott terv szerinti sorrendben, négy
slice-ban, mindegyik saját commitban, minden lépés után backend (Testcontainers,
ahol van backend) + frontend (`npm run build` + `test:ci`) + `lint` zöld:

- **AY1 — elfogadóhely + árszabály** (`2fd4d09`): `hu.bumler.lm2.aycm` csomag,
  `AycmPartner` + `AycmPriceRule` (Flyway `V26`), kézzel írt OpenAPI (4 path +
  4 schema), `aycm-price-rule.ts` pure TS (`minutesOfDay` / `displayLabel` /
  `rulesOverlap` / `matchPriceRule`), partner-lista + szerkesztő (inline
  ársáv-lista, kliens+szerver overlap-check), teljes offline-sync bekötés
  (SQLite séma v24), `aycm/partners` route-fa. Regenerált Angular kliens is
  a commitban.
- **AY2 — Check-In** (`781b40c`): `AycmCheckIn` lapos user-owned CRUD (Flyway
  `V27`), napi egyediség `(user_id, check_in_date) WHERE deleted = false`
  partial unique → `409 UNIQUE_VIOLATION`, snapshot oszlopok. Egy űrlap (nincs
  lista): partner-picker + dátum (múlt/jövő szabad) + **Most** gomb, reaktív
  `matchPriceRule` előnézet (zöld/sárga+0 Ft), `?date=` deep-link. Teljes
  offline-sync bekötés (`nameUniqueness: null`, SQLite séma v25). Regenerált
  Angular kliens is a commitban.
- **AY3 — `AycmSettings` singleton + Statisztikák** (`749f81b`): `AycmSettings`
  1:1-user singleton (Flyway `V28`) a `UserProfile` mintájára — `GET` lazy
  `{ id: v5(userId), linkedRecurringExpenseId: null }` (200, nem 404), `PUT`
  upsert a determinisztikus id-ra; új `common/DeterministicUuid.v5` a frontend
  `uuid.ts` byte-pontos tükre. `aycm-pass-cost.ts` (`passCostComputable` /
  `passCostHuf` / `worthItHuf` — `monthlyEquivalentHuf` import, nem másolat),
  `aycm-stats.ts` (3-preset ablak + `filterCheckIns` / `summarize` /
  `groupByPartner` / `visitList`), `aycm-stats.page` read-only képernyő.
  `AycmSettings` singleton offline-ág (`_needs_refetch` re-pull, 2-arg
  tombstone, SQLite séma v26). Regenerált Angular kliens is a commitban.
- **AY4 — hub + Menü-pont** (ebben a commitban): `aycm-dashboard.page` (4 kártya:
  E havi látogatások / E havi érték / Megéri-e / Bérlet, mind szám, `0 Ft`, vagy
  `~`; FAB → Check-In; Bérlet-picker action-sheet), `aycm` index route,
  `menu.page` AYCM-pont (`menu.aycm` flag). `recurring-expense-edit.page`
  bővítése: `?returnTo` query param → mentés után oda navigál a friss
  `RecurringExpense.id`-t `createdExpenseId`-ként átadva; a hub `?createdExpenseId=`
  esetén auto-`linkExpense` + param-strip. A hub tisztán fogyasztó — nincs új
  entitás / OpenAPI / offline-wiring.
- **Code-review follow** (ebben a commitban): a 4 AYCM commit `/code-review`-ja
  után 9 észrevétel javítva. Frontend: (1) törölt-partneres Check-In szerkesztése
  már nem építi újra a snapshotot élő-only adatból — `snapshotFrozen` állapot, a
  sor fagyott (csak `notes`), a picker élő partnerre válthat; (2) `ensureRulesLoaded`
  feltétel nélkül tölt (stale ársáv-cache → rossz 0 Ft snapshot); (3) `now()` nem
  írja felül a mai sor idejét, ha már azon állunk; (4) AYCM hub / statisztika /
  Check-In `ionViewWillEnter` minden belépéskor újratölti a repókat (sync-pull
  után frissül); (5) `SyncEngine.applyTombstone` `AycmPartner`-DELETE drain után
  lokálisan is tombstone-olja a cascade árszabály-sorokat (`_dirty` clear, mint
  `HouseholdRoom`→task); (6) `recurring-expense-edit` `?returnTo` csak create
  módban él. Backend: (7) `AycmPriceRuleService` `get`/`update`/`delete`/`create`
  ellenőrzi, hogy a szabály a path `{id}` partnerhez tartozik → 404 (OpenAPI
  szerződés); (8) `idx_aycm_settings_user_id` (`V28`) bekötve a
  `GlobalExceptionHandler` unique-index → mező map-jébe (409 `UNIQUE_VIOLATION`,
  nem 500) + race-teszt; (9) `AycmPriceRule.yaml` `endTime` regex zárójelezve
  (`^(…|24:00)$`). Backend + frontend + lint zöld. Nyitva hagyva: a web
  `HttpStorageBackend` mindig POST-tal upsertel (nem PUT edit-re) — ez az egész
  online-only web build ~25 entitáson egységes, dokumentált viselkedése
  (`POST` létező id-ra idempotens upsert, sosem 409), nem AYCM-regresszió.

**Tudatosan kihagyva ebből a körből** (a specek "Nem scope" szerint): hivatalos
AYCM-import / partner-API / térkép / cím-mező; éjfélen átnyúló ársáv; több
belinkelt kiadás; több Check-In / naptári nap; naptár-producer; értesítés;
4. gyerek; diagram a statisztikában; custom dátumtartomány / YTD / all-time;
partner `active`; szabály-duplikálás; seed; undelete; inline partner-create a
Check-Inről.

## Lezárt kör: **Lépésszám követés** (2026-09-01)

A [[Lépésszám követés]] feature mindkét gyereke elkészült, egy jóváhagyott
plan-nal, két slice-ban (L1 manuális → L2 Health Connect), minden lépés után
backend (Testcontainers) + frontend (Karma + `ng build`) + lint zöld.

- **L1 — manuális `DailyStepLog`** (`a98d897`): `hu.bumler.lm2.steps` backend
  csomag (lapos user-owned CRUD, determinisztikus v5 id `(userId, date)`, POST
  törölt napra revive, `V29` + parciális unique index + `sync_changes` view),
  OpenAPI + regenerált Angular kliens, teljes frontend offline-sync bekötés
  (SQLite séma v27, `DailyStepLog` outbox entityType, `SyncEngine`
  drain/pull/tombstone/`_needs_refetch` ágak), `daily-step-log.repository.ts`
  (`saveManual` mindig felülír, `maxWinsUpsert` csak nagyobb), `activity-kcal.ts`
  `stepKcalForDay` SSOT a Kaja dashboard `workoutExtraKcal`-jába kötve,
  `pages/menu/steps/` (tracker + per-nap editor), `steps` route-fa +
  `menu.lepesszam` Menü-pont + i18n.
- **L2 — Health Connect sync** (kliens-oldal, `7f9b886`): `core/health/` —
  `activity-step-sync.service` (app-nyitás + `App` `resume` → mai nap + 7 napos
  hiánypótló backfill csak a `DailyStepLog`-gal nem rendelkező napokra,
  `datesNeedingBackfill` pure modul), `health-connect.plugin.ts`
  (`registerPlugin('HealthConnectSteps')` TS-szerződés),
  `health-connect-step-source.service` (hibanyelő wrapper, web → no-op),
  `main.ts` bootstrap-hook, `step-tracker.page` engedély/„utolsó sync" státusz-sáv,
  AndroidManifest (`health.READ_STEPS` + rationale activity-alias + `<queries>`).
- **L2 — natív Android Health Connect modul**: `android/.../health/HealthConnectStepsPlugin.kt`
  app-lokális Capacitor plugin `androidx.health.connect:connect-client:1.1.0`-val
  (`getSdkStatus` availability, `permissionController.getGrantedPermissions()` /
  `createRequestPermissionResultContract()` a READ_STEPS grantre,
  `aggregate(StepsRecord.COUNT_TOTAL, TimeRangeFilter.between(...))` a napi totálra),
  `MainActivity.onCreate` `registerPlugin(...)`. Kotlin bekötve az app-modulba
  (`kotlinVersion` + `androidxHealthConnectVersion` a `variables.gradle`-ben,
  `org.jetbrains.kotlin.android` plugin), `uses-sdk tools:overrideLibrary` +
  `SHOW_PERMISSIONS_RATIONALE` intent-filter a manifestben. `./gradlew
  :app:assembleDebug` zöld, a plugin + a HC SDK osztályok benne a debug APK dex-ében.

**Tudatosan kihagyva ebből a körből:**
- **On-device funkcionális próba valós Samsung Health adattal** — a natív modul
  fordul és csomagolódik, de egy telefonon, valódi Health Connect provideren,
  engedélyezett READ_STEPS-szel még nem futott végig a mai-nap + backfill kör.
  A `scripts/install-android.ps1` telepíti a debug APK-t; a próba az első
  eszközön-futtatáskor zárható le.
- **Valódi 08:00 `WorkManager` háttér-worker** — nincs `@capacitor/background-runner`
  (külön JS-kontextus, nulla DI/unit-tesztelhetőség); az app-open backfill a
  tartalék, ami garantálja, hogy egy nap se vesszen el véglegesen.
- **`STEPS_LOW` értesítés** (20:00, mai < 2000) — az [[Értesítések]] körrel jön.
- **„Frissítés most" gomb**, **iOS Health** — a spec is későbbi scope-nak jelöli.

## Következő javasolt feature: **Értesítések**

A "Nincs elkezdve" táblában egyetlen feature maradt: az [[Értesítések]].
Tisztán kliensoldali; a 6 aktív típusból mind a 6 forrása `Kész` (Élelmiszer
tárolás, Étkezés, Háztartási feladatok, Események, és a Lépésszám `STEPS_LOW`),
tehát mind egy menetben beköthető. Jóval kisebb, mint az Edzés kör volt —
érdemes ismét egy jóváhagyott plan-nal nekifutni.
