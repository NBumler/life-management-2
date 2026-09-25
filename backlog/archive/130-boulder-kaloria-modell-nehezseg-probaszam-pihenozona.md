---
id: 130
type: change-request
status: done
title: Boulder kalória-modell — nehézség, próbaszám és a pihenőzóna valósághű figyelembevétele
specs:
  - "[[Mászónapló]]"
  - "[[Tápérték kalkulátor]]"
  - "[[Indoor boulder napló]]"
  - "[[Outdoor boulder napló]]"
flag:
created: 2026-09-25
closed: 2026-09-25
---

# 130 — Boulder kalória-modell: nehézség, próbaszám és pihenőzóna

## Motiváció / probléma

Felhasználói észrevétel (2026-09-25): egy **81 perces indoor boulder session**, benne **9
naplózott út, ebből 4 db ~V7**, mindössze **171 kcal**-t adott. Első ránézésre is túl kevés,
és úgy tűnik, hogy a nehezebb út nem éget többet, a session hossza pedig alig számít.

**Ez nem implementációs hiba, a jelenlegi spec szándékos viselkedése** ([[Mászónapló]]
„Kalória (kanonikus)”). A modell viszont a sporttudományos mérésekhez képest szisztematikusan
alulbecsül, és a nehézséget meg a próbák számát teljesen figyelmen kívül hagyja. Ezért a
jegy change-request, nem bug.

### A 171 kcal levezetése (a mostani modellel)

`climbing-metrics.ts` `climbingKcal`, BOULDER ág:

- aktív idő = **kísérlet-soronként fix 60 s**, az `attemptCount`-tól függetlenül → 9 sor = 9 perc
- aktív nettó MET = `8.0 × pump − 1` (pump 3 → 7.0)
- pihenő = 81 − 9 = 72 perc, nettó `2.0 − 1 = 1.0` MET-tel

`kcal = 7.0 × m × 9/60 + 1.0 × m × 72/60 = 2.25 × m` → **m ≈ 76 kg-mal pontosan ~171 kcal**
(pump 5-tel ~65 kg adja ugyanezt). Ebből ~90 kcal a pihenőzóna, ~80 kcal a teljes mászás.
**Egy 81 perces session átlaga így ~1.7 nettó MET, ami a lassú sétának felel meg.**

### A modell három hibája

1. **A nehézség nem számít.** Az `absoluteDifficultyIndex` csak a Volumenbe megy, a kcal-ba
   nem. Egy V0 és egy V7 kísérlet-sor energiája azonos.
2. **A próbák száma nem számít.** Egy V7 projekt 6 próbával ugyanannyi aktív időt kap (60 s),
   mint egy flash. Épp a nehéz utakon van a legtöbb próba, így a hiba és az 1. pont egymást
   erősíti.
3. **A pihenőzóna túl alacsony boulderben.** A bruttó 2.0 MET (≈ állás / biztosítás) a köteles
   biztosításra jó, de bouldernél a „pihenő” valójában a problémák közti járkálás,
   spottolás, kefélés, béta-olvasás, bemelegítő / nem naplózott mászások, és emelkedett
   pulzus a regeneráció alatt. A session hossza így alig hat az eredményre (+10 perc ≈ +13 kcal).

## Sporttudományos háttér

- **2024 Adult Compendium of Physical Activities** (Herrmann et al. 2024, a 2011-es Ainsworth
  frissítése; a spec még a 2011-est idézi), 15-ös „Sports” fejezet:
  | Kód | MET | Tevékenység |
  |---|---|---|
  | 15534 | **8.8** | Rock climbing, free boulder |
  | 15533 | 8.0 | Rock or mountain climbing |
  | 15535 | 7.3 | Rock climbing, ascending rock, high difficulty |
  | 15537 | 5.8 | Rock climbing, ascending or traversing rock, low-to-moderate difficulty |
  | 15536 | 10.5 | Rock climbing, speed climbing, very difficult |
  | 15540 | 5.0 | Rock climbing, rappelling |

  → A Compendium maga is **nehézség szerint differenciál** (5.8 → 7.3, +26%), a boulder pedig
  8.8, ami a mostani 8.0-nál magasabb.
- **Mermier et al. 1997** (Br J Sports Med, *Energy expenditure and physiological responses
  during indoor rock climbing*): három, egyre nehezebb falon (90° függőleges → 106° → 151°
  tető) a pulzus, a laktát, a VO₂ és az energiafelhasználás is **szignifikánsan nőtt a
  nehézséggel**. Az energialeadás a közepes tempójú futáséhoz hasonló. Kiemelik azt is, hogy a
  pulzus–VO₂ összefüggés mászásnál nem használható (izometrikus fogás, kar a fej fölött) — ez
  a pulzus alapú órák becslésének megbízhatóságát is korlátozza.
