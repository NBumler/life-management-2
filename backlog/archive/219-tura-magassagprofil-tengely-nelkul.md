---
id: 219
type: change-request
status: done
title: Túra — a magasságprofil-grafikonon nincs tengely és skála
specs: []
flag: menu.tura
created: 2026-10-19
closed: 2026-10-20
---

# 219 — Túra — a magasságprofil-grafikonon nincs tengely és skála

## Motiváció / probléma

A grafikon mindig kitölti a sávot, így egy 50 m-es és egy 500 m-es különbség ugyanúgy néz ki; nem látszik a minimum / maximum magasság és a táv.

Forrás: a 2026-10-19-i emulátoros UX-teszt (LM2_Phone, 360 dp, magyar felület), a felhasználó visszajelzése alapján: „eléggé átláthatatlan… a gombok nem egyértelműek… a térképen random színes vonalakat látok”.

## Jelenlegi működés

- `elevation-profile-svg.ts` → `polyline`, `preserveAspectRatio="none"`, felirat nélkül.

## Elfogadási kritériumok

- [x] A profil mellett látszik a minimum és maximum magasság (m), és a táv-tengely (legalább a kezdő- és végérték).
- [x] Többnapos útvonalnál a napváltók jelölve a profilon.

## Terv / döntési napló

- 2026-10-19 — felvéve a felhasználó kérésére az emulátoros UX-teszt észrevételeiből.
- 2026-10-20 — megvalósítva: új `app-elevation-profile` komponens. Bal oldalt a legmagasabb és a legalacsonyabb pont (m), alatta a táv-tengely (0 és a teljes táv), a napváltóknál szaggatott függőleges vonal sorszámmal (a térkép hold-jelölőjének színével). A feliratok HTML-ben vannak (nem SVG-szövegként), így a nyújtott grafikon nem torzítja őket. A piszkozat lebegő kártyáján egy kis (32 px) változat a magasság-sávval; a teljes az útvonal-kártyán (#212 / #218 / #209).
- 2026-10-20 — tiszta függvények: `elevationProfileChart` (sáv, teljes táv, jelölők x-helye, a grafikonra szorítva) és `distancesAlongRoute` (napváltók távolsága az indulástól). Unit teszt: `elevation-profile-svg.spec.ts`.
- 2026-10-20 — emulátoron (360 dp, hu + en): „Teszt Pilis kor” 386–456 m, 0,0–2,0 km, az 1. napváltó jelölője a profilon ugyanott, ahol a térképen a hold; az S (Esztergom – Pilisvörösvár – Csíki csárda) két napváltóval.

## Lezáráskor (on-done)

- Frissített specek: **nincs** — a túra spec a [[102-tura-utvonaltervezo-attekintes]] szerint a család végén készül.
- `IMPLEMENTATION_STATUS.md` sor: 2026-10-20 — #212, #218, #219, #209, #201
- Kód: `frontend/src/app/pages/menu/tura/tura.page.ts|html|scss`, `route-details.component.*`, `elevation-profile.component.*`, `elevation-profile-svg.ts` (+ spec), `assets/i18n/{hu,en}.json`
