---
id: 11
type: bug
status: done
title: Auth: sikertelen csendes refresh utan nincs aktiv atiranyitas a login kepernyore
specs:
  - "[[Bejelentkezés]]"
flag:
created: 2026-09-02
closed: 2026-09-03
---

# 11 — Auth: sikertelen csendes refresh utan nincs aktiv atiranyitas a login kepernyore

## Motiváció / probléma

Sikertelen csendes refresh utan a session torlodik, de a user csak a kovetkezo guardolt navigacional kerul /login-ra.

Forrás: dokumentáció ↔ implementáció audit (2026-09-02), lásd `backlog/audit/`.

## Jelenlegi működés

`TokenRefreshCoordinatorService.doRefresh()` catch-ága (és a `SyncEngine` 401 →
`stop-auth` ága) meghívja az `AuthSessionService.clear()`-t, ami `null`-ra állítja
a session signalt — de semmi nem navigál. A user a most már nem-autentikált
képernyőn marad a következő `authGuard`-olt navigációig.

## Elfogadási kritériumok

- [x] Sikertelen csendes refresh után a user aktívan a `/login` képernyőre kerül (nem a következő guardolt navigációkor).
- [x] A redirect csak az autentikált → nem-autentikált átmenetre lép; kijelentkezett cold start nem vált ki második navigációt; `/login`-on állva nincs újra-navigáció.
- [x] `app.component.spec.ts` lefedi: átmenet → `/login`; cold start kijelentkezve → nincs nav; már `/login`-on → nincs nav.
- [x] `npm run lint` + `npm run test:ci` (1447) + `npm run build` zöld.
- [x] Az érintett spec(ek) `### Jelenlegi működés` szakasza a leszállított viselkedést írja le.

## Terv / döntési napló

- A javítás nem a két hívási helyre (coordinator + sync-engine) szórva, hanem
  egyetlen reaktív `effect` az `AppComponent`-ben az `isAuthenticated()` jelre —
  DRY, illik a „UI oldal signal-alapú" konvencióhoz, és minden jövőbeli
  `clear()` hívót is fed.
- Átmenet-szűrés egy sima `wasAuthenticated` mezővel (az `effect` nem ad előző
  értéket): csak `true → false` navigál, így a kijelentkezett cold startot
  (amit az `authGuard` kezel) nem duplázza.
- Nincs `returnUrl` — az `authGuard` is sima `parseUrl('/login')`-t ad, ezzel
  tartja a paritást.

## Lezáráskor (on-done)

- Frissített specek: [[Bejelentkezés]] — `#### Session` bullet + Architektúra → Frontend sor jelen időbe (aktív `/login` redirect); frontmatter `verifikalva: 2026-09-03`, `verifikalt_commit: a72c86f`.
- `IMPLEMENTATION_STATUS.md` sor: 2026-09-03 — #011 aktív `/login` átirányítás sikertelen csendes refresh után.
- Kód: `frontend/src/app/app.component.ts` (+ `app.component.spec.ts`); fix commit `a72c86f`.
