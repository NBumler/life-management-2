---
id: 128
type: bug
status: deferred
title: "[PRIO] Meglévő rekord szerkesztése nem marad meg (étkezés tétel mennyisége, színsáv nehézsége) — Androidon"
specs:
  - "[[Étkezés]]"
  - "[[Élelmiszer forrású étkezés]]"
  - "[[Indoor boulder admin]]"
  - "[[Backend-offline first]]"
  - "[[Frontend]]"
flag:
created: 2026-09-25
closed:
---

# 128 — [PRIO] Meglévő rekord szerkesztése nem marad meg (étkezés tétel mennyisége, színsáv nehézsége)

## Motiváció / probléma

**Kiemelten prioritásos.** A Backend-offline first ígéret (a lokális SQLite a megjelenítés
forrása, minden mutáció tartósan megmarad) sérül, ha egy szerkesztés csendben elveszik.
Ez az alapfunkció, amire az egész app épül.

Felhasználói bejelentés (Android natív build, 2026-09-25):

1. Egy étkezés **élelmiszer tételének mennyiségét** 2 db-ról 1 db-ra írta át, mentett.
   Amikor újra megnyitotta az étkezést, **2 db** látszott.
2. Hasonló jelenség volt egy **színsáv (GymColorBand) nehézségének** (grade alsó/felső határ)
   módosításakor is.

Nem tudni, hogy mindig előjön-e vagy csak néha. Az sem ismert, hogy a módosítás
**ténylegesen elveszett** (DB / outbox / szerver), vagy **csak a UI mutat régi adatot**
(repository cache, újrahasznosított Ionic page példány). A user szerint „lehet, hogy
valójában módosult, csak a komponens cache-elt”. **Egyik eset sem elfogadható**: ha csak a
UI hibás, a user nem tud megbízni benne, és a régi értékkel újra elmentve felülírja a jót.

A #129 (új színsáv létrehozása nem működik) is ide köthető, de lehet független is.

## Jelenlegi működés

- [[Étkezés]] / [[Élelmiszer forrású étkezés]]: `pages/food/meal/meal-edit.page.ts`. A FOOD
  tétel mennyisége egy `FormControl` (`quantityControl`), amit egy `valueChanges → signal`
  tükör követ (`meal-item-row.ts` `buildFoodRow`). A tételszerkesztő modal a megnyitáskor
  pillanatképet készít (`snapshotRow`). A „Kész” gomb megtartja a szerkesztést, a „Mégse”, a
  háttérre koppintás és a lehúzás (`onEditorDismiss` → `cancelEditor`) visszaállítja a
  pillanatképet (`restoreRow`). Mentéskor `toSaveItem` a `row.quantity()` signalból olvas →
  `MealRepository.save` → `SqliteStorageBackend.saveMeal` (meal + item upsert + egy `PUT
  /api/meals/{id}` outbox sor, egy tranzakcióban).
- [[Indoor boulder admin]]: `gym-color-band-edit.page.ts` `ngOnInit` a
  `GymColorBandRepository.items()`-ből tölti a formot. A repository natívon **cache-el**
  (`load()` no-op, ha `loaded()`), és csak `DataChangeNotifier` `GymColorBand` jelzésre tölt
  újra kötelezően.
- Pull oldalon a `_dirty = 1` sorokat a delta-pull nem írja felül ([[Backend-offline first]]
  §8). A nested aggregátumok gyerek-sorain (meal_item) a drain siker után a
  `sync-engine.service.ts` törli a `_dirty` / `_local_only` jelzőt.

## Hipotézisek (kivizsgálandó, nem igazolt)

A javítás előtt **reprodukálni és lokalizálni kell**, melyik réteg veszti el az értéket:

1. **A modal bezárása cancelként fut le.** Ha Androidon a „Kész” után a `didDismiss` előbb
   fut, mint a `commitEditor` nullázása, vagy a user a hardveres back gombbal / lehúzással
   zárja be, a `cancelEditor` → `restoreRow` visszaírja a 2 db-ot. Ez pont „nem marad meg”
   tünetet ad.
