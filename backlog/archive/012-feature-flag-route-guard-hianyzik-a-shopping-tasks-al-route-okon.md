---
id: 12
type: bug
status: done
title: Feature-flag route-guard hianyzik a shopping + tasks al-route-okon
specs:
  - "[[Bevásárlás]]"
  - "[[Tennivalók]]"
  - "[[Frontend]]"
flag:
created: 2026-09-02
closed: 2026-09-03
---

# 12 — Feature-flag route-guard hianyzik a shopping + tasks al-route-okon

## Motiváció / probléma

A menu.bevasarlas es a harom feladatok.* csempe-flag csak a menu/hub csempet rejti, a /tabs/menu/shopping* es a Feladatok al-route-ok deep-linkkel elerhetok maradnak. Minden testver menu-route fel van guardolva; az app.routes.ts komment is 'gyerek route-ok is guardoltak'-at ir elo.

Forrás: dokumentáció ↔ implementáció audit (2026-09-02), lásd `backlog/audit/`.

## Jelenlegi működés

Lásd a motivációt + a hivatkozott spec(ek) `### Jelenlegi működés` szakaszát.

## Elfogadási kritériumok

- [x] `app.routes.ts`: a `/tabs/menu/shopping` route-fa tetején `featureFlagGuard('menu.bevasarlas')`;
      a `/tabs/tasks/{life-plans,events,calendar}` route-fák tetején
      `featureFlagGuard('feladatok.{eletTervek,esemenyek,naptar}')`. A `household` al-route-nak
      nincs saját flagje — a `tab.feladatok` fedi (a `tasks` tab-gyökéren már guardolt).
- [x] Guard-viselkedés: letiltott flag → `/tabs/menu` (a `featureFlagGuard` meglévő
      redirect-célja, konzisztens a `finance` / `aycm` fákkal).
- [x] Új `app.routes.spec.ts`: mind a négy útra „flag ki → `/tabs/menu`" és „flag be → aktiválható".
- [x] `npm run lint` + teljes `npm run test:ci` (1442) + `npm run build` zöld.
- [x] Specek `### Jelenlegi működés` / Frontend szakasz a leszállított viselkedést írja le; a
      „még nincs `featureFlagGuard` mögött" mondatok + a `backlog/012…` pointerek törölve.

## Terv / döntési napló

- **2026-09-03:** a `gear` (`menu.gearcheck`) menü-al-oldal **ugyanezt** a hibát mutatja
  (route-fa guard nélkül), de a jegy scope-ja a shopping + tasks — külön jegy:
  `backlog/064-feature-flag-route-guard-hianyzik-a-gear-menu-al-route-fan.md`.
- A guard a **route-fa tetején** ül (nem minden levélen), a már meglévő `finance` / `aycm`
  mintát követve — egy `canActivate`, a gyerekek öröklik.

## Lezáráskor (on-done)

- Frissített specek: [[Bevásárlás]] (Frontend szakasz), [[Tennivalók]] (Megjegyzések + Frontend
  szakasz), [[Frontend]] („Feature flag-ek → Mechanizmus" — guard a route-fa tetején, menü-al-oldal
  + Feladatok hub gyerekfák)
- `IMPLEMENTATION_STATUS.md` sor: 2026-09-03 — #012 featureFlagGuard a shopping + tasks al-route-fákon
- Kód: `frontend/src/app/app.routes.ts` (+ új `app.routes.spec.ts`)
