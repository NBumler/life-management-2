---
id: 110
type: feature
status: dropped
title: Túra — közösségi funkciók (értékelés, fotók, megosztott útvonalak, heatmap)
specs: []
flag:
created: 2026-09-13
closed: 2026-09-13
---

# 110 — Túra — közösségi funkciók (értékelés, fotók, megosztott útvonalak, heatmap)

## Motiváció / probléma

Az AllTrails és a Strava erejét jórészt a közösségi tartalom (mások által megosztott útvonalak,
értékelések, fotók, heatmap) adja. Ez az app jelenleg elsősorban egyszemélyes/családi
élet-menedzsment eszköz — tisztázandó, mennyire releváns/kívánatos egy közösségi réteg
hozzáadása, és ha igen, milyen léptékben.

## Jelenlegi működés

Nincs — ez egy vadonatúj feature, és az appnak jelenleg nincs semmilyen több-felhasználós/
közösségi funkciója egyetlen más modulban sem.

## Elfogadási kritériumok

- [x] Az alábbi döntési checklista véglegesítve — beleértve az alapkérdést, hogy egyáltalán legyen-e
      közösségi réteg.

## Terv / döntési napló

**Döntés (2026-09-13, felhasználóval egyeztetve): dropped.** A felhasználó explicit úgy döntött,
hogy nem kell közösségi réteg — az app marad egyszemélyes/családi élet-menedzsment eszköz, nincs
értelme közösségi tartalomnak (értékelés, fotó, megosztott útvonal, heatmap) egy ilyen kis
felhasználói bázisnál.

Ennek következménye a [[backlog/tura-utvonaltervezo/103-tura-alapveto-utvonaltervezes-es-terkep]]
ticketre: az ott jóváhagyott "kész/ajánlott túrák katalógusa" **nem közösségi feltöltésből**, hanem
kizárólag saját/admin-szerkesztett vagy a `104-tura-adatforras-integracio.md` alatt beszerzett
nyílt (OSM-alapú) adatból épülhet — lásd a 103-as ticket frissített megjegyzését.

- [ ] Útvonal-értékelés, komment — **nem kell**
- [ ] Fotók feltöltése egy túrához/POI-hoz — **nem kell**
- [ ] Mások által megosztott útvonalak böngészése/letöltése — **nem kell**
- [ ] Heatmap — **nem kell**
- [ ] Saját túra megosztása (link, export) — **nem kell** ezen ticket keretében; ha később mégis
      felmerül (pl. egyszerű GPX-export egy barátnak), az önálló, kis scope-ú ticketként térhet
      vissza, nem ennek a dropped ticketnek az újranyitásaként.

## Lezáráskor (on-done)

- Frissített specek: nincs — a feature nem épült meg, spec-fájl nem készült.
- `IMPLEMENTATION_STATUS.md` sor: nem releváns (dropped, nem done).
- Kód: nincs.
