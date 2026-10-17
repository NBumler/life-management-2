---
id: 158
type: change-request
status: ready
title: Karma tesztek — ~4500 sor Ionicons warning / URL TypeError zaj megszüntetése
specs:
  - "[[Fejlesztői környezet]]"
flag:
created: 2026-10-17
closed:
---

# 158 — Karma tesztek — ~4500 sor Ionicons warning / URL TypeError zaj megszüntetése

## Motiváció / probléma

A `npm run test:ci` zöld (1964/1964), de a kimenet ~33 ezer sor, ebből **4492 konzol-üzenet**
egyetlen okra vezethető vissza:

- 2246 × `WARN: '[Ionicons Warning]: Could not load icon with name "…"'` (32 különböző ikon,
  pl. `help-circle-outline` 451×, `add-outline` 200×),
- 2246 × párosan hozzá `LOG: 'e', TypeError: Failed to construct 'URL': Invalid base URL`
  (az Ionicons a nem regisztrált ikont asset-URL-ről próbálná betölteni).

Ok: a `registerIcons()` csak a `src/main.ts`-ben fut, a `src/test.ts` nem hívja, így minden
`<ion-icon>`-t renderelő spec „ismeretlen ikont” lát. A zaj elfedi a valódi figyelmeztetéseket
(pl. a `[jasmine] slow spec` jelzést, backlog/147) és a valódi hiányzó ikonokat
(ld. [[157-hianyzo-ikonok-az-ikon-registrybol]]).

## Jelenlegi működés

`src/test.ts`: csak a TestBed-init és a seed/slow-spec reporter; ikonregisztráció nincs.

## Elfogadási kritériumok

- [ ] `src/test.ts` meghívja a `registerIcons()`-t (ugyanaz a registry, mint az appban).
- [ ] `test:ci` kimenetében 0 `Ionicons Warning` és 0 `Failed to construct 'URL'` sor.
- [ ] (Javasolt) nem regisztrált ikon → a spec bukjon (pl. `console.warn` spy a
      `[Ionicons Warning]` prefixre egy globális `afterEach`-ben), hogy egy registryből
      kifelejtett ikon tesztben derüljön ki, ne a készüléken.
- [ ] A maradék konzol-üzenetek (pl. `[steps] STEPS_LOW pre-notification Health Connect read
      failed` a hibaág-tesztekben) átnézve; ami nem szándékos, elnémítva vagy spy-olva.

## Terv / döntési napló

_—_

## Lezáráskor (on-done)

- Frissített specek: [[Fejlesztői környezet]] — teszt-futtatás szakasz, ha a „bukik ismeretlen ikonra” szabály bekerül
- `IMPLEMENTATION_STATUS.md` sor: …
- Kód: `frontend/src/test.ts`
