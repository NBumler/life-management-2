---
id: 158
type: change-request
status: done
title: Karma tesztek — ~4500 sor Ionicons warning / URL TypeError zaj megszüntetése
specs:
  - "[[Fejlesztői környezet]]"
flag:
created: 2026-10-17
closed: 2026-10-17
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

- [x] `src/test.ts` meghívja a `registerIcons()`-t (ugyanaz a registry, mint az appban).
- [x] `test:ci` kimenetében 0 `Ionicons Warning` és 0 `Failed to construct 'URL'` sor.
- [x] (Javasolt) nem regisztrált ikon → a spec bukjon (pl. `console.warn` spy a
      `[Ionicons Warning]` prefixre egy globális `afterEach`-ben), hogy egy registryből
      kifelejtett ikon tesztben derüljön ki, ne a készüléken.
- [x] A maradék konzol-üzenetek (pl. `[steps] STEPS_LOW pre-notification Health Connect read
      failed` a hibaág-tesztekben) átnézve; ami nem szándékos, elnémítva vagy spy-olva.

## Terv / döntési napló

`registerIcons()` a `test.ts`-ben; `console.warn` wrapper gyűjti az `[Ionicons Warning]` sorokat, globális
`afterEach` `fail()`-el. Az ion-icon lazy tölt, így a hiba ritkán a következő specre csúszik — elfogadva, a
cél a futás bukása. Eredmény: 0 Ionicons / 0 URL TypeError sor, a futás ~37 s → ~18 s. A maradék
`[steps] STEPS_LOW … Health Connect read failed` ERROR egy szándékos hibaág-teszt kimenete, maradt.

## Lezáráskor (on-done)

- Frissített specek: [[Fejlesztői környezet]] — teszt-futtatás szakasz: ikon-registry betöltés + bukás ismeretlen ikonra; [[Frontend]] „Kötelező elvek”
- `IMPLEMENTATION_STATUS.md` sor: 2026-10-17 — Karma ikon-zaj megszűnt, ismeretlen ikon bukja a specet
- Kód: `frontend/src/test.ts`
