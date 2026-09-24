---
id: 127
type: change-request
status: done
title: Heti terv — állandó (aktív) heti beosztás, ami a következő hetekre is érvényes, amíg a user nem módosítja
specs:
  - "[[Heti terv]]"
  - "[[Edzés]]"
flag:
created: 2026-09-24
closed: 2026-09-24
---

# 127 — Heti terv — állandó (aktív) heti beosztás, ami a következő hetekre is érvényes, amíg a user nem módosítja

## Motiváció / probléma

Kényelmetlen, hogy minden héten újra meg kell adni, melyik nap milyen edzés lesz. A user egyszer
állítsa be az aktív heti beosztást, és az maradjon érvényes a következő hetekre is, amíg nem
változtat rajta.

## Jelenlegi működés

[[Heti terv]]: a `WeeklyPlan` **egy konkrét naptári hét** hozzárendelése (`weekStartDate` = hétfő,
determinisztikus UUID v5 `(userId, weekStartDate)`-ből), `WeeklyPlanSlot` sorokkal (nap →
`WorkoutPlan`). Egy olyan hét, amihez nincs `WeeklyPlan`, üres. Az egyetlen segítség a
„Másolás következő hétre" akció, ami kézi, hétről hétre ismétlendő klónozás.

## Elfogadási kritériumok

- [x] Ha egy hétnek nincs saját beosztása, a legutóbbi korábbi, beosztással rendelkező hét
      beosztása érvényes rá („öröklés előre"), a heti nézetben és minden fogyasztónál (Kezdőlap
      „Mai edzések" widget, adherence, értesítések) egyformán.
- [x] A heti nézet jelzi, ha a beosztás örökölt (pl. „a <dátum> óta érvényes beosztás"), és
      mikortól él.
- [x] Egy hét beosztásának módosításakor választható: **„Mostantól"** (az új beosztás ettől a
      héttől előre érvényes) vagy **„Csak erre a hétre"** (egyszeri kivétel; a következő héten a
      korábbi érvényes beosztás folytatódik).
- [x] Múltbeli hetek (és azok adherence-e) nem változnak visszamenőleg egy „Mostantól" módosítástól.
- [x] A „Másolás következő hétre" akció megszűnik vagy átalakul (döntendő), mert feleslegessé válik.
- [x] Offline működik ([[Backend-offline first]]); két eszköz közti konvergencia megmarad.
- [x] Zöld lint + test:ci + build + backend test (+ verify:outbox, ha a payload változik).

## Terv / döntési napló

Két megvalósítási irány (scopingkor döntendő):

1. **Tisztán kliens-oldali öröklés** — adatmodell-változás nélkül: a feloldó a `weekStartDate ≤ W`
   legnagyobb saját `WeeklyPlan`-ját adja. „Mostantól" = mentés az adott hétre; „Csak erre a hétre"
   = a hét mentése + a következő hét előre kitöltése a korábbi beosztással (hogy ott visszaálljon).
   Egyszerű, nincs migráció; hátránya, hogy a kivétel „felüli" egy második sort.
2. **Explicit ismétlődő sablon** — új entitás (pl. `WeeklySchedule` `effectiveFrom`-mal) + a
   meglévő `WeeklyPlan` csak egy-heti felülírásként. Tisztább szemantika, de új szinkronizált tábla
   és migráció.

**Döntés (2026-09-24):** az elfogadási kritériumokban leírt viselkedés jóváhagyva (öröklés előre +
„Mostantól" / „Csak erre a hétre" választás). Megvalósítás: 1. irány, mert illeszkedik a meglévő
determinisztikus-UUID-s heti modellhez. A „Másolás következő hétre" sorsa implementációkor
dönthető (valószínűleg megszűnik).

**Implementáció (2026-09-24):** a „Másolás következő hétre" megszűnt. A módosítás érvényessége
egy szegmens a heti nézet tetején (alapértelmezés „Mostantól"), nem minden módosításnál felugró
kérdés — kevesebb súrlódás. A Kezdőlap „Mai edzések" widget, az értesítések és az adherence ma nem
olvasnak heti tervet (csak a heti nézet) — a feloldó (`resolveEffectiveWeek`) tiszta függvény, egy
jövőbeli fogyasztó ugyanazt hívja.

## Lezáráskor (on-done)

- Frissített specek: [[Heti terv]] ([[Edzés]] nem igényelt változást — csak hivatkozik a Heti tervre)
- `IMPLEMENTATION_STATUS.md` sor: 2026-09-24 — #127
- Kód: `pages/workout/weekly-plan/weekly-plan-adherence.ts` (`resolveEffectiveWeek`), `weekly-plan.page.*`
