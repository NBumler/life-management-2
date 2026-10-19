---
id: 219
type: change-request
status: backlog
title: Túra — a magasságprofil-grafikonon nincs tengely és skála
specs: []
flag: menu.tura
created: 2026-10-19
closed:
---

# 219 — Túra — a magasságprofil-grafikonon nincs tengely és skála

## Motiváció / probléma

A grafikon mindig kitölti a sávot, így egy 50 m-es és egy 500 m-es különbség ugyanúgy néz ki; nem látszik a minimum / maximum magasság és a táv.

Forrás: a 2026-10-19-i emulátoros UX-teszt (LM2_Phone, 360 dp, magyar felület), a felhasználó visszajelzése alapján: „eléggé átláthatatlan… a gombok nem egyértelműek… a térképen random színes vonalakat látok”.

## Jelenlegi működés

- `elevation-profile-svg.ts` → `polyline`, `preserveAspectRatio="none"`, felirat nélkül.

## Elfogadási kritériumok

- [ ] A profil mellett látszik a minimum és maximum magasság (m), és a táv-tengely (legalább a kezdő- és végérték).
- [ ] Többnapos útvonalnál a napváltók jelölve a profilon.

## Terv / döntési napló

- 2026-10-19 — felvéve a felhasználó kérésére az emulátoros UX-teszt észrevételeiből.

## Lezáráskor (on-done)

- Frissített specek: <a túra spec, ha addigra elkészült — [[102-tura-utvonaltervezo-attekintes]]>
- `IMPLEMENTATION_STATUS.md` sor: <dátum> — #219
- Kód: `frontend/src/app/pages/menu/tura/elevation-profile-svg.ts` (+ spec), `tura.page.html|scss`
