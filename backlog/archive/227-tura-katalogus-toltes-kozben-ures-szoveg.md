---
id: 227
type: bug
status: done
title: Túra — az Ajánlott túrák lista töltés közben „üres katalógus” szöveget mutat
specs: []
flag: menu.tura
created: 2026-10-20
closed: 2026-10-20
---

# 227 — Túra — az Ajánlott túrák lista töltés közben „üres katalógus” szöveget mutat

## Motiváció / probléma

Forrás: a 2026-10-20-i emulátoros ellenőrzés (5. UX-szelet, `2705df8`; LM2_Phone, Android 15, 360 dp).
Az Ajánlott túrák panelt megnyitva, amíg a `GET /api/tura/curated-routes` válasza meg nem érkezik,
a panel a „Még nincs egyetlen ajánlott túra sem” (`TURA.CATALOG.EMPTY`) szöveget mutatja, utána
ugrik be a lista. A felhasználó azt hiheti, hogy nincs ajánlott túra; szűrőváltáskor ugyanez
(`NO_RESULTS`) villan fel.

## Jelenlegi működés

- `core/data/curated-route.repository.ts`: `routes` és `loadFailed` signal van, betöltés-állapot nincs.
- `tura.page.ts` `catalogEmptyKey`: üres listánál a hiba / szűretlen / szűrt eset közül választ — a
  „még tölt” esetet nem ismeri, így az üres-állapot a töltés alatt is megjelenik.
- A [[191-tura-ures-katalogus-felrevezeto-uzenet]] vezette be a három üres-állapotot; a töltés nem volt része.

## Elfogadási kritériumok

- [x] A repository `loading` signalt ad (a `RouteSuggestionRepository.loading` mintájára); egymás utáni
      gyors szűrőváltásnál csak a legutolsó kérés eredménye és állapota számít.
- [x] Töltés alatt a panel töltésjelzőt mutat (`ion-spinner` + felirat, hu + en), üres-állapot szöveg nem.
- [x] Szűrőváltáskor a korábbi lista helyett is a töltésjelző (vagy a régi lista halványítva) — döntés a naplóban.
- [x] Az üres-állapot szövegek (`EMPTY` / `NO_RESULTS` / `OFFLINE`) csak a befejezett betöltés után.
- [x] Unit teszt a repositoryra (loading átmenetek, elavult válasz eldobása) és a `catalogEmptyKey`-re.
- [x] Emulátoron 360 dp, hu + en.

## Terv / döntési napló

- 2026-10-20 — kész. `CuratedRouteRepository.loading` signal + kérés-azonosító: a lista, a hiba- és a töltés-állapot
  csak a legutolsó `load()`-tól jön. A panel töltés alatt `ion-spinner` + `TURA.CATALOG.LOADING` („Ajánlott túrák
  betöltése…” / „Loading recommended routes…”) sort mutat. **Döntés:** szűrőváltáskor a régi lista helyett is a
  töltésjelző áll (`catalogListed`), nem halványított régi lista — a régi lista nem a szűrő eredménye, és a
  koppintás rossz túrát nyitna. Az üres-állapot kulcsa egy tiszta függvénybe költözött
  (`curated-route-text.ts` `catalogEmptyStateKey`): töltés alatt és nem üres listánál `null`.
  Unit tesztek: repository (loading átmenetek siker / hiba után, gyors szűrőváltásnál az elavult válasz eldobása
  mindkét sorrendben), `catalogEmptyStateKey` (töltés, nem üres, OFFLINE / EMPTY / NO_RESULTS).
  Emulátoron 360 dp: a panel megnyitásától a 447 túra megérkezéséig (hu 5,4 s, en 4,5 s) végig a töltésjelző
  látszott, üres-állapot szöveg egyszer sem (DOM-mintavétel 30 ms-onként), hu + en. A szűrőváltás ágát csak a
  unit teszt fedi.

## Lezáráskor (on-done)

- Frissített specek: **nincs** — a túra spec a [[102-tura-utvonaltervezo-attekintes]] szerint a család végén készül.
- `IMPLEMENTATION_STATUS.md` sor: 2026-10-20 — #229, #227, #194, #228, #226
- Kód: `core/data/curated-route.repository.ts`, `pages/menu/tura/tura.page.*`
