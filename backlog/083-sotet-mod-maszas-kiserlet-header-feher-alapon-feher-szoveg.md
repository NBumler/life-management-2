---
id: 83
type: bug
status: backlog
title: Sötét mód — a kísérlet fejléce (sorszám + „sikeres" toggle) fehér alapon fehér
specs:
  - "[[Dark&Light mode]]"
  - "[[Mászónapló]]"
flag:
created: 2026-09-09
closed:
---

# 83 — Sötét mód — a kísérlet fejléce (sorszám + „sikeres" toggle) fehér alapon fehér

## Motiváció / probléma

Sötét témában a napló-formon egy kísérlet (`AscentAttempt` sor) **fejléce** — az „1. kísérlet"
felirat + a „sikeres" toggle — fehér alapon fehér, nem látható. Ugyanaz a hardcode-olt világos
szín / háttér probléma, mint [[082-sotet-mod-maszas-fal-felvetele-komponens-feher-alapon-feher-szoveg]],
de a napló kísérlet-kártyán.

## Jelenlegi működés

[[Mászónapló]] `AscentAttempt`: a 4 kontextus-napló form kísérletenként egy összecsukható
kártyát renderel; a kártya fejléce a sorszámot és a siker/kudarc toggle-t mutatja. Sötét
témában a fejléc-sáv háttér/szöveg színe nem a [[Dark&Light mode]] szemantikus tokenekből jön.

## Elfogadási kritériumok

- [ ] Scoping: a kísérlet-kártya fejléc komponens + a hibás szabály azonosítva
      (`frontend/src/app/pages/workout/climbing/naplo/*-session-edit.*`).
- [ ] Fejléc szöveg + háttér + a toggle mindkét témában olvasható, kontraszt ≥ WCAG AA.
- [ ] Nincs hardcode-olt világos érték; a sorszám, a felirat és a toggle a tokenekből színez.
- [ ] Mind a 4 kontextus-napló formon egységes (indoor/outdoor × boulder/köteles).

## Terv / döntési napló

_Együtt kezelhető a [[082-sotet-mod-maszas-fal-felvetele-komponens-feher-alapon-feher-szoveg]]
jeggyel, ha a gyökérok közös (mászó modul saját, témát nem követő SCSS)._

## Lezáráskor (on-done)

- Frissített specek: [[Mászónapló]] `### UI/UX elvárások` (ha releváns), [[Dark&Light mode]]
- `IMPLEMENTATION_STATUS.md` sor: <dátum> — <mit>
- Kód: `frontend/src/app/pages/workout/climbing/naplo/*-session-edit.{html,scss}`
