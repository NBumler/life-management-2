---
id: 91
type: change-request
status: done
title: Mászás — a „Próbák (ebben a sessionben)" (attemptCount) input alapértéke legyen 1
specs:
  - "[[Mászónapló]]"
flag:
created: 2026-09-09
closed: 2026-09-09
---

# 91 — Mászás — a „Próbák (ebben a sessionben)" (attemptCount) input alapértéke legyen 1

## Motiváció / probléma

Egy kísérlet-sor felvételekor a „Próbák (ebben a sessionben)" mező (`attemptCount`) legyen
**alapból 1-re** előtöltve — a leggyakoribb eset egy próba, a projektezésnél a user átírja.
Jelenleg üresen indul, és minden sornál be kell írni.

## Jelenlegi működés

[[Mászónapló]] `AscentAttempt.attemptCount`: „Opcionális egész `≥ 1` … A napló-form címkéje:
»Próbák (ebben a sessionben)«. Tájékoztató mező" — a Volumen / sikerarány / duration-fallback
**nem** szoroz vele. Kezdőérték nincs specifikálva.

## Elfogadási kritériumok

- [ ] Új kísérlet-sornál az `attemptCount` input kezdőértéke `1` (mind a 4 kontextus-napló form).
- [ ] A mentett érték `1` lesz, ha a user nem nyúl hozzá (nem marad `null`), vagy a `null`
      megjelenítése konzisztensen `1` — döntés a scopingban; a mentett `1` az egyszerűbb.
- [ ] A `≥ 1` validáció és a „tájékoztató mező, nem szorzó" szemantika változatlan.
- [ ] Meglévő `null` értékű sorok kezelése (megjelenítési fallback vagy hagyni).

## Terv / döntési napló

_Kliensoldali form-default; nincs backend / séma hatás. A statisztikai számítások érintetlenek
(úgyis kísérlet-soronként számolnak)._

## Lezáráskor (on-done)

Mind a 4 napló-form `emptyRow()` factory-jában az `attemptCount` signal `null` helyett `1`-gyel
indul. A betöltött (mentett) sorok `attempt.attemptCount ?? null` maradnak — nem írjuk felül a
tárolt adatot. Nincs séma / backend / statisztika hatás (a számítások eddig sem szoroztak vele).

- Frissített specek: [[Mászónapló]] (`AscentAttempt.attemptCount` sor — új sor default `1`)
- `IMPLEMENTATION_STATUS.md` sor: 2026-09-09 — #91 `attemptCount` új-sor default 1
- Kód: `frontend/src/app/pages/workout/climbing/naplo/{indoor,outdoor}-{boulder,rope}-session-edit.page.ts`.
  Zöld gate ✓.
