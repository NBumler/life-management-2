---
id: 212
type: feature
status: done
title: Túra — egy mentett útvonal megnyitása csak odarepíti a térképet: nincs részlet, szerkesztés, átnevezés
specs: []
flag: menu.tura
created: 2026-10-19
closed: 2026-10-20
---

# 212 — Túra — egy mentett útvonal megnyitása csak odarepíti a térképet: nincs részlet, szerkesztés, átnevezés

## Motiváció / probléma

A mentett útvonalakról az appban semmi nem derül ki a vonalon kívül, és utólag nem lehet őket módosítani.

Forrás: a 2026-10-19-i emulátoros UX-teszt (LM2_Phone, 360 dp, magyar felület), a felhasználó visszajelzése alapján: „eléggé átláthatatlan… a gombok nem egyértelműek… a térképen random színes vonalakat látok”.

## Jelenlegi működés

- Az Útvonalaim listában csak név (+ többnaposnál „N nap”) látszik; nincs táv, szint, dátum; a sorrend a tárolás sorrendje (az új a lista alján).
- Elemre koppintva `flyToRoute()`: `fitBounds`, a panel bezárul — nincs név, statisztika, profil, napbontás.
- Nincs szerkesztés (vonal, napok) és átnevezés; csak törlés.

## Elfogadási kritériumok

- [x] Az Útvonalaim lista elemein látszik a táv, ↑ és a létrehozás dátuma; a lista rendezett (pl. legújabb elöl).
- [x] Mentett útvonal megnyitásakor a név, a statisztika, a magasságprofil és a napbontás megjelenik.
- [x] A mentett útvonal szerkeszthető (betöltés a piszkozatba, mentés ugyanarra az id-re) és átnevezhető.
- [x] Offline-first: a módosítás a meglévő `HikeRoute` outbox-úton megy (új DTO-mező esetén `verify:outbox`).

## Terv / döntési napló

- 2026-10-19 — felvéve a felhasználó kérésére az emulátoros UX-teszt észrevételeiből.
- 2026-10-20 — megvalósítva: az Útvonalaim sorában táv · ↑ · dátum (a nyelv szerint, pl. „2026. okt. 20.” / „Oct 20, 2026”), a legújabb elöl. Koppintásra félmagas lap (`ion-modal` 0,45 / 0,9 fokozat; a kisebb fokozaton a térkép mellette kezelhető) a névvel, a dátummal, a statisztikával, a profillal (#219) és a napok listájával napi értékekkel; a térkép a lap fölötti részre igazít. A mentés utáni toast „Megnyitás” gombja is ezt a lapot nyitja.
- 2026-10-20 — dátum: a még nem szinkronizált útvonal is kap helyi `created_at`-et (`hikeRouteLocalWriteTask`, csak beszúráskor; az első pull a szerver értékére cseréli). A bevezetés előtt mentett, még nem szinkronizált soroknak nincs dátumuk — ezeknél a dátum nem jelenik meg, és a lista végére kerülnek.
- 2026-10-20 — „Szerkesztés”: az útvonal a piszkozatba kerül egy visszavonható csere-lépésként (`RouteDraftEditor.replace` — a visszavonás az előző rajzot a nevével, napváltóival együtt adja vissza), a kártyán „Mentett útvonal szerkesztése — a mentés felülírja.”, a régi vonal addig nem látszik. A mentés ugyanarra az id-re ír (a `HikeRouteRepository.save` meglévő upsertje); a szerkesztett id a helyben megőrzött piszkozattal (#213) együtt megmarad. A kijelölt pontok a két vég és a napváltók — a mentett útvonal a többit nem őrzi.
- 2026-10-20 — „Átnevezés”: név-prompt, `HikeRouteRepository.rename` (csak a név változik). Nincs DTO-változás, az outbox-séma v26 marad (`verify:outbox` OK).
- 2026-10-20 — emulátoron: „Teszt Pilis kor” szerkesztése és mentése után is 2 élő sor a helyi DB-ben, ugyanazzal az id-vel; új „Teszt212” mentése után dátummal a lista elején; átnevezés „Teszt212X”-re, a térképi felirat is frissült. hu + en.

## Lezáráskor (on-done)

- Frissített specek: **nincs** — a túra spec a [[102-tura-utvonaltervezo-attekintes]] szerint a család végén készül.
- `IMPLEMENTATION_STATUS.md` sor: 2026-10-20 — #212, #218, #219, #209, #201
- Kód: `frontend/src/app/pages/menu/tura/tura.page.ts|html|scss`, `route-details.component.*`, `elevation-profile.component.*`, `elevation-profile-svg.ts` (+ spec), `route-draft.ts` (+ spec), `core/data/hike-route.repository.ts` (+ spec), `core/data/local-rows.ts`, `core/data/tura-local-state.service.ts` (+ spec)