- **Competitive bouldering** (Appl Physiol Nutr Metab 2021, *Cardiorespiratory demands of
  competitive rock climbing*): elit boulderesek 5 problémán (5 perc pihenőkkel) a treadmill
  VO₂max ~**75%-át** (csúcs ~35.8 ml·kg⁻¹·min⁻¹ ≈ 10 MET) és a HRmax ~88%-át érték el,
  hosszan a gázcsere-küszöb felett. A szív-légzési mutatók csak **2–4 perc** alatt tértek
  vissza az alapszintre, tehát a pihenő első percei is emelkedett anyagcserével telnek.
- **La Torre et al. 2009** (elit boulderesek pulzusa és laktátja): a boulder rövid, közel
  maximális, intermittáló terhelés, ahol a laktát és a pulzus a próbák között is magas marad.
- **Nehézség vs. relatív intenzitás:** a mérések szerint az energiaköltséget a **mászó saját
  szintjéhez viszonyított** nehézség (és a fal dőlése) hajtja, nem az abszolút grade. Egy V7 a
  saját határán ≈ maximális terhelés, ugyanez egy V12-es mászónak bemelegítés.

**Józan-ész referencia:** egy 60–90 perces rekreációs / haladó boulder session nettó
(TDEE feletti) energiája ~70–80 kg-os mászónál nagyjából **250–450 kcal** (átlag ~3–4.5 nettó
MET). A 171 kcal ennek a sávnak a fele alatt van.

## Jelenlegi működés

[[Mászónapló]] „Kalória (kanonikus)” + `frontend/src/app/pages/workout/climbing/climbing-metrics.ts`:
aktív + pihenő zóna, nettó MET (`bruttó − 1`), `BOULDER_ACTIVE_SECONDS = 60` kísérlet-soronként,
`CLIMBING_MET.ACTIVE_BOULDER = 8.0`, `REST = 2.0` (boulderre és kötélre is), `pumpRating`
szorzó az aktív MET-re, a nehézség csak a Volumenbe kerül, az `attemptCount` tájékoztató
mező. A session **nem tárol** kcal-t: `core/data/activity-kcal.ts` minden megjelenítéskor
újraszámol, így a modellváltás a múltbeli sessionökre és napi `activityExtraKcal`-ra is
visszamenőleg hat.

## Javasolt modell (boulder ág; a kötél ág változatlan)

1. **Aktív idő a próbák számával:** `activeSeconds = BOULDER_SECONDS_PER_GO × max(1, attemptCount)`,
   ahol `BOULDER_SECONDS_PER_GO ≈ 45 s` (egy tipikus boulder-próba 4–10 mozdulat, 20–60 s; a
   nehéz, bukós próbák rövidebbek). A spec „`attemptCount` tájékoztató” mondata a kcal-ra
   vonatkozóan megszűnik. A Volumen és a sikerarány soronként marad.
2. **Nehézségfüggő aktív MET, a mászó saját szintjéhez viszonyítva:**
   - `I_ref` = a user referencia-szintje: a legmagasabb **sikeres** boulder
     `absoluteDifficultyIndex` az utolsó 90 napban, de legalább az aktuális session
     maximuma. Ha nincs adat, akkor a session maximuma.
   - `r = clamp((I − (I_ref − Δ)) / Δ, 0, 1)`, ahol `Δ` ≈ 4 V-fokozatnyi index-sáv (a mátrixból
     véglegesítendő).
   - `MET_active(bruttó) = 5.8 + r × (9.5 − 5.8)`. Alsó vég: Compendium 15537
     (low-to-moderate). Felső vég: a 15534-es free boulder 8.8 és a mért ~10 MET-es csúcs
     között, a saját határon mászott próba.
   - Ismeretlen grade (`null` index) → a mostani 8.8 bruttó (15534).
   - A `pumpRating` szorzó megmarad.
3. **Boulder pihenőzóna:** bruttó `REST_BOULDER = 3.0` (nettó 2.0): aktív regeneráció,
   járkálás, spottolás, nem naplózott bemelegítés, és az első 2–4 perc emelkedett
   anyagcseréje. A kötél `REST` (biztosítás) marad 2.0.
4. **Nettó MET konvenció marad** (`bruttó − 1`, mert a TDEE-hez adódik).

### Ellenőrző példa (a bejelentett session, 76 kg, pump 3; feltételezve 4 V7-sor × 4 próba + 5 könnyebb sor × 1 próba)

| Zóna | Idő | Nettó MET | kcal |
|---|---|---|---|
| V7 (saját határ, r≈1) | 16 × 45 s = 12 perc | 8.5 | ~129 |
| Könnyebbek (r≈0.5) | 5 × 45 s = 3.75 perc | ~6.6 | ~31 |
| Pihenő | 81 − 15.75 = 65.25 perc | 2.0 | ~165 |
| **Összesen** | | | **~325 kcal** (most: 171) |

~4 kcal/perc, ami a fenti referenciasáv közepe.

## Elfogadási kritériumok

- [ ] [[Mászónapló]] „Kalória (kanonikus)” átírva az új boulder modellre, a MET-táblázat a
      **2024-es Compendium** kódjaira hivatkozik (kódszámmal). A spec rögzíti, miért relatív
      nehézség (hivatkozásokkal), és hogy az `attemptCount` mostantól bemegy a kcal-ba.
