---
id: 210
type: bug
status: backlog
title: Túra — a térkép elcsúszik, amikor a tipp-, a név- vagy a statisztika-sáv megjelenik
specs: []
flag: menu.tura
created: 2026-10-19
closed:
---

# 210 — Túra — a térkép elcsúszik, amikor a tipp-, a név- vagy a statisztika-sáv megjelenik

## Motiváció / probléma

Rajzolás közben az első pont után megjelenik a névsáv és a statisztika-sáv; a térkép 50–90 px-et csúszik, így a következő koppintás nem oda kerül, ahová a felhasználó célzott.

Forrás: a 2026-10-19-i emulátoros UX-teszt (LM2_Phone, 360 dp, magyar felület), a felhasználó visszajelzése alapján: „eléggé átláthatatlan… a gombok nem egyértelműek… a térképen random színes vonalakat látok”.

## Jelenlegi működés

- A sávok `ion-header` / `ion-footer` részei, ezért megjelenésükkor a térkép-konténer átméreteződik, és a MapLibre a középpontot tartja → a tartalom elmozdul.
- Emulátoron mérve: a statisztika-sáv megjelenésekor ~90 px (display) elmozdulás, a tippsávnál ~56 css px.

## Elfogadási kritériumok

- [ ] Új sáv megjelenésekor a térkép tartalma nem mozdul el a képernyőn (pl. lebegő sávok a térkép fölött, vagy átméretezéskor az eltolás kompenzálása).
- [ ] Emulátoron ellenőrizve: Rajzolás módban két gyors koppintás pontosan a koppintott helyre teszi a pontokat.

## Terv / döntési napló

- 2026-10-19 — felvéve a felhasználó kérésére az emulátoros UX-teszt észrevételeiből.

## Lezáráskor (on-done)

- Frissített specek: <a túra spec, ha addigra elkészült — [[102-tura-utvonaltervezo-attekintes]]>
- `IMPLEMENTATION_STATUS.md` sor: <dátum> — #210
- Kód: `frontend/src/app/pages/menu/tura/tura.page.ts|html|scss`
