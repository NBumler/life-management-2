---
id: 215
type: feature
status: backlog
title: Túra — nincs „saját helyzetem” gomb és helykeresés
specs: []
flag: menu.tura
created: 2026-10-19
closed:
---

# 215 — Túra — nincs „saját helyzetem” gomb és helykeresés

## Motiváció / probléma

A tervezés kiindulópontját csak kézi nagyítással-húzással lehet megtalálni: nem lehet a saját helyzetre ugrani, és nem lehet települést / hegyet keresni.

Forrás: a 2026-10-19-i emulátoros UX-teszt (LM2_Phone, 360 dp, magyar felület), a felhasználó visszajelzése alapján: „eléggé átláthatatlan… a gombok nem egyértelműek… a térképen random színes vonalakat látok”.

## Jelenlegi működés

- A térképen csak a MapLibre nagyítás / tájolás vezérlő van.
- A GPS-réteg a #106 / #150 C fázis része; a POI-keresés a #108 része.

## Elfogadási kritériumok

- [ ] „Saját helyzetem” gomb a térképen (egyszeri helymeghatározás, engedélykéréssel; a háttér-követés nem része).
- [ ] Helykeresés (település / csúcs név szerint) — offline-first módon (pl. a #108 POI-adatból vagy build assetből), nem backend-proxyval. Döntés a naplóban, a [[108-tura-poi-adatbazis-ketura-belyegzok]]-vel összehangolva.

## Terv / döntési napló

- 2026-10-19 — felvéve a felhasználó kérésére az emulátoros UX-teszt észrevételeiből.

## Lezáráskor (on-done)

- Frissített specek: <a túra spec, ha addigra elkészült — [[102-tura-utvonaltervezo-attekintes]]>
- `IMPLEMENTATION_STATUS.md` sor: <dátum> — #215
- Kód: `frontend/src/app/pages/menu/tura/tura.page.ts|html|scss`
