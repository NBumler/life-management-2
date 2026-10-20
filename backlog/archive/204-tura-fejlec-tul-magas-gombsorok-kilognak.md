---
id: 204
type: change-request
status: done
title: Túra — a fejléc 3–5 sor magas, a gombsorok magyarul kilógnak a képernyőről
specs: []
flag: menu.tura
created: 2026-10-19
closed: 2026-10-20
---

# 204 — Túra — a fejléc 3–5 sor magas, a gombsorok magyarul kilógnak a képernyőről

## Motiváció / probléma

A cím + két gombsor + tippsáv / előnézet-sáv + névsáv a 360 dp-s képernyő jelentős részét elveszi a térképtől, és magyarul a gombok nem férnek ki: a kuka és az „ÚTVONALAIM” félig le van vágva, a vízszintes görgetés nem látszik.

Forrás: a 2026-10-19-i emulátoros UX-teszt (LM2_Phone, 360 dp, magyar felület), a felhasználó visszajelzése alapján: „eléggé átláthatatlan… a gombok nem egyértelműek… a térképen random színes vonalakat látok”.

## Jelenlegi működés

- `tura.page.html`: `ion-header` = cím-toolbar + 2× `tura-scrollable-toolbar` + feltételes tipp / előnézet / név toolbar.
- 360 dp-n (Galaxy A55 szélesség) magyarul: 1. sor „RAJZOLÁS” 117 px + „AUTOMATIKUS” 147 px + 2 ikon → túlnyúlik; 2. sor „ÚTVONALAIM” a jobb szélen levágva.
- Alul a statisztika-sáv + a tab-sáv további helyet foglal.

## Elfogadási kritériumok

- [x] A térkép 360 dp-n is a képernyő túlnyomó részét kapja (célérték a naplóban, pl. ≥ 65%).
- [x] Minden gomb látható vagy egyértelműen elérhető (nincs rejtett vízszintes görgetés); hu és en felületen is.
- [x] Javaslat: egyetlen gombsor a fő műveletekkel, a ritkábbak (rétegek, offline, katalógus, útvonalaim) egy „…” menüben vagy lebegő gombként a térképen — döntés a naplóban.

## Terv / döntési napló

- 2026-10-19 — felvéve a felhasználó kérésére az emulátoros UX-teszt észrevételeiből.
- 2026-10-20 — döntés: a felhasználó két ASCII-vázlat (alapállapot nyitott „Továbbiak” menüvel; Kézi mód piszkozattal) alapján jóváhagyta az elrendezést, a „Kézi” / „Turistaúton” elnevezést és hogy mindkét mód bekapcsolva marad.
- 2026-10-20 — megvalósítva: a fejlécben csak a vissza-gomb és a cím maradt; a térkép a fejléctől a tab-sávig ér. Jobb felül lebegő, feliratos „Rétegek” és „Továbbiak” gomb (a menüben: Ajánlott túrák, Útvonalaim, Offline területek — utóbbi csak az appban), alattuk a MapLibre +/− / iránytű. Alul lebegő mód-sáv négy egyforma gombbal, fölötte egy kártya: előnézet, a mód tippje, a piszkozat statisztikája + profil, név + Napok + Mentés. Az attribúció (OSM-licenc) sora a sáv alatt látható marad. Amíg előnézet látszik, a kártya csak azt mutatja, és az előnézet kilép a módból.
- 2026-10-20 — mérés (emulátor, 360 dp, 732 css px magas nézet): a térkép-konténer 619 px = **85%**; alapállapotban a mód-sáv alatti takaratlan rész 523 px = **71%** (cél ≥ 65%); piszkozat-kártyával kb. 48%. Nincs vízszintes görgetés, minden gomb látszik hu és en felületen.
- 2026-10-20 — a `fitBounds` (előnézet, Útvonalaim) a lebegő gombok és az alsó kártya közötti szabad részre igazít (`fitPadding`); a kártya magasságváltozását a meglévő ResizeObserver figyeli az előnézet-rávezetéshez. Emulátoron: az S (Esztergom – Pilisvörösvár – Csíki csárda) előnézet a két réteg között látszik.

## Lezáráskor (on-done)

- Frissített specek: **nincs** — a túra spec a [[102-tura-utvonaltervezo-attekintes]] szerint a család végén készül.
- `IMPLEMENTATION_STATUS.md` sor: 2026-10-20 — #204, #205, #206, #210
- Kód: `frontend/src/app/pages/menu/tura/tura.page.ts|html|scss`, `auto-route-hint.component.ts` (+ spec), `route-draft.ts` (+ spec), `src/global.scss`, `core/config/icons.ts`, `assets/i18n/{hu,en}.json`
