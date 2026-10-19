---
id: 196
type: feature
status: backlog
title: Túra — a térképen nincs jelmagyarázat a vonalak és pontok színeihez
specs: []
flag: menu.tura
created: 2026-10-19
closed:
---

# 196 — Túra — a térképen nincs jelmagyarázat a vonalak és pontok színeihez

## Motiváció / probléma

A térképen egyszerre hat-hét különböző jelentésű szín látszik, és sehol nincs leírva, melyik mit jelent — a felhasználó „random színes vonalaknak” látja őket.

Forrás: a 2026-10-19-i emulátoros UX-teszt (LM2_Phone, 360 dp, magyar felület), a felhasználó visszajelzése alapján: „eléggé átláthatatlan… a gombok nem egyértelműek… a térképen random színes vonalakat látok”.

## Jelenlegi működés

- Turistaút-szakaszok: piros / kék / zöld / sárga a jelzés színe szerint, minden más szürke (`trail-segment-symbol-color.ts`).
- Saját mentett útvonalak: kék `#1a73e8`; rajz-piszkozat: narancs szaggatott `#ff6f00`; piszkozat-pontok: narancs kör;
  automatikus mód kezdőpontja: lila `#8e24aa`; katalógus-előnézet: ciánkék `#00bcd4` (`tura.page.ts` `map.on('load')`).
- Sem a Rétegek panel, sem a térkép nem magyarázza ezeket.

## Elfogadási kritériumok

- [ ] Elérhető jelmagyarázat (pl. a Rétegek panelben vagy egy térképre tett „i” / jelmagyarázat-gombbal), ami minden ma használt vonal- és pontszínt megnevez, hu + en.
- [ ] A turistajelzés-színeknél a jelzés neve is szerepel (pl. „piros sáv”, „kék kereszt”), összhangban a [[198-tura-ismert-jelzestipusok-szurken]] színtáblájával.
- [ ] A jelmagyarázat a térképet nem takarja tartósan (bezárható / összecsukható).

## Terv / döntési napló

- 2026-10-19 — felvéve a felhasználó kérésére az emulátoros UX-teszt észrevételeiből.

## Lezáráskor (on-done)

- Frissített specek: <a túra spec, ha addigra elkészült — [[102-tura-utvonaltervezo-attekintes]]>
- `IMPLEMENTATION_STATUS.md` sor: <dátum> — #196
- Kód: `frontend/src/app/pages/menu/tura/tura.page.ts|html|scss`
