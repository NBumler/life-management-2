---
id: 95
type: feature
status: backlog
title: Kezdőképernyő — widgetek / gyorsgombok egyes funkciókhoz
specs:
  - "[[Frontend]]"
flag:
created: 2026-09-09
closed:
---

# 95 — Kezdőképernyő — widgetek / gyorsgombok egyes funkciókhoz

## Motiváció / probléma

A kezdőlapon legyenek **widgetek / gyorsgombok** a leggyakoribb műveletekhez, hogy 0–1 tapról
elérhetők legyenek — pl.:

- „Új mászás" (a 4 mászó kontextus egyike / legutóbbi)
- „Új étkezés"
- „Mai étkezés állása" (bevitt kcal / makró a mai célhoz képest — kis állapot-widget)

Ez a [[096-uj-feature-kezdolap-dashboard-tab]] jegyben létrejövő kezdőlap **tartalma** — ez a
jegy a widget-készletről és a viselkedésükről szól.

## Jelenlegi működés

Nincs kezdőlap ([[Frontend]] → nincs Dashboard tab). Minden művelet a saját tabjából, tapokkal
érhető el.

## Elfogadási kritériumok

- [ ] Widget-katalógus definiálva (min. a fenti 3), mindegyik: cím, ikon, cél-route / művelet,
      opcionális élő adat.
- [ ] „Mai étkezés állása" widget a [[Tápérték kalkulátor]] / [[Étkezés]] mai összesítéséből
      renderel (helyi store — Full-offline is működik).
- [ ] „Új mászás" / „Új étkezés" gyors-belépő a megfelelő létrehozó flow-ra.
- [ ] Kikapcsolt feature flag → a hozzá tartozó widget nem jelenik meg (a tab-registry
      flag-logika mintájára, [[Frontend]]).
- [ ] A widgetek sorrendje konfigurációból (nem beégetett), később bővíthető.
- [ ] `#### Backend-offline`: minden widget helyi adatból renderel; a gyorsgombok offline is
      működnek. Lásd [[Backend-offline first]].

## Terv / döntési napló

_Függ a [[096-uj-feature-kezdolap-dashboard-tab]]-től (a hordozó képernyő). Nyitott: a widgetek
átrendezhetők / testre szabhatók legyenek-e a user által az első körben, vagy fix készlet._

## Lezáráskor (on-done)

- Frissített specek: [[Frontend]] (kezdőlap tartalom), + a hivatkozott feature specek
  (`### UI/UX elvárások` — gyors-belépő)
- `IMPLEMENTATION_STATUS.md` sor: <dátum> — <mit>
- Kód: frontend `pages/home/*` widget komponensek, `core/config` widget-registry
