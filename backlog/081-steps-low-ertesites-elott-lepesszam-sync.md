---
id: 81
type: change-request          # feature | change-request | bug
status: backlog               # backlog | deferred | ready | in-progress | blocked | done | dropped
title: STEPS_LOW értesítés előtt friss lépésszám-sync
specs:
  - "[[Értesítések]]"
  - "[[Lépésszám követés]]"
  - "[[Lépésszám átszinkronizálása a Samsung Health-ből]]"
flag:
created: 2026-09-07
closed:
---

# 81 — STEPS_LOW értesítés előtt friss lépésszám-sync

## Motiváció / probléma

A `STEPS_LOW` (§3, este 20:00) értesítés valótlan is lehet: „ma keveset léptél",
miközben a Health Connect szerint a mai lépésszám bőven a küszöb fölött van — csak a
helyi `DailyStepLog` nem lett még frissítve. A user így téves emlékeztetőt kap, ami
rontja az összes értesítés hitelességét.

Kiváltó helyzetek:

- **Háttér-hozzáférés megtagadva:** ha az `android.permission.health.READ_HEALTH_DATA_IN_BACKGROUND`
  nincs megadva, a `STEPS_LOW` „app-nyitáskor értékelődő" ágra esik vissza, és a helyi
  (esetleg reggel óta nem frissült) `stepCount`-ból dönt.
- **App-nyitáskori reconcile sorrend:** az app-open `syncNow()` (mai HC-olvasás +
  7 napos backfill) és a `NotificationScheduler` újraértékelése között nincs garantált
  „előbb a sync, aztán a küszöb" sorrend — a scheduler a még régi értékkel is
  tüzelhet.

## Jelenlegi működés

- [[Értesítések]] §3 `STEPS_LOW`: 20:00-kor, ha a **mai** `stepCount` < küszöb
  (alap 2000) → 1 értesítés / nap. „Már kiküldött értesítést nem vonunk vissza", ha
  később a sync a küszöb fölé emeli az értéket.
- A natív háttér-worker esti futása a `STEPS_LOW`-t **élő Health Connect olvasásból**
  dönti el — de csak ha a háttér-olvasási engedély megvan; megtagadva ez az ág kimarad
  és marad az app-nyitáskori, helyi store-alapú értékelés
  ([[Értesítések]] → Architektúra → Frontend, `ReminderWorker`).
- [[Lépésszám átszinkronizálása a Samsung Health-ből]] → „Mikor kell sync": app-nyitás
  = mai HC-olvasás + backfill; a `STEPS_LOW` küszöb-értékelés viszonyát a sync
  befejeződéséhez a spec nem rögzíti.

## Elfogadási kritériumok

- [ ] A `STEPS_LOW` küszöb kiértékelése előtt (bármelyik ág: app-open reconcile,
      foreground újraértékelés, háttér-worker) lefut egy friss lépésszám-sync
      (Health Connect mai lépés-olvasás + max-wins upsert a `DailyStepLog`-ra), és a
      küszöböt a frissített helyi érték alapján döntjük el.
- [ ] Az app-open path determinisztikus sorrend: előbb a mai lépés-sync
      (`ActivityStepSyncService`) fejeződik be, csak utána értékel a
      `NotificationScheduler` a `STEPS_LOW`-ra.
- [ ] Ha a Health Connect nem elérhető / engedély nincs / az olvasás hibázik: a
      viselkedés a mai (helyi store-alapú) fallback marad, nincs regresszió és nincs
      dupla tüzelés.
- [ ] A háttér-worker ágon a viselkedés változatlan marad ott, ahol már ma is élő
      HC-olvasásból dönt; a változás a fallback (engedély nélküli) ágat célozza,
      amennyiben ott technikailag lehetséges friss adatot szerezni.
- [ ] A dedup („1 / naptári nap") és a „nem vonjuk vissza a kiment értesítést"
      szabály változatlan.
- [ ] Érintett specek frissítve (lásd Lezáráskor).

## Terv / döntési napló

- **2026-09-07:** Elfogadott korlát — ha a natív háttér-worker fallback ágán nincs
  `READ_HEALTH_DATA_IN_BACKGROUND` engedély, nincs mód friss HC-olvasásra; ilyenkor a
  `STEPS_LOW` a legutóbbi ismert (helyi store-beli) értékből tüzel, ahogy ma is. A jegy
  a foreground / app-open ágat javítja (sync a küszöb előtt + determinisztikus sorrend);
  a háttér-worker engedély nélküli ága változatlan marad. A záráskor ez `#### Tudatos
  korlát` bejegyzésként kerül az [[Értesítések]] specbe.

## Lezáráskor (on-done)

- Frissített specek: [[Értesítések]] (§3 + Architektúra/Frontend — sync-a-küszöb-előtt
  sorrend), [[Lépésszám követés]] (Értesítés szakasz), [[Lépésszám átszinkronizálása a
  Samsung Health-ből]] („Mikor kell sync" — a `STEPS_LOW` előtti sync)
- `IMPLEMENTATION_STATUS.md` sor: <dátum> — <mit>
- Kód: `core/sync` / `NotificationScheduler`, `ActivityStepSyncService`, `ReminderWorker`
