---
id: 165
type: feature
status: ready
title: Sablon „Rotációban” kapcsoló — aktív, de csak kézzel indítható sablonok
specs:
  - "[[Heti terv]]"
  - "[[Edzésnapló]]"
flag:
created: 2026-10-17
closed:
---

# 165 — Sablon „Rotációban” kapcsoló — aktív, de csak kézzel indítható sablonok

## Motiváció / probléma

Az aktív sablonok mind részt vesznek a rotációs előrejelzésben (`backlog/139`, `backlog/144`). Egy
fókusz-csoport (pl. „OAPU”: húzás + nyomás) jól rotálódik, de néha-néha kell egy-egy **rendszertelen**
extra edzés is (pl. mászás miatt kivételesen egy ujjerő-edzés). Ha ezt a sablont aktiválom, bekerül a
rotációba és eltolja az A/B sorrendet; ha inaktív, nem is kínálja fel sem a heti kézi beállítás, sem a
„Terv indítása…”. Hiányzik a köztes állapot: **aktív, felkínálható, de nem rotálódik**.

## Jelenlegi működés

[[Heti terv]] „Aktív / inaktív sablonok” + „Rotációs előrejelzés”: a rotáció és a pickerek ugyanazt
a halmazt használják (aktív, nem törölt sablonok — `rotationOrder` a `rotation-suggestion.ts`-ben,
`WorkoutPlanRepository.activePlans()` a pickerekben).

## Elfogadási kritériumok

- [ ] Új `WorkoutPlan.inRotation` boolean mező, alapértelmezés `true` (új sablon és minden meglévő
      sablon is) — a mostani rotáció változatlan marad. Backend (Flyway, OpenAPI, mapper), helyi
      SQLite séma, outbox payload migráció (sorban álló régi mentések `inRotation: true`-t kapnak).
- [ ] A rotációs előrejelzés (heti nézet mai / jövőbeli sorai, [[Edzésnapló]] gyorsindító javaslata,
      mászás előtti ujjmentes választás) csak az `active && inRotation` élő sablonokat veszi
      figyelembe.
- [ ] A pickerek (heti kézi felülíró menü, „Terv indítása…”) továbbra is **minden aktív** sablont
      felkínálnak, a rotáción kívülieket is.
- [ ] Rotáción kívüli sablonra adott kézi felülírás érvényes (a nap az a sablon), és a többi napon a
      rotáció onnan folytatódik, ahol tartott.
- [ ] Rotáción kívüli sablonból rögzített edzés **terhelő nap** (blokklimit, terhelés-figyelmeztetések),
      de a rotáció A/B sorrendjét nem tolja el.
- [ ] Ha van aktív sablon, de egyik sincs rotációban, a szabad nap pihenőnap (mint aktív sablon nélkül);
      a kézi indítás működik.
- [ ] A csoport-műveletek (`backlog/140`) csak az `active` mezőt állítják, az `inRotation`-t nem.
- [ ] Sablon-szerkesztő: „Rotációban” kapcsoló rövid magyarázattal. Sablon lista: „Rotáción kívül”
      jelvény az érintett sorokon.
- [ ] Specek frissítve ([[Heti terv]], [[Edzésnapló]] ahol hivatkozik), Backend-offline szakasz
      (outbox payload verzió).

## Terv / döntési napló

- 2026-10-17 — Két független kapcsoló (`active` + `inRotation`), nem egy háromállású státusz: egyszerűbb,
  és a csoport-aktiválás (`backlog/140`) változatlan maradhat. (Felhasználói döntés.)
- 2026-10-17 — A rotáción kívüli edzés terhelő napnak számít (utána is kell pihenő). A rotáció sorrendjét
  magától nem érinti, mert az sablononként az utolsó session dátumát nézi. (Felhasználói döntés.)

## Lezáráskor (on-done)

- Frissített specek: [[Heti terv]] — `inRotation` mező, rotáció vs. picker halmaz; [[Edzésnapló]] — „Terv indítása…”
- `IMPLEMENTATION_STATUS.md` sor: 2026-10-17 — #165 sablon „Rotációban” kapcsoló
- Kód: `workout` (backend), `pages/workout/rotation-suggestion.ts`, `pages/workout/plan/`, local schema, outbox migrator
