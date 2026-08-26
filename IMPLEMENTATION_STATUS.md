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
| [Backend-offline first](documentation/Architektúra/Backend-offline%20first.md) | `d1950b4` (2026-08-19) | Kész — outbox, sync engine, storage backend megvalósítva |
| [Backend](documentation/Architektúra/Backend.md) | `d1950b4` (2026-08-19) | Kész — OpenAPI spec-first pipeline, Flyway, hibaszerződés áll |
| [Frontend](documentation/Architektúra/Frontend.md) | `d1950b4` (2026-08-19) | Kész — layering, signals, tab registry, feature flags áll |

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
| [Kaja](documentation/Features/Kaja.md) | `3b4564f` (2026-08-19) | — | — | Csak a hub navigáció; a subfeature-ök közül eddig három (Élelmiszerek, Élelmiszer tárolás, Recept) kész a maga körében, a többi hátravan — lásd alul. |
| ↳ [Élelmiszerek](documentation/Subfeatures/Élelmiszerek.md) | `56923be` (2026-08-19) | `hu.bumler.lm2.food` (`Food`) | `pages/food/catalog/` (lista + kereső + törlés), `core/data/food.repository.ts` | **Kész** — első shared/global (nem user-owned) entitás a kódbázisban; a duplikáció-ellenőrzés alkalmazás-szintű, minden mezőre ([[Névegyediség]]). |
| ↳ [Élelmiszer hozzáadása](documentation/Subfeatures/Élelmiszer%20hozzáadása.md) | `74583ce` (2026-07-24) | — | `pages/food/catalog/` "+" FAB → action sheet (manuális / vonalkód / import) | **Kész** — mindhárom csatorna aktív. |
| ↳ [Élelmiszer manuális bevitele](documentation/Subfeatures/Élelmiszer%20manuális%20bevitele.md) | `d1950b4` (2026-08-19) | (ua., mint Élelmiszerek) | `pages/food/catalog/food-edit.page.ts` | **Kész** — teljes űrlap (13 tápanyag mező fix sorrendben, só→nátrium/klorid auto-számítás touched-állapottal, romlási idők) + Open Food Facts "sync" gomb (diff-megerősítő dialógussal). |
| ↳ [Vonalkódos élelmiszer beolvasás](documentation/Subfeatures/Vonalkódos%20élelmiszer%20beolvasás.md) | `74583ce` (2026-07-24) | — | `pages/food/catalog/food-barcode-scanner.service.ts`, `open-food-facts(.service).ts`, `food-prefill.service.ts` | **Kész, on-device ellenőrzés hátravan** — `@capacitor-mlkit/barcode-scanning` bekötve (`npx cap sync android` lefutott, `AndroidManifest.xml` CAMERA permission + ML Kit meta-data hozzáadva), OFF hívás kliens-oldalról. A natív scan()/modul-telepítés unit-tesztelhetetlen (a Capacitor `registerPlugin` Proxy-ja miatt `spyOn` nem fogja meg — lásd a service fájl kommentjét); csak a `pickBarcodeValue` tiszta logika tesztelt. |
| ↳ [Élelmiszer importálása clipboard-ról](documentation/Subfeatures/Élelmiszer%20importálása%20clipboard-ról.md) | `56923be` (2026-08-19) | — | `pages/food/catalog/food-import.page.ts`, `food-import.ts` (parser) | **Kész** — 22 oszlopos TSV parser (fejléc-felismerés, `-`/üres kezelés, tizedesvessző, só-auto-számítás), élő Új/Duplikátum/Invalid előnézet, csak az Új sorokat menti. |
| ↳ [Élelmiszer tárolás](documentation/Subfeatures/Élelmiszer%20tárolás.md) | `3ddf321` (2026-08-14) | `hu.bumler.lm2.food` (`StoredFood`, per-user, `food_id` a globális katalógusra) | `pages/food/storage/` (lista: hely-szűrő + lejárat-sorrend + romlott/felbontott badge; szerkesztő: kereshető Food-választó → mennyiség/hely/lejárat), `core/data/stored-food.repository.ts`, `pages/food/storage/shelf-life.ts` | **Kész a manuális CRUD + felbontás körre.** Bevásárlásból létrehozás (`db` egység szerinti darabolás) a [[Bevásárlás teljesítve]] flow-val együtt jön, az még nincs elkezdve. Készletcsökkenés étkezéskor a [[Étkezés]] slice-szal együtt jön (az orchestrálja). Lejárat-számítás (előtöltés + felbontás) naptári hónap/év-hozzáadással (`shelf-life.ts`, nem a Mennyiség mező fix napszámú egyenlőség-táblájával — az kifejezetten csak összehasonlításra szolgál). Törléskori cascade (Food törlésekor a rá hivatkozó StoredFood sorok is soft delete-elődnek, minden felhasználónál) mindkét oldalon (backend `FoodService.delete`, frontend `SqliteStorageBackend.deleteFood` + `SyncEngine` tombstone/pull ágak) megvan. Értesítések (lead-time emlékeztető, "megromlott" push) még nincs — az `[[Értesítések]]` közös réteggel együtt jön, ahogy a Háztartási feladatok/Élet tervek esetén is. Nincs teljes szegmentált Kaja hub — a Katalógus/Tárolás váltás egyelőre egy egyszerű `ion-segment` mindkét lista tetején. |
| ↳ [Recept](documentation/Subfeatures/Recept.md) | `d1950b4` (2026-08-19) | `hu.bumler.lm2.food` (`Recipe`, `RecipeIngredient`, mindkettő shared/global mint `Food`) | `pages/food/recipe/` (lista + szerkesztő: multi-select Food-választó, up/down natíven / drag-and-drop weben rendezés, élő ár/kcal/fehérje/szénhidrát/zsír összegzés + hiányos-jelzés), `core/data/recipe.repository.ts`, `pages/food/recipe/recipe-summary.ts` | **Kész.** Nested aggregate PUT (mint `PackingTemplate`/`PackingTemplateItem`), de `user_id` nélkül mindkét táblán. Két független duplikáció-szabály: recept **neve** (valódi globális Névegyediség-scope, ellentétben a Food mezőhalmaz-szabályával) + élő hozzávaló-halmaz (`foodId`+`amount`+`unit` párok, sorrendtől függetlenül, csak ha van hozzávaló). Összegzés + `db` megjelenítés tisztán kliens-oldali (`recipe-summary.ts`), a helyi Food-katalógus pillanatképéből — nincs backend endpoint rá. Food törléskor cascade a rá hivatkozó RecipeIngredient sorokra (minden recepten) mindkét oldalon (backend `FoodService.delete`, frontend `SqliteStorageBackend.deleteFood` + `SyncEngine` tombstone/pull ágak). Recept törlésekor cascade a saját hozzávalóira; az Étkezés/Recept forrású étkezés felé mutató cascade majd azzal a slice-szal együtt jön. Nincs teljes szegmentált Kaja hub — a Katalógus/Tárolás/Recept váltás egyelőre egy egyszerű `ion-segment` mindhárom lista tetején. |
| [Mennyiség mező](documentation/Architektúra/Mennyiség%20mező.md) (architektúra SSOT) | `d1950b4` (2026-08-19) | `hu.bumler.lm2.common.QuantityConverter` (kanonikus egyenlőség) | `shared/quantity.ts`, `shared/quantity-input/` | **Kész** — parser + `QuantityInputComponent` (`quantity`/`duration` mód), kanonikus bázisegység-tábla mindkét oldalon a közös `shared/fixtures/quantity-conversion.json`-nal paritásban tesztelve. |
| [Névegyediség](documentation/Architektúra/Névegyediség.md) (architektúra SSOT) | `56923be` (2026-08-19) | `hu.bumler.lm2.common.BarcodeNormalizer` (a `NameNormalizer` már megvolt) | `shared/barcode-normalization.ts` (a `name-normalization.ts` már megvolt) | **Kész** a Food mezőhalmaz-egyediséghez szükséges rész (barcode normalizálás); a hex szín normalizálás ([[Indoor boulder admin]]) még nem kellett, nincs implementálva. |

