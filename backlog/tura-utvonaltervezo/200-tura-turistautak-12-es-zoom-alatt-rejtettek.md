---
id: 200
type: change-request
status: backlog
title: Túra — 12-es közelítés alatt egyetlen turistaút sem látszik, és ezt semmi nem jelzi
specs: []
flag: menu.tura
created: 2026-10-19
closed:
---

# 200 — Túra — 12-es közelítés alatt egyetlen turistaút sem látszik, és ezt semmi nem jelzi

## Motiváció / probléma

A térkép országnézetben nyílik (zoom 7), ahol a turistaút-réteg üres. A felhasználó nem tudja, hogy rá kell közelítenie; 12-es zoomnál viszont hirtelen minden szakasz megjelenik („minden vagy semmi”).

Forrás: a 2026-10-19-i emulátoros UX-teszt (LM2_Phone, 360 dp, magyar felület), a felhasználó visszajelzése alapján: „eléggé átláthatatlan… a gombok nem egyértelműek… a térképen random színes vonalakat látok”.

## Jelenlegi működés

- `MIN_TRAIL_SEGMENT_ZOOM = 12` (#180): ez alatt a réteg `minzoom` miatt nem rajzol, és `loadCurrentViewport` nem is kér adatot.
- Nincs „Közelíts rá a turistautakhoz” jelzés.

## Elfogadási kritériumok

- [ ] 12-es zoom alatt egy nem tolakodó jelzés mondja, hogy a turistautak közelebbről látszanak (hu + en).
- [ ] Megvizsgálva egy átmenet: alacsonyabb zoomon csak a fő (pl. országos kék / piros) jelzések, vagy előre generált, egyszerűsített áttekintő réteg — a #180 teljesítménykorlátját nem visszahozva. Döntés a naplóban.

## Terv / döntési napló

- 2026-10-19 — felvéve a felhasználó kérésére az emulátoros UX-teszt észrevételeiből.

## Lezáráskor (on-done)

- Frissített specek: <a túra spec, ha addigra elkészült — [[102-tura-utvonaltervezo-attekintes]]>
- `IMPLEMENTATION_STATUS.md` sor: <dátum> — #200
- Kód: `frontend/src/app/pages/menu/tura/tura.page.ts|html|scss`
