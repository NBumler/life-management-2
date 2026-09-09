---
id: 82
type: bug
status: backlog
title: Sötét mód — a mászás „fal felvétele" komponensben fehér alapon fehér a szöveg
specs:
  - "[[Dark&Light mode]]"
  - "[[Indoor köteles admin]]"
  - "[[Indoor boulder admin]]"
flag:
created: 2026-09-09
closed:
---

# 82 — Sötét mód — a mászás „fal felvétele" komponensben fehér alapon fehér a szöveg

## Motiváció / probléma

Sötét (dark) témában a mászásnál a **fal / terem felvétele** komponensben a szöveg fehér
alapon fehér — gyakorlatilag olvashatatlan. A komponens valahol fix világos hátteret vagy fix
fehér szövegszínt használ, ami sötét témában nem fordul meg (nem a szemantikus szín-tokenekből
származik).

## Jelenlegi működés

[[Dark&Light mode]]: központi, kétirányban felülírt szemantikus szín-tokenek (light + dark).
A mászó admin fal-/terem-felvétel form egy vagy több eleme viszont hardcode-olt világos értékkel
renderel, így `data-theme="dark"` alatt fehér szöveg fehér háttéren jelenik meg. A pontos
komponens és a hibás CSS a scoping feladata (feltehetően
`frontend/src/app/pages/workout/climbing/admin/*` valamelyik template-je / stílusa).

## Elfogadási kritériumok

- [ ] Scoping: a konkrét komponens + a hibás szabály azonosítva (screenshot dark módban).
- [ ] A szöveg és a háttér mindkét témában a szemantikus tokenekből jön; kontraszt ≥ WCAG AA.
- [ ] Nincs hardcode-olt `#fff` / `color: white` / fix világos `background` a komponensben.
- [ ] Regressziós ellenőrzés a másik három mászó admin formon (outdoor crag/sector, indoor terem).
- [ ] Kapcsolódik: [[017-dark-and-light-kozponti-szemantikus-szin-tokenek-kulon-light-dar]].

## Terv / döntési napló

_Scoping során dark-mód screenshot; a `data-theme="dark"` alatt hiányzó / felül nem írt token
beazonosítása. Ha ugyanaz a minta több mászó admin formon is előfordul, közös javítás._

## Lezáráskor (on-done)

- Frissített specek: [[Dark&Light mode]] (ha a token-jegyzék / lefedettség bővül), az érintett
  admin spec `### UI/UX elvárások` (ha releváns)
- `IMPLEMENTATION_STATUS.md` sor: <dátum> — <mit>
- Kód: `frontend/src/app/pages/workout/climbing/admin/*` + esetleg globális téma SCSS
