---
id: 91
type: change-request
status: backlog
title: Mászás — a „Próbák (ebben a sessionben)" (attemptCount) input alapértéke legyen 1
specs:
  - "[[Mászónapló]]"
  - "[[Indoor boulder napló]]"
  - "[[Indoor köteles napló]]"
  - "[[Outdoor boulder napló]]"
  - "[[Outdoor köteles napló]]"
flag:
created: 2026-09-09
closed:
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

- Frissített specek: [[Mászónapló]] (`AscentAttempt.attemptCount` — default 1), a 4 napló spec
  ha a UI/UX sor pontosul
- `IMPLEMENTATION_STATUS.md` sor: <dátum> — <mit>
- Kód: frontend `naplo/*-session-edit.page.ts` (attempt-sor init), érintett `*.spec.ts`
