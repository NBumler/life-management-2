---
id: 127
type: change-request
status: backlog
title: Heti terv — állandó (aktív) heti beosztás, ami a következő hetekre is érvényes, amíg a user nem módosítja
specs:
  - "[[Heti terv]]"
  - "[[Edzés]]"
flag:
created: 2026-09-24
closed:
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

- [ ] Ha egy hétnek nincs saját beosztása, a legutóbbi korábbi, beosztással rendelkező hét
      beosztása érvényes rá („öröklés előre"), a heti nézetben és minden fogyasztónál (Kezdőlap
      „Mai edzések" widget, adherence, értesítések) egyformán.
- [ ] A heti nézet jelzi, ha a beosztás örökölt (pl. „a <dátum> óta érvényes beosztás"), és
      mikortól él.
- [ ] Egy hét beosztásának módosításakor választható: **„Mostantól"** (az új beosztás ettől a
      héttől előre érvényes) vagy **„Csak erre a hétre"** (egyszeri kivétel; a következő héten a
      korábbi érvényes beosztás folytatódik).
- [ ] Múltbeli hetek (és azok adherence-e) nem változnak visszamenőleg egy „Mostantól" módosítástól.
- [ ] A „Másolás következő hétre" akció megszűnik vagy átalakul (döntendő), mert feleslegessé válik.
- [ ] Offline működik ([[Backend-offline first]]); két eszköz közti konvergencia megmarad.
- [ ] Zöld lint + test:ci + build + backend test (+ verify:outbox, ha a payload változik).

## Terv / döntési napló

Két megvalósítási irány (scopingkor döntendő):

1. **Tisztán kliens-oldali öröklés** — adatmodell-változás nélkül: a feloldó a `weekStartDate ≤ W`
   legnagyobb saját `WeeklyPlan`-ját adja. „Mostantól" = mentés az adott hétre; „Csak erre a hétre"
   = a hét mentése + a következő hét előre kitöltése a korábbi beosztással (hogy ott visszaálljon).
   Egyszerű, nincs migráció; hátránya, hogy a kivétel „felüli" egy második sort.
2. **Explicit ismétlődő sablon** — új entitás (pl. `WeeklySchedule` `effectiveFrom`-mal) + a
   meglévő `WeeklyPlan` csak egy-heti felülírásként. Tisztább szemantika, de új szinkronizált tábla
   és migráció.

Javaslat: 1. irány, mert illeszkedik a meglévő determinisztikus-UUID-s heti modellhez.

## Lezáráskor (on-done)

- Frissített specek: [[Heti terv]], [[Edzés]]
- `IMPLEMENTATION_STATUS.md` sor: <dátum> — <mit>
- Kód: <fő package-ek / fájlok>
