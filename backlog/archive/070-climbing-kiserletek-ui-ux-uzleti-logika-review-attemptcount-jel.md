---
id: 70
type: change-request
status: done
title: Kísérletek (AscentAttempt) UI/UX üzleti-logikai átvizsgálás — az attemptCount jelentése
specs:
  - "[[Mászónapló]]"
  - "[[Indoor boulder napló]]"
flag:
created: 2026-09-06
closed: 2026-09-06
---

# 70 — Kísérletek (AscentAttempt) UI/UX üzleti-logikai átvizsgálás — az attemptCount jelentése

## Motiváció / probléma

„Egy kísérleten belül a **próbák száma** (`attemptCount`) mit jelent? Az adott sessiont? Az egész
életemben? Az utóbbit senki nem tudja fejből. Az előbbi meg kiszámolható, hisz ha többször
próbáltam ugyanazt az utat, akkor több `AscentAttempt` sor van rá a session-listában — minek külön
mező?”

A kérés: **elemezzük ki a kísérletek teljes UI/UX-át üzleti logikai szempontból** — minden mező
logikus-e ott, ahol van, és nem redundáns / félreérthető-e.

Ez a jegy az ernyő; a konkrét részletek külön jegyekben: [[071-climbing-kiserlet-stilus-onsight-flash-redpoint-sugo-gomb]],
[[074-climbing-kiserletben-ut-modositasakor-nehezsegi-index-nem-frissul]],
[[075-climbing-kiserlet-tobb-ascent-style-cimke-egyszerre]],
[[076-climbing-kiserletek-vizualis-elkulonitese-listaban]],
[[077-climbing-sikertelen-kiserlet-hol-akadt-el-tobbsoros-textbox]].

## Jelenlegi működés

[[Mászónapló]] `AscentAttempt.attemptCount`: „Opcionális egész `≥ 1` — próbák száma az adott
mászáson / úton, kontextustól függetlenül … **Tájékoztató mező**: a Volumen- és a
sikerarány-képlet attempt-soronként számol, egyikük sem szoroz vele; a duration fallbackba sem
megy; a statisztikai nézetek megjeleníthetik.”

Tehát ma: egy `AscentAttempt` sor egy „bejegyzés” egy útról, és az `attemptCount` egy szabadon
megadott, sehol be nem számított kiegészítő szám. Egy útra több `AscentAttempt` sor is felvehető.

## Elfogadási kritériumok

- [ ] Tisztázott, dokumentált definíció: mit jelöl egy `AscentAttempt` sor (egy go? egy
      go-sorozat egy problémán ebben a sessionben? egy nap eredménye egy úton?), és mit jelent az
      `attemptCount` ehhez képest.
- [ ] Döntés az `attemptCount` sorsáról: (a) marad, de az UI egyértelműsíti („próbák száma **ebben a
      sessionben** ezen az úton”); (b) megszűnik, és a sorok darabszáma adja; (c) auto-számolt,
      csak olvasható származtatott érték az azonos úthoz tartozó sorokból.
- [ ] Minden attempt-mező felülvizsgálva: `isSuccess`, grade (`userRawInput` / index /
      `colorBandId`), `ascentStyle`, `safetyStyle`, `failurePoint`, `attemptCount`,
      `lengthInMeters`, `notes` — melyik kötelező/opcionális, melyik feltételesen látszik, van-e
      redundancia (pl. `failurePoint` vs. `notes` sikertelennél).
- [ ] Ha a modell változik: migráció + a Volumen / sikerarány / duration-fallback képletek
      újraellenőrzése (paritás fixture).

## Terv / döntési napló

_Először üzleti elemzés (nincs kód), a végén egy döntési tábla mezőnként. A gyerekjegyek a
konkrét, önállóan is szállítható darabok._

## Lezáráskor (on-done)

Elemzés + döntések (a konkrét kód a gyerekjegyekben: #071 kész, #074 kész, #075 dropped,
#076 vizuális elkülönítés, #077 failurePoint→notes).

### Döntési tábla — mit jelent egy `AscentAttempt` sor

**Egy sor = egy út/probléma ebben a sessionben** (nem egy-egy „go"). Aki ugyanazt az utat
többször mászta egy alkalommal, **egy** sort vesz fel, és az `attemptCount`-tal jelzi, hány
próbát tett — nem 6 közel azonos sort. (Ez a felhasználói workflow-döntés; a per-go modell
elvetve, mert telefonon a crag alatt kezelhetetlen.)

| Mező | Kötelező? | Feltételes? | Döntés |
|---|---|---|---|
| `isSuccess` | igen | — | Toggle. |
| grade (`userRawInput` / `absoluteDifficultyIndex` / `colorBandId`) | opcionális | — | Marad; az útváltás-re-derive szabályt a #074 rendezte. |
| `ascentStyle` | opcionális | csak `isSuccess` | Egyválasztós, szándékos (#075). Súgó: #071. |
| `safetyStyle` | opcionális | csak kötél (indoor: TRAD rejtve) | Marad. |
| `attemptCount` | opcionális `≥ 1` | — | **Marad**, de az UI címke egyértelműsít: „Próbák (ebben a sessionben)". Tájékoztató mező — a Volumen / sikerarány / duration-fallback **nem** szoroz vele (sor-alapú). |
| `failurePoint` | — | — | **Megszűnik** (#077): beolvad a `notes`-ba; sikertelennél a `notes` mező kapja a „hol akadt el?" promptot. Egy szabad szöveg mező kísérletenként. |
| `lengthInMeters` | opcionális | csak kötél | Marad (default: route / fal magasság). |
| `notes` | opcionális | — | Marad; sikertelennél ez az egyetlen szabadszöveg (failurePoint helyett is). |

- Frissített specek: [[Mászónapló]] (`AscentAttempt` tábla + `attemptCount` / duration-fallback
  szöveg + `### Megjegyzések` döntési tábla), [[Indoor boulder napló]] (`attemptCount` sor).
  `verifikalt_commit` bump.
- `IMPLEMENTATION_STATUS.md` sor: 2026-09-06 — #70 kísérlet-mező review: modell + attemptCount címke tisztázva
- Kód: 4× `*-session-edit.page.html` — `FIELD_ATTEMPT_COUNT` címke; `assets/i18n/{hu,en}.json`.
  (A failurePoint-merge és a vizuális elkülönítés külön jegy: #077 / #076.)