2. **A mennyiség-input nem commitol a controlba** blur / `ionChange` előtt (`shared/`
   quantity input CVA). Android billentyűzetnél a „Kész” / mentés lenyomásakor a
   `quantityControl` még a régi értéken lehet.
3. **Repository- vagy page-cache.** Az Ionic `ion-router-outlet` a stackben tartja a page
   példányokat. A `load()` cache-rövidzár, vagy egy `items` signal, amit a save után nem
   frissítünk, régi DTO-t adhat vissza.
4. **Pull felülírja a lokális szerkesztést.** Ha a PUT drain `ERROR`-ba megy (400/422), vagy a
   `_dirty` jelző túl korán törlődik, a következő pull a szerver régi sorát írja vissza.
   Ellenőrizendő: a szinkronközpontban (`/tabs/menu/sync`) van-e `ERROR` / függő sor az
   érintett Meal / GymColorBand entitásra.
5. **Szerver oldali nested save** (`MealService` save tree): meglévő gyerek-sor mezőjének
   frissítése nem íródik át (csak insert/undelete ág) → a pull a régi értéket hozza vissza.

## Elfogadási kritériumok

- [ ] Reprodukció dokumentálva a `## Terv / döntési napló`-ban: melyik réteg (UI form / modal
      lifecycle / repository cache / SQLite / outbox / szerver / pull) veszti el az értéket.
      Legalább Androidon ONLINE és FULL_OFFLINE állapotban kipróbálva.
- [ ] Étkezés FOOD tétel mennyiségének módosítása (2 db → 1 db) után a mentés, visszalépés,
      újranyitás, **app újraindítás** és egy teljes drain + pull ciklus után is 1 db látszik,
      és a szerveren is 1 db van.
- [ ] Ugyanez RECIPE (`servings`, hozzávaló-felülírás) és CUSTOM tételre.
- [ ] Színsáv alsó/felső grade módosítása ugyanígy megmarad (UI, SQLite, szerver, pull után).
- [ ] A tételszerkesztő modal a „Kész” gombbal és a billentyűzet nyitott állapotában is
      megtartja a módosítást. Mégse / back / lehúzás visszaállít (a mostani szándékolt
      viselkedés marad).
- [ ] **Rendszerszintű audit:** az összes szerkesztő page, ami `ngOnInit`-ben cache-elt
      repository-ból tölt, és az összes nested aggregátum mentés (Meal, Recipe,
      PackingTemplate, ShoppingList, ClimbingSession + attempts, …) át van nézve ugyanerre a
      hibaosztályra. A talált azonos hibák javítva, vagy külön jegyben rögzítve.
- [ ] Regressziós tesztek: frontend spec a hibás rétegre (pl. modal dismiss sorrend /
      repository cache frissülés / `saveMeal` meglévő item update), és ha a szerver érintett,
      backend integrációs teszt (meglévő gyerek-sor mezőjének frissítése PUT-tal).

## Terv / döntési napló

- **2026-09-25 — `deferred`:** a user nem tudta reprodukálni. Addig parkolva, amíg újra elő
  nem jön. Ha előjön: jegyezd fel a pontos lépéseket (melyik gomb / back / lehúzás zárta a
  tételszerkesztőt, online vagy offline volt-e), és ne mentsd újra a rekordot, amíg adb-vel
  ki nem olvastuk az SQLite + `outbox_item` állapotot → vissza `ready`-be.
- A színsáv-oldali tünet valószínűleg a #129 volt (érvénytelen `3A`/`4A` Font-fokozat miatti
  néma mentés), nem egy elveszett szerkesztés. A szerkesztés-oldali gyanú így főleg az étkezés
  tételére marad.

_Első lépés (ha újra előjön): debug build Androidon, `chrome://inspect` + az érintett SQLite sorok és
`outbox_item` tartalmának kiolvasása a szerkesztés előtt és után._

## Lezáráskor (on-done)

- Frissített specek: [[…]] — melyik szakasz, egy sor mit változott
- `IMPLEMENTATION_STATUS.md` sor: <dátum> — <mit>
- Kód: <fő package-ek / fájlok>
