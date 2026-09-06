---
id: 78
type: change-request
status: backlog
title: „Teljes volumen” mászó-statisztika — címke, mértékegység és magyarázat (nagy nyers szám)
specs:
  - "[[Mászónapló]]"
flag:
created: 2026-09-06
closed:
---

# 78 — „Teljes volumen” mászó-statisztika — címke, mértékegység és magyarázat (nagy nyers szám)

## Motiváció / probléma

Egyetlen session után is egy nagyon nagy szám jelenik meg „teljes volumen” címkével, minden
kontextus / mértékegység nélkül. „Az az elégetett kalória?” — nem az. A felhasználó nem tudja
értelmezni. Kell: egyértelmű címke, mértékegység (vagy „relatív pontszám” jelölés), és egy súgó,
ami elmondja, hogy ez a `Σ mászott méter × nehézségi index` — terhelési mutató, nem kalória, nem méter.

## Jelenlegi működés

[[Mászónapló]] → `#### Volumen (statisztika)`:

- Kötél: `Volume = Σ (sikeres kísérletek) mászott_méter_i × I_grade,i`
- Boulder: `Volume = Σ (sikeres kísérletek) 4 × I_grade,i`

`#### Statisztikák`: „összes Volume” — a `computeClimbingStats` (`climbing-stats.ts`) számolja.
A megjelenítésnél nincs mértékegység / magyarázat kikötve.

## Elfogadási kritériumok

- [ ] A statisztika-kártya címkéje egyértelmű (pl. „Mászási volumen (terhelési index)”), nem
      keverhető a kalóriával.
- [ ] ⓘ súgó: mit jelent (méter × nehézség összege sikeres mászásokon), mire jó (edzésterhelés
      trendje), mire **nem** (nem kcal, nem megmászott méter).
- [ ] Mértékegység vagy explicit „relatív pontszám / nincs mértékegysége” jelzés; nagy számok
      formázása (ezres tagolás, esetleg `k` rövidítés).
- [ ] Konzisztens elnevezés a session-részleten és az összesített statisztikán.
- [ ] Tisztán frontend + i18n; a képlet nem változik.

## Terv / döntési napló

_Összefügg a [[070-climbing-kiserletek-ui-ux-uzleti-logika-review-attemptcount-jel]] review-val
(a „teljes volumen” a session után rögtön kiírt szám). Lehet, hogy a session-szintű azonnali
kiírást is érdemes visszafogni / kontextusba tenni._

## Lezáráskor (on-done)

- Frissített specek: [[Mászónapló]] (`#### Volumen` / `#### Statisztikák` — megjelenítés, címke)
- `IMPLEMENTATION_STATUS.md` sor: <dátum> — <mit>
- Kód: `frontend` `climbing-stats.ts` fogyasztói (stats page, session list/detail) + i18n
