---
id: 206
type: change-request
status: backlog
title: Túra — a Rajzolás és az Automatikus mód közti különbség és az aktív mód nem érthető
specs: []
flag: menu.tura
created: 2026-10-19
closed:
---

# 206 — Túra — a Rajzolás és az Automatikus mód közti különbség és az aktív mód nem érthető

## Motiváció / probléma

A felhasználó nem tudja, mi a különbség a két mód között, mikor melyik aktív, és mit vár tőle az app.

Forrás: a 2026-10-19-i emulátoros UX-teszt (LM2_Phone, 360 dp, magyar felület), a felhasználó visszajelzése alapján: „eléggé átláthatatlan… a gombok nem egyértelműek… a térképen random színes vonalakat látok”.

## Jelenlegi működés

- Automatikus módban tippsáv van („Válaszd ki a kezdőpontot / végpontot a térképen.”), Rajzolásnál nincs.
- Az aktív mód sötétszürke kitöltést kap (`fill="solid"`), ami nem a kiemelő szín.
- Az Automatikus mód egy sikeres tervezés után szó nélkül kikapcsol; Rajzolás bekapcsolva marad.
- Rajzolás közben a pontok egyenes vonallal kötődnek, ezt semmi nem mondja.

## Elfogadási kritériumok

- [ ] Mindkét módnak van rövid tippje (Rajzolás: „Koppints a térképre pontok lerakásához — egyenes szakaszok”; Automatikus: a mai szöveg) hu + en.
- [ ] Az aktív mód egyértelműen kiemelt (szín, és pl. a tippsávban a mód neve).
- [ ] A mód kilépése következetes: vagy mindkettő bekapcsolva marad, amíg ki nem kapcsolod, vagy mindkettő jelzi, hogy kilépett — döntés a naplóban.
- [ ] Megfontolva a megnevezés (pl. „Kézi” / „Turistaúton”) — döntés a naplóban.

## Terv / döntési napló

- 2026-10-19 — felvéve a felhasználó kérésére az emulátoros UX-teszt észrevételeiből.

## Lezáráskor (on-done)

- Frissített specek: <a túra spec, ha addigra elkészült — [[102-tura-utvonaltervezo-attekintes]]>
- `IMPLEMENTATION_STATUS.md` sor: <dátum> — #206
- Kód: `frontend/src/app/pages/menu/tura/tura.page.ts|html|scss`, `auto-route-hint.component.ts`, `assets/i18n/{hu,en}.json`
