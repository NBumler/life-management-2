---
id: 165
type: feature
status: done
title: Sablon „Rotációban” kapcsoló — aktív, de csak kézzel indítható sablonok
specs:
  - "[[Heti terv]]"
  - "[[Edzésnapló]]"
flag:
created: 2026-10-17
closed: 2026-10-17
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

- [x] Új `WorkoutPlan.inRotation` boolean mező, alapértelmezés `true` (új sablon és minden meglévő
      sablon is) — a mostani rotáció változatlan marad. Backend (Flyway, OpenAPI, mapper), helyi
      SQLite séma, outbox payload migráció (sorban álló régi mentések `inRotation: true`-t kapnak).
- [x] A rotációs előrejelzés (heti nézet mai / jövőbeli sorai, [[Edzésnapló]] gyorsindító javaslata,
      mászás előtti ujjmentes választás) csak az `active && inRotation` élő sablonokat veszi
      figyelembe.
- [x] A pickerek (heti kézi felülíró menü, „Terv indítása…”) továbbra is **minden aktív** sablont
      felkínálnak, a rotáción kívülieket is.
- [x] Rotáción kívüli sablonra adott kézi felülírás érvényes (a nap az a sablon), és a többi napon a
      rotáció onnan folytatódik, ahol tartott.
- [x] Rotáción kívüli sablonból rögzített edzés **terhelő nap** (blokklimit, terhelés-figyelmeztetések),
      de a rotáció A/B sorrendjét nem tolja el.
- [x] Ha van aktív sablon, de egyik sincs rotációban, a szabad nap pihenőnap (mint aktív sablon nélkül);
      a kézi indítás működik.
- [x] A csoport-műveletek (`backlog/140`) csak az `active` mezőt állítják, az `inRotation`-t nem.
- [x] Sablon-szerkesztő: „Rotációban” kapcsoló rövid magyarázattal. Sablon lista: „Rotáción kívül”
      jelvény az érintett sorokon.
- [x] Specek frissítve ([[Heti terv]], [[Edzésnapló]] ahol hivatkozik), Backend-offline szakasz
      (outbox payload verzió).

## Terv / döntési napló

- 2026-10-17 — Két független kapcsoló (`active` + `inRotation`), nem egy háromállású státusz: egyszerűbb,
  és a csoport-aktiválás (`backlog/140`) változatlan maradhat. (Felhasználói döntés.)
- 2026-10-17 — A rotáción kívüli edzés terhelő napnak számít (utána is kell pihenő). A rotáció sorrendjét
  magától nem érinti, mert az sablononként az utolsó session dátumát nézi. (Felhasználói döntés.)
- 2026-10-17 — `inRotation` kötelező mező (mint az `active`), nem opcionális: a TS-típus így nem `undefined`-os;
  a régi, sorban álló mentéseket az outbox v20 → v21 lépés pótolja. A lista „jelvénye” a sor alcímében egy
  „· Rotáción kívül” utótag (a lista oldalnak nincs saját stílusa).
- 2026-10-17 — Mellékjavítás: a `verify:outbox` hash CRLF → LF normalizál, mert egy friss Windows-worktree
  (autocrlf) minden entitást „változottnak” jelzett; a snapshot ezzel újragenerálva.

## Lezáráskor (on-done)

- Frissített specek: [[Heti terv]] — `inRotation` mező, rotáció vs. picker halmaz; [[Edzésnapló]] — „Terv indítása…”
- `IMPLEMENTATION_STATUS.md` sor: 2026-10-17 — #165 sablon „Rotációban” kapcsoló
- Kód: `workout` (backend), `pages/workout/rotation-suggestion.ts`, `pages/workout/plan/`, local schema, outbox migrator
