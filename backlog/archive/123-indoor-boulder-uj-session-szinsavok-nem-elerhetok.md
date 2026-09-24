---
id: 123
type: bug
status: done
title: Indoor boulder — új sessionnél a terem színsávjai nem választhatók, csak grade adható meg
specs:
  - "[[Indoor boulder napló]]"
flag:
created: 2026-09-24
closed: 2026-09-24
---

# 123 — Indoor boulder — új sessionnél a terem színsávjai nem választhatók, csak grade adható meg

## Motiváció / probléma

Új beltéri boulder sessionnél a kísérletnél nem érhetők el a színek, csak a grade-et lehet
megadni — holott a teremhez vannak színsávok felvéve. Színsávos teremben a szín az elsődleges
bevitel, a grade csak alternatíva.

## Jelenlegi működés

[[Indoor boulder napló]] szerint a `colorBandId` „ha van → elsődleges gyorsválasztás", és „szín-sáv
chip-ek a kiválasztott teremből; mellettük szöveges grade".

Kód (`pages/workout/climbing/naplo/indoor-boulder-session-edit.page.{ts,html}`): a színsáv-választó
egy `ion-select`, ami csak `@if (bands().length > 0)` esetén renderelődik; `bands` =
`bandRepository.forGym(gymIdValue())`, ahol `gymIdValue` a `gymId` form-control `valueChanges`-éből
készült signal. Új sessionnél a terem az utoljára használt teremmel töltődik elő
(`form.patchValue` a `load()`-ok után). Az `app-grade-input` mindig látszik.

Két eltérés a spectől:
1. A jelenség szerint a választó nem jelenik meg (vagy nem használható), holott vannak sávok.
2. A spec chip-eket ír elő, az implementáció legördülőt — és a grade-mező a sávok mellett is
   egyenrangúan látszik.

## Elfogadási kritériumok

- [x] Reprodukálva és gyökérok azonosítva (emulátoron / telefonon és weben): új session, előtöltött
      terem, illetve kézzel választott terem esetén is. Gyanúk: (a) a `gymIdValue` signal nem kap
      értéket az előtöltésnél / a `bands` computed nem frissül; (b) a sávok egy másik (pl. törölt
      vagy nem-`BOULDER`) teremhez tartoznak; (c) a sávok még nincsenek a helyi tárban új sessionnél.
- [x] Ha a kiválasztott teremnek van élő színsávja, új és meglévő sessionnél is azonnal
      megjelenik a színválasztó minden kísérlet-kártyán.
- [x] A színválasztó a spec szerint **chip-sor** (a sáv színével), ez az elsődleges bevitel; a
      grade-mező színsávos teremben másodlagos (pl. „vagy grade" összecsukott mező).
- [x] Regressziós spec-teszt: új session + előtöltött terem → sávok láthatók.
- [x] Zöld lint + test:ci + build.

## Terv / döntési napló

_A #122 élő session gyors-rögzítő rácsa ugyanezt a `bands` forrást használja — a javítás ott is
hasznos._

## Lezáráskor (on-done)

- Frissített specek: [[Indoor boulder napló]]
- `IMPLEMENTATION_STATUS.md` sor: 2026-09-24 — #123
- Kód: `pages/workout/climbing/naplo/indoor-boulder-session-edit.page.*`
- Megjegyzés: Reprodukció weben: a választó megjelent, funkcionális hiba nem volt (user megerősítette: „elnéztem valamit”); a spectől eltérő, könnyen átnézhető legördülő lecserélve chip-sorra, grade másodlagos.
