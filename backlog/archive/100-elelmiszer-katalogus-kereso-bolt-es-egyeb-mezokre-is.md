---
id: 100
type: change-request
status: done
title: Élelmiszer katalógus kereső — ne csak a névben, a bolt / egyéb mezőkben is keressen
specs:
  - "[[Élelmiszerek]]"
  - "[[Szöveges keresés]]"
flag:
created: 2026-09-09
closed: 2026-09-09
---

# 100 — Élelmiszer katalógus kereső — ne csak a névben, a bolt / egyéb mezőkben is keressen

## Motiváció / probléma

A katalógus keresőbe beírt szöveg jelenleg csak a **termék nevében** keres. Legyen a keresés
kiterjesztve az **üzlet (`store`)** és az **egyéb (`note`)** mezőkre is — pl. „Lidl" beírásra
jöjjenek a Lidl-hez rögzített tételek.

## Jelenlegi működés

[[Élelmiszerek]] → „Keresés: [[Szöveges keresés]]". A `food-list.page.ts` `filteredItems`
computed-je `matchesSearch(query, item.name)`-re szűrt, majd `compareRank`-kel rendezett. A `Food`
soron `store`, `brand`, `barcode`, `note` szabad szöveg is van.

## Elfogadási kritériumok

- [x] A katalógus kereső a `name`, `brand`, `store`, `note` mezők **bármelyikére** talál
      (ékezet-/kis-nagybetű-független, [[Szöveges keresés]] normalizálással).
- [x] Ranking: a névbeli egyezés előrébb, mint a `brand` / `store` / `note` egyezés — mező-prioritásos
      rangsor (`searchFieldRank` a találó mező 1-alapú sorszámát adja, ez az elsődleges rendezőkulcs);
      azonos mezőrangon belül a lista ábécésorrendben marad, `compareRank` az ékezet-pontos egyezést
      előre.
- [x] `barcode`: részleges számjegy-egyezésre is talál (a mezőlista végén, legkisebb prioritással).
- [x] Üres query → teljes lista (változatlan).
- [x] Full-offline: a bővített keresés a helyi store-on ugyanígy fut (pure client).
- [x] Ellenőrzés: a [[Élelmiszer tárolás]] / [[Bevásárlólista írás]] katalógus-pickere `name` +
      `brand` keresést tart — ezek már szűkített kontextusban (tárolt tételek / lista) keresnek, nem
      a teljes katalógusban, így a többmezős kiterjesztés ott nem indokolt; a közös `searchFieldRank`
      rendelkezésre áll, ha később mégis kell.

## Terv / döntési napló

- Új közös utility: **`shared/text-search.ts` `searchFieldRank(query, fields[])`** — a mezőket
  prioritási sorrendben próbálja, a találó mező 1-alapú sorszámát adja (`0` = nincs találat), üres
  query → `1`. `null`/`undefined` mezőt kihagy.
- `food-list.page.ts`: `filteredItems` `map` → `{item, rank: searchFieldRank(query, [name, brand,
  store, note, barcode])}` → `filter(rank > 0)` → `sort(rank || compareRank(name))` → `map(item)`.

## Lezáráskor (on-done)

- Frissített specek: [[Élelmiszerek]] (keresett mezők + mező-prioritásos rangsor), [[Szöveges keresés]]
  (`#### Több mező, mező-prioritással` szakasz + `searchFieldRank` a Frontend utility-listában).
  Stamp: `verifikalva: 2026-09-09`, `verifikalt_commit: ca19d1e`.
- `IMPLEMENTATION_STATUS.md`: `2026-09-09 — #100` sor.
- Kód: `shared/text-search.ts` (`searchFieldRank`) + `text-search.spec.ts` (6 új eset),
  `pages/food/catalog/food-list.page.ts` + `food-list.page.spec.ts` (1 új eset).
- Green gate: lint ✓ · `test:ci` 1606 ✓ · build ✓ · `verify:outbox` ✓.