## Nincs elkezdve

Nincs backend package, nincs frontend page/repository ezekhez — teljes egészében
hátravan. Sorrend a specek mérete / függőségei alapján (lásd "Következő javasolt
feature" lent), nem prioritás.

| Feature | Subfeature-ök | Fő függőségek |
|---|---|---|
| ↳ Kaja folytatása | Tápérték kalkulátor → Étkezés (+3 forrás, ez zárja le a Bevásárlásból + fogyasztási cascade-ot az Élelmiszer tárolásnál) → Kaja statisztika (javasolt sorrend, lásd a "Folyamatban" szakaszt fent a már kész Élelmiszerek + Élelmiszer tárolás + Recept körökért) | Lásd fent |
| [Edzés](documentation/Features/Edzés.md) | Edzésnapló, Gyakorlat, Heti terv, Biciklizés napló, Úszás napló, Mászónapló (+ 12 Indoor/Outdoor boulder/köteles al-spec) | Profile (kész) — a Mászónapló ág önmagában a legnagyobb subtree a projektben |
| [Bevásárlás](documentation/Features/Bevásárlás.md) | Bevásárlólista írás, Bevásárlás teljesítve, Bevásárlás előzmény | Élelmiszerek (Kaja alatt) |
| [Pénzügyek](documentation/Features/Pénzügyek.md) | Nettó fizetés kalkulátor, Rendszeres kiadások | Nincs |
| [AYCM tracker](documentation/Features/AYCM%20tracker.md) | AYCM Check-In, AYCM elfogadóhely hozzáadása, AYCM Statisztikák | Nincs |
| [Lépésszám követés](documentation/Features/Lépésszám%20követés.md) | Kézzel bevitel, Samsung Health szinkron | Samsung Health natív integráció |
| [Értesítések](documentation/Features/Értesítések.md) | — | Több más feature helyi notification-hookjait szolgálja ki (Háztartási feladatok, Élet tervek stb.) |

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

## Következő javasolt feature: **Kaja vagy Edzés**

A Tennivalók-hoz hasonló méretű "gyors győzelem" feature-ök elfogytak — a
maradék listán csak a nagy, több hetes feature-ök vannak (lásd "Nincs
elkezdve"). Két irány védhető:

- **Kaja** — a fő napi use-case (étkezés naplózás + TDEE), de 4 beviteli mód
  (manuális / vonalkód / clipboard / recept) + statisztika, és a Tápérték
  kalkulátor architektúra-doksit is implementálni kell hozzá.
- **Edzés** — a Mászónapló ág egyedül 12 al-specet visz (Indoor/Outdoor ×
  boulder/köteles, nehézségi konverziós mátrix); érdemes lenne először csak az
  Edzésnapló + Gyakorlat + Heti terv "törzset" megcsinálni, a Mászónapló-t
  külön körre hagyva.

Mindkettő jóval nagyobb, mint bármelyik Tennivalók-lépés volt — érdemes ismét
egy jóváhagyott plan-nal, subfeature-önkénti bontásban nekifutni, ahogy ez a
kör is ment.
