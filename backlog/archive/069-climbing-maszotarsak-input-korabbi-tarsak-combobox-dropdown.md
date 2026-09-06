---
id: 69
type: feature
status: done
title: Mászótársak input — korábbi társak dropdownból, gépelhető kereső/új érték (combobox)
specs:
  - "[[Mászónapló]]"
  - "[[Indoor boulder napló]]"
flag:
created: 2026-09-06
closed: 2026-09-06
---

# 69 — Mászótársak input — korábbi társak dropdownból, gépelhető kereső/új érték (combobox)

## Motiváció / probléma

A `climbingPartners` most szabad string lista — minden alkalommal újra be kell gépelni ugyanazokat
a neveket, elgépelés esetén szétaprózódik a statisztika. Kellene egy combobox: a user korábbi
társai dropdownban felsorolva, onnan kiválasztható; gépelésre az input egyszerre keresőként szűr
**és** enged új értéket felvenni.

## Jelenlegi működés

[[Mászónapló]] `ClimbingSession.climbingPartners`: „Opcionális string lista”. [[Indoor boulder napló]]
szerint opcionális. Nincs korábbi-értékek forrás, nincs autocomplete — sima szövegbevitel.

## Elfogadási kritériumok

- [ ] A korábbi társak listája a user összes (nem törölt) `ClimbingSession`-jének
      `climbingPartners` értékeiből áll elő, egyedítve, gyakoriság vagy legutóbbi használat szerint
      rendezve.
- [ ] Combobox: dropdown a javaslatokkal; gépelés közben szűr (illeszkedő rész kiemelése,
      [[Szöveges keresés]] normalizálással); ha nincs találat, „+ Hozzáadás: »…«” új értékként.
- [ ] Több társ egy sessionben (chip-ek / több sor), duplikátum-védelem.
- [ ] Tisztán kliens-oldali aggregáció a helyi store-ból — nincs új endpoint, nincs külön
      „partner” entitás (a nevek továbbra is a session során élnek).
- [ ] Backend-offline: teljesen offline működik, mert a forrás a helyi `climbing_session` tábla.

## Terv / döntési napló

_Nincs önálló Partner tábla (nem indokolt). A javaslatlista egy repository-szintű derived signal.
Későbbi bővítés: társ → statisztika bontás (kivel másztam mennyit) — külön jegy, ha kell._

## Lezáráskor (on-done)

- Új shared presentational komponens `frontend/src/app/shared/partner-combobox/`
  (`app-partner-combobox`): `[label]` / `[placeholder]` / `[suggestions]` / `[partners]` input,
  `(partnersChange)` output. A felvett nevek törölhető chip-ként; üres beviteli mezőnél a nem
  választott javaslatok tap-elhető outline-chipként (max 6); gépelésre `matchesSearch` /
  `compareRank` ([[Szöveges keresés]]) szűrt lista (max 8) + „+ Hozzáadás: »…«"
  (`WORKOUT.CLIMBING.SESSION.PARTNERS_ADD_NEW`) ha a beírt név még nem létezik. Enter: találat esetén
  a legjobb javaslat, egyébként a beírt szöveg új névként. Kis-nagybetűtől független
  duplikátum-védelem.
- `ClimbingSessionRepository.partnerSuggestions` — új derived signal: az élő (nem törölt)
  sessionök `climbingPartners` értékei egyedítve, `count` majd legutóbbi session dátuma szerint
  rendezve; a legutóbb használt írásmód nyer a dedupnál (az `items()` newest-first).
- Mind a 4 kontextus napló-form (`indoor-boulder`, `indoor-rope`, `outdoor-boulder`,
  `outdoor-rope`): a `climbingPartners` form-control törölve, helyette `partners = signal<string[]>`
  + `partnerSuggestions` alias; betöltéskor `existing.climbingPartners`-ből, `buildDraft`-ben
  `this.partners()` trimmel + üres kiszűr.
- `PARTNERS_PLACEHOLDER` szövege „Vesszővel elválasztva" → „Név beírása vagy választás" (hu) /
  „Type or pick a name" (en); új `PARTNERS_ADD_NEW` kulcs mindkét nyelven.
- Nincs backend / OpenAPI / migráció változás; nincs új endpoint, nincs `Partner` entitás.
  Full-offline: a javaslatok forrása a helyi `climbing_session` tábla.
- Frissített specek: [[Mászónapló]] (`climbingPartners` mező + UI/UX + Frontend + Backend-offline),
  [[Indoor boulder napló]] (session mezők + UI/UX). Mindkettő `verifikalt_commit: 499b4aa`.
- `IMPLEMENTATION_STATUS.md` sor: 2026-09-06 — Mászótársak bevitele combobox-szal (#69)
- Kód: `frontend/src/app/shared/partner-combobox/` (3 fájl + spec, 8 teszt),
  `core/data/climbing-session.repository.ts` (+1 teszt), 4× `*-session-edit.page.{ts,html}`
  (+ mock repo és 2 új teszt az indoor-boulder specben), `assets/i18n/{hu,en}.json`.
