---
id: 69
type: feature
status: backlog
title: Mászótársak input — korábbi társak dropdownból, gépelhető kereső/új érték (combobox)
specs:
  - "[[Mászónapló]]"
  - "[[Indoor boulder napló]]"
flag:
created: 2026-09-06
closed:
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

- Frissített specek: [[Mászónapló]] (`climbingPartners` mező leírása + combobox UI),
  [[Indoor boulder napló]] UI/UX szakasz
- `IMPLEMENTATION_STATUS.md` sor: <dátum> — <mit>
- Kód: `frontend` climbing session edit űrlapok + shared partner-combobox, climbing repository derived signal
