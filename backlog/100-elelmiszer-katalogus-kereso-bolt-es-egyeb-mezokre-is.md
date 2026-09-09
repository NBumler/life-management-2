---
id: 100
type: change-request
status: backlog
title: Élelmiszer katalógus kereső — ne csak a névben, a bolt / egyéb mezőkben is keressen
specs:
  - "[[Élelmiszerek]]"
  - "[[Szöveges keresés]]"
flag:
created: 2026-09-09
closed:
---

# 100 — Élelmiszer katalógus kereső — ne csak a névben, a bolt / egyéb mezőkben is keressen

## Motiváció / probléma

A katalógus keresőbe beírt szöveg jelenleg csak a **termék nevében** (és a márkában) keres.
Legyen a keresés kiterjesztve az **üzlet (`store`)** és az **egyéb (`note`)** mezőkre is —
pl. „Lidl" beírásra jöjjenek a Lidl-hez rögzített tételek.

## Jelenlegi működés

[[Élelmiszerek]] → „Keresés: [[Szöveges keresés]] (terméknév / márka)". A [[Szöveges keresés]]
szerződés ékezet-/kis-nagybetű-független egyezés + ranking, de a **keresett mezőket** a
fogyasztó feature dönti el — itt jelenleg `name` (+ `brand`). A `Food` soron van `store`,
`brand`, `barcode`, `note` szabad szöveg is.

## Elfogadási kritériumok

- [ ] A katalógus kereső a `name`, `brand`, `store`, `note` mezők **bármelyikére** talál
      (ékezet-/kis-nagybetű-független, [[Szöveges keresés]] normalizálással).
- [ ] Ranking: a névbeli / ékezetileg pontos egyezés előrébb, mint a `store` / `note` egyezés
      (a [[Szöveges keresés]] `compareRank` kiterjesztve mező-prioritással, vagy a névtalálat
      elsőbbséget kap).
- [ ] Opcionális: a `barcode` pontos egyezésre is találjon (számjegy-query).
- [ ] Üres query → teljes lista (változatlan).
- [ ] Full-offline: a bővített keresés a helyi store-on ugyanígy fut.
- [ ] Ellenőrzés: hasonló többmezős keresésre szükség van-e a [[Élelmiszer tárolás]] /
      [[Bevásárlólista írás]] katalógus-pickerében is (konzisztencia).

## Terv / döntési napló

_Scoping: a katalógus lista `matches()` hívása a `name` helyett egy `[name, brand, store, note]`
tömbön iteráljon; a rank a névmezőt súlyozza. A [[Szöveges keresés]] utility valószínűleg már
tud több jelöltmezőt — ha nem, kis kiterjesztés._

## Lezáráskor (on-done)

- Frissített specek: [[Élelmiszerek]] (keresett mezők: név / márka / üzlet / egyéb),
  [[Szöveges keresés]] (ha a mező-prioritásos ranking bekerül a közös utilitybe)
- `IMPLEMENTATION_STATUS.md` sor: <dátum> — <mit>
- Kód: frontend `pages/food/foods/*` (kereső szűrés), esetleg `shared/**/text-search*.ts`
