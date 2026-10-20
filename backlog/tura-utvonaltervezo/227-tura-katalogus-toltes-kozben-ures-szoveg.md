---
id: 227
type: bug
status: backlog
title: Túra — az Ajánlott túrák lista töltés közben „üres katalógus” szöveget mutat
specs: []
flag: menu.tura
created: 2026-10-20
closed:
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

- [ ] A repository `loading` signalt ad (a `RouteSuggestionRepository.loading` mintájára); egymás utáni
      gyors szűrőváltásnál csak a legutolsó kérés eredménye és állapota számít.
- [ ] Töltés alatt a panel töltésjelzőt mutat (`ion-spinner` + felirat, hu + en), üres-állapot szöveg nem.
- [ ] Szűrőváltáskor a korábbi lista helyett is a töltésjelző (vagy a régi lista halványítva) — döntés a naplóban.
- [ ] Az üres-állapot szövegek (`EMPTY` / `NO_RESULTS` / `OFFLINE`) csak a befejezett betöltés után.
- [ ] Unit teszt a repositoryra (loading átmenetek, elavult válasz eldobása) és a `catalogEmptyKey`-re.
- [ ] Emulátoron 360 dp, hu + en.

## Terv / döntési napló

_—_

## Lezáráskor (on-done)

- Frissített specek: **nincs** — a túra spec a [[102-tura-utvonaltervezo-attekintes]] szerint a család végén készül.
- `IMPLEMENTATION_STATUS.md` sor: <dátum> — #227
- Kód: `core/data/curated-route.repository.ts`, `pages/menu/tura/tura.page.*`
