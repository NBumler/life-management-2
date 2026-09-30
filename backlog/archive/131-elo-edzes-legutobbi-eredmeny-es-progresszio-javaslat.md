---
id: 131
type: feature
status: done
title: "Élő edzés: legutóbbi eredmény (ghost) + progresszió-javaslat a munkaszetteknél"
specs:
  - "[[Edzésnapló]]"
flag:
created: 2026-10-01
closed: 2026-10-01
---

# 131 — Élő edzés: legutóbbi eredmény (ghost) + progresszió-javaslat

## Motiváció / probléma

Edzés-elemzés (Gemini-beszélgetés, 2026-09-30): a maximális erő fejlesztése azonos súlyú,
3–5 ismétléses munkaszettekkel történik, és 1–2 ismétlés tartalékkal. Ehhez edzés **közben** kell
tudni, mennyi volt legutóbb a súly × ismétlés, és kell egy egyszerű progressziós szabály
(„double progression”): ha legutóbb minden munkaszett elérte a tartomány tetejét, akkor jöhet több súly.

## Jelenlegi működés

[[Edzésnapló]] „Statisztika”: ghost values csak az utólagos szerkesztőben
(`workout-session-edit`) vannak. Az élő `active-workout` nézetben csak PR badge látszik. A
`repsTarget` tartomány (backlog/125) a helyi draftban megvan, „cél: …” segédszövegként.

## Elfogadási kritériumok

- [x] Az Active Workout gyakorlat-fejlécében a legutóbbi alkalom összefoglalója látszik
      (pl. „Legutóbb: 3 × 5 @ 22,5 kg”), `ghostForExercise`-alapú logikával. Csak a
      WORKING / DROPSET / FAILURE szetteket veszi figyelembe.
- [x] Progresszió-javaslat (pure TS, unit-tesztelt): ha az előző sessionben az adott
      gyakorlat **minden** munkaszettje elérte a cél-tartomány felső határát, a javaslat
      „+2,5 kg”; rásegítésnél (negatív kg) ez 2,5 kg-mal kevesebb rásegítést jelent. Egy tapra
      alkalmazható a még nem kész munkaszettekre.
- [x] Tartomány nélkül (nincs `repsTarget`) csak a „Legutóbb” sor jelenik meg, javaslat nincs.
- [x] Offline is működik (helyi session store).
- [x] [[Edzésnapló]] spec frissítve.

## Terv / döntési napló

- A lépésköz fix 2,5 kg (kézisúlyzó / övsúly). Konfigurálhatóság csak akkor, ha igény lesz rá.
- A backlog/135 (RPE) után a javaslat az RPE-t is figyelembe veszi.

## Lezáráskor (on-done)

- Frissített specek: [[Edzésnapló]] — „Statisztika”: „Legutóbb” sor + progresszió-javaslat az élő nézetben
- `IMPLEMENTATION_STATUS.md` sor: 2026-10-01 — lásd lent
- Kód: `pages/workout/log/workout-metrics.ts` (`lastPerformance`, `formatSetSummary`, `progressionSuggestion`), `active-workout.page.{ts,html,scss}`