- [ ] `climbing-metrics.ts`: `attemptCount`-arányos aktív idő, nehézségfüggő aktív MET, külön
      boulder pihenő-MET. A kötél ág eredménye bitre változatlan (a meglévő kötél specek zöldek).
- [ ] `I_ref` számítása tiszta TS függvény (a korábbi sessionökből), unit-tesztelve:
      nincs előzmény, csak ismeretlen grade, a session maximuma magasabb, mint az előzmény.
- [ ] Unit-teszt a fenti ellenőrző példára (±5%). Plauzibilitási fixture-ök: 60 perces,
      könnyű session (10 sor × 1 próba) ~170–250 kcal, 90 perces, projektelős session ~350–450 kcal (76 kg).
      Egy V0 és egy saját-határ V7 kísérlet-sor aktív kcal-ja közt legalább 1.5× különbség van.
- [ ] Egy azonos session hosszabb idővel (pl. +30 perc) érezhetően több kcal-t ad (a pihenő
      nettó 2.0 MET-tel ~+75 kcal 76 kg-nál).
- [ ] Az élő előnézet (session edit / összegző) és a napi `activityExtraKcal` ugyanazt a
      függvényt használja. A visszamenőleges újraszámolás tudatos, és a spec
      `#### Tudatos korlát` alatt rögzíti.
- [ ] `#### Backend-offline` változatlan tartalommal ellenőrizve (tiszta kliens-számítás,
      offline is működik, nincs új szinkronizált mező). Ha `I_ref`-hez új lekérdezés kell, az
      lokális SQLite-ból fut.

## Nyitott kérdések / döntendő

- `BOULDER_SECONDS_PER_GO`: 45 s fix, vagy siker/bukás szerint eltérő (pl. sikeres 50 s,
  bukott 30 s)?
- `I_ref`: 90 napos maximum vagy felső percentilis (kilógó flukes ellen)? `Δ` pontos értéke
  a konverziós mátrix indexlépcsőiből.
- Kell-e opcionális „bemelegítés (perc)” mező, vagy elég a magasabb boulder pihenő-MET?
- A kötél ág is kapjon-e nehézségfüggést (a Compendium 5.8 / 7.3 alapján)? → külön jegy, ha igen.

## Források

- 2024 Adult Compendium of Physical Activities — Sports: https://pacompendium.com/sports/
- Mermier CM et al. (1997) Energy expenditure and physiological responses during indoor rock
  climbing. Br J Sports Med — https://pmc.ncbi.nlm.nih.gov/articles/PMC1332525 /
  https://pubmed.ncbi.nlm.nih.gov/9298558/
- Cardiorespiratory demands of competitive rock climbing (2021), Appl Physiol Nutr Metab —
  https://cdnsciencepub.com/doi/10.1139/apnm-2020-0566
- La Torre A et al. (2009) Heart rate and blood lactate evaluation in bouldering elite
  athletes — https://www.researchgate.net/publication/23972978_Heart_rate_and_blood_lactate_evaluation_in_bouldering_elite_athletes
- Physiological demands and nutritional considerations for Olympic-style competitive rock
  climbing (2019) — https://www.tandfonline.com/doi/full/10.1080/2331205X.2019.1667199

## Terv / döntési napló

A nyitott kérdésekre hozott döntések (2026-09-25):
- `BOULDER_SECONDS_PER_GO` = fix 45 s (nincs siker/bukás szerinti bontás, mert a modell így egyszerűbb, és a különbség a pihenőzónában amúgy is kiegyenlítődik).
- `I_ref` = 90 napos **maximum** (sikeres, boulder, indoor + outdoor, a sessiont kihagyva); nincs előzmény → V5 (index 20). A session saját legjobb sikeres kísérlete megemeli. `Δ` = 8 index (4 V-fokozat).
- Nincs külön bemelegítés-mező: a boulder pihenő 3.0 bruttó MET fedi.
- A kötél ág változatlan; ha kell nehézségfüggés, az külön jegy lesz.

## Lezáráskor (on-done)

- Frissített specek: [[Mászónapló]] — „Kalória (kanonikus)”: 45 s × próbaszám, 2024 Compendium MET-tábla, „Relatív nehézség” blokk, boulder pihenő 3.0, példa, `attemptCount` mező-leírás, új `#### Tudatos korlát` (a kcal az előzményektől függ); [[Tápérték kalkulátor]] — mászás MET-összefoglaló; [[Indoor boulder napló]] — `attemptCount` + kalória-hivatkozás
- `IMPLEMENTATION_STATUS.md` sor: 2026-09-25 — #130 boulder kalória-modell
- Kód: `frontend/src/app/pages/workout/climbing/climbing-metrics.ts`, `climbing-attempt-input.ts`, `core/data/activity-kcal.ts`, `naplo/climbing-session-list.page.ts`, `naplo/{indoor,outdoor}-boulder-session-edit.page.ts`
