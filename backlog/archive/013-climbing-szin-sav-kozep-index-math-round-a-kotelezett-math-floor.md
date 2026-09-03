---
id: 13
type: bug
status: done
title: Climbing szin-sav kozep index Math.round a kotelezett Math.floor helyett
specs:
  - "[[Nehézségi szint skálája (konverziós mátrix)]]"
  - "[[Indoor boulder napló]]"
flag:
created: 2026-09-02
closed: 2026-09-03
---

# 13 — Climbing szin-sav kozep index Math.round a kotelezett Math.floor helyett

## Motiváció / probléma

A matrix-spec kliensre es szerverre kotelezove teszi a floor((low+high)/2)-t determinizmus okan. Az indoor-boulder-session-edit.page.ts inline Math.round-ot hasznal, a helyes colorBandMidIndex shared helper dead code -> paratlan-osszegu savnal eltero index, Volumen/piramis-csuszas a statisztikaban.

Forrás: dokumentáció ↔ implementáció audit (2026-09-02), lásd `backlog/audit/`.

## Jelenlegi működés

Lásd a motivációt + a hivatkozott spec(ek) `### Jelenlegi működés` szakaszát.

## Elfogadási kritériumok

- [x] Az `indoor-boulder-session-edit.page.ts` `resolveIndex()` a shared `colorBandMidIndex()`
      helpert hívja az inline `Math.round((low + high) / 2)` helyett — így páratlan `low + high`
      összegnél is a spec által kötelező **lefelé kerekített** közép jön ki, klienst és szervert
      egyaránt kötő determinizmussal. A `rowToSaveItem()` is ezen a metóduson át kap indexet, így
      a mentett `absoluteDifficultyIndex` snapshot és a volumen-modell egyszerre javul.
- [x] `indoor-boulder-session-edit.page.spec.ts`: új eset páratlan összegű sávra
      (`[15, 18]` → `16`, nem `Math.round`-os `17`); a meglévő `[10, 12]` → `11` eset változatlanul zöld.
- [x] Az érintett spec(ek) `### Jelenlegi működés` / vonatkozó szakasza a leszállított viselkedést
      írja le (a „jelenleg tévesen `Math.round`" mondat + a `backlog/013…` pointer törölve).
- [x] `npm run lint` + a spec zöld; `npm run build` zöld. Backend nincs érintve (a szerver az
      `absoluteDifficultyIndex`-et verbatim tárolja).

## Terv / döntési napló

- **2026-09-03:** a `colorBandMidIndex()` helper (`shared/climbing/climbing-grade-matrix.ts`) már
  létezett teszttel, csak dead code volt — egyetlen hívási hely (`resolveIndex()`) cseréje elég;
  nincs új helper, nincs migráció, nincs API-változás.

## Lezáráskor (on-done)

- Frissített specek: [[Nehézségi szint skálája (konverziós mátrix)]] (szín-sáv reprezentatív
  index szabály), [[Indoor boulder napló]] (`absoluteDifficultyIndex` sor)
- `IMPLEMENTATION_STATUS.md` sor: 2026-09-03 — #013 climbing szín-sáv közép-index `floor`
- Kód: `frontend/src/app/pages/workout/climbing/naplo/indoor-boulder-session-edit.page.ts`
  (+ `.spec.ts`)
