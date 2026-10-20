---
id: 210
type: bug
status: done
title: Túra — a térkép elcsúszik, amikor a tipp-, a név- vagy a statisztika-sáv megjelenik
specs: []
flag: menu.tura
created: 2026-10-19
closed: 2026-10-20
---

# 210 — Túra — a térkép elcsúszik, amikor a tipp-, a név- vagy a statisztika-sáv megjelenik

## Motiváció / probléma

Rajzolás közben az első pont után megjelenik a névsáv és a statisztika-sáv; a térkép 50–90 px-et csúszik, így a következő koppintás nem oda kerül, ahová a felhasználó célzott.

Forrás: a 2026-10-19-i emulátoros UX-teszt (LM2_Phone, 360 dp, magyar felület), a felhasználó visszajelzése alapján: „eléggé átláthatatlan… a gombok nem egyértelműek… a térképen random színes vonalakat látok”.

## Jelenlegi működés

- A sávok `ion-header` / `ion-footer` részei, ezért megjelenésükkor a térkép-konténer átméreteződik, és a MapLibre a középpontot tartja → a tartalom elmozdul.
- Emulátoron mérve: a statisztika-sáv megjelenésekor ~90 px (display) elmozdulás, a tippsávnál ~56 css px.

## Elfogadási kritériumok

- [x] Új sáv megjelenésekor a térkép tartalma nem mozdul el a képernyőn (pl. lebegő sávok a térkép fölött, vagy átméretezéskor az eltolás kompenzálása).
- [x] Emulátoron ellenőrizve: Rajzolás módban két gyors koppintás pontosan a koppintott helyre teszi a pontokat.

## Terv / döntési napló

- 2026-10-19 — felvéve a felhasználó kérésére az emulátoros UX-teszt észrevételeiből.
- 2026-10-20 — megoldás: a tipp-, név- és statisztika-sáv a térkép fölött lebegő kártya lett (nem `ion-header` / `ion-footer`), így megjelenésükkor a térkép-konténer mérete nem változik, a tartalom nem mozdul. A név-mező `autofocus`-a megszűnt, így a 2. pont után nem nyílik fel a billentyűzet sem.
- 2026-10-20 — emulátoron: Kézi módban három gyors koppintás (0,3 s szünettel), a 2. után megjelent a kártya — mindhárom pont pontosan a koppintott helyre került (a képernyőképen a pontok a koppintási koordinátákon).

## Lezáráskor (on-done)

- Frissített specek: **nincs** — a túra spec a [[102-tura-utvonaltervezo-attekintes]] szerint a család végén készül.
- `IMPLEMENTATION_STATUS.md` sor: 2026-10-20 — #204, #205, #206, #210
- Kód: `frontend/src/app/pages/menu/tura/tura.page.ts|html|scss`, `auto-route-hint.component.ts` (+ spec), `route-draft.ts` (+ spec), `src/global.scss`, `core/config/icons.ts`, `assets/i18n/{hu,en}.json`
