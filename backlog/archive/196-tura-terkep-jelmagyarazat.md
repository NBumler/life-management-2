---
id: 196
type: feature
status: done
title: Túra — a térképen nincs jelmagyarázat a vonalak és pontok színeihez
specs: []
flag: menu.tura
created: 2026-10-19
closed: 2026-10-20
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

- [x] Elérhető jelmagyarázat (pl. a Rétegek panelben vagy egy térképre tett „i” / jelmagyarázat-gombbal), ami minden ma használt vonal- és pontszínt megnevez, hu + en.
- [x] A turistajelzés-színeknél a jelzés neve is szerepel (pl. „piros sáv”, „kék kereszt”), összhangban a [[198-tura-ismert-jelzestipusok-szurken]] színtáblájával.
- [x] A jelmagyarázat a térképet nem takarja tartósan (bezárható / összecsukható).

## Terv / döntési napló

- 2026-10-19 — felvéve a felhasználó kérésére az emulátoros UX-teszt észrevételeiből.
- 2026-10-20 — `TuraLegendComponent`: a Rétegek panel alján és a zoom-felirat „i” gombjával nyíló félmagas lapon (bezárható). Turistajelzések színenként („Piros jelzés” … „Fehér jelzés”) egy megjegyzéssel, hogy az alakzat (sáv, kereszt, pont, háromszög, kör, rom, barlang, kilátó…) a vonalon nem látszik — a #198 döntésével összhangban; vonalak (jelzés nélküli út, saját útvonal, piszkozat, előnézet, haladási irány); pontok (indulás, cél, napváltó, kijelölt pont). A minták a térképpel azonos színek és ugyanazok a képek. hu + en.
- 2026-10-20 — emulátoron ellenőrizve (az ikonok betöltődnek, a lap görgethető).

## Lezáráskor (on-done)

- Frissített specek: **nincs** — a túra spec a [[102-tura-utvonaltervezo-attekintes]] szerint a család végén készül.
- `IMPLEMENTATION_STATUS.md` sor: 2026-10-20 — #196, #197, #198, #199, #200, #202, #203
- Kód: `frontend/src/app/pages/menu/tura/tura-legend.component.ts|html|scss`, `assets/i18n/{hu,en}.json` (`TURA.LEGEND.*`)
