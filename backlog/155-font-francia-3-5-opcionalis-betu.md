---
id: 155
type: bug
status: backlog
title: Font és francia skála — 3–5 fokozatnál opcionális betű (pl. 5A, 4b) elfogadása
specs:
  - "[[Nehézségi szint skálája]]"
  - "[[Nehézségi szint skálája (konverziós mátrix)]]"
flag:
created: 2026-10-17
closed:
---

# 155 — Font és francia skála — 3–5 fokozatnál opcionális betű (pl. 5A, 4b) elfogadása

## Motiváció / probléma

Felhasználói észrevétel: boulder nehézség megadásakor a Font skála nem fogadja el az `5A`-t. A csupasz
`3` / `4` / `5` elfogadása jó és marad, de sok terem és topó ezeken az alsó fokozatokon is ad
al-betűt (`3C`, `4B`, `5A`, `5C+` …). A helyes szabály: **6-tól kötelező a betű, 3–5 között
opcionális.** A súgó szövege (`SHARED.GRADE_INPUT.HELP_BOULDER` / `HELP_ROPE`) ma is ezt sugallja
(„a 3, 4, 5 betű nélkül is érvényes, 6-tól kötelező a betű”), az implementáció viszont a betűs alakot
3–5-nél nem fogadja el — ezért `bug`.

Ugyanez a hiány a köteles **francia** skálán is megvan (`4a`, `4b`, `4c`, `3c`, `5a+` …); a
felhasználó kérésére a francia javítás is ebben a jegyben van.

## Jelenlegi működés

- A regexek szintaktikailag átengedik a betűs alakot (`frontend/src/app/shared/climbing/grade-scale.ts`,
  `SCALE_PATTERNS`): `FONT: /^\d[A-C]\+?$/`, `FRENCH: /^\d[a-c]\+?$/`.
- A mátrixban (`frontend/src/app/shared/climbing/climbing-grade-matrix.ts`, `CLIMBING_GRADE_MATRIX`)
  viszont nincs hozzájuk kulcs:
  - `FONT`: `'3': 10, '4': 12, '5': 14`, majd `'6A': 16` — `3A … 5C+` hiányzik.
  - `FRENCH`: `'3': 2, '4': 6, '5': 9, '5a': 10, '5b': 11, '5c': 12`, majd `'6a': 14` — `3a … 4c+`
    és az `5a+ … 5c+` hiányzik.
- Így `gradeToIndex` `null`-t ad, a mező nem lesz `VALID` (nem menthető).
- A csupasz `3` / `4` / `5` `VALID` (alapértelmezett skálával + alternatíva-chipekkel); a csupasz `6+`
  `AMBIGUOUS` (chip-választás kell) — ez helyes, marad.
- Spec: [[Nehézségi szint skálája]] (Regex, Mobil pre-parsing, súgó), [[Nehézségi szint skálája (konverziós mátrix)]]
  (Referencia-anchor tábla, Font alsó cellák „Előállítási módszer”).

## Elfogadási kritériumok

- [ ] Font: `3A … 5C+` (A/B/C, opcionális `+`) `VALID`, `FONT` badge-dzsel, nem-null
      `absoluteDifficultyIndex`-szel; kisbetűs bevitel a boulder pre-parsing szerint nagybetűsödik.
- [ ] Francia: `3a … 5c+` (a/b/c, opcionális `+`) `VALID`, `FRA` badge-dzsel, nem-null indexszel.
- [ ] A csupasz `3` / `4` / `5` továbbra is `VALID` mindkét skálán; 6-tól a betű továbbra is kötelező
      (csupasz `6` → `AMBIGUOUS`, `6` + betű nélkül nem menthető).
- [ ] Monoton, **egész** index-leképezés (a szerveren `absolute_difficulty_index integer`): Font a
      `3 … 6A` (10…16), francia a `3 … 6a` (2…14) sávban; a csupasz szám és a betűs változatai
      konzisztensen illeszkednek (pl. csupasz `5` ≈ `5A`/`5B` sávja). A leképezés dokumentálva a
      konverziós mátrix specben.
- [ ] Tartomány és shorthand az új fokozatokkal is működik (`5A/B`, `5A/+`, `4a/b`, `4c/+`).
- [ ] A súgó szövege (`SHARED.GRADE_INPUT.HELP_BOULDER` / `HELP_ROPE`, minden nyelven) kimondja, hogy
      3–5-nél a betű opcionális, 6-tól kötelező — példával (pl. `5` vagy `5A`).
- [ ] Unit tesztek: `grade-scale.spec.ts` (VALID / AMBIGUOUS esetek, tartomány), 
      `climbing-grade-matrix.spec.ts` (monotonitás, új kulcsok).

## Terv / döntési napló

- Javítás a client-only mátrixban (`CLIMBING_GRADE_MATRIX`) — új kulcsok a 3–5 sávba; a regex
  valószínűleg változatlan maradhat. Nincs backend / Flyway / OpenAPI / outbox-payload változás (az index
  már integer, a fokozat-string szabad szöveg a szerveren).
- Döntési pont: a sűrű al-fokozatok (3 × 3 betű × ±`+`) egész indexre képezése a ritka lépcsőn
  (Font 2-es, francia 3–4-es lépésköz) — több fokozat ugyanarra az indexre eshet; ez elfogadható,
  a statisztika úgyis sávos.
- A Font és a francia bővítés egy jegyben, közös szabállyal (3–5: opcionális betű, 6-tól kötelező).
- Kapcsolódó: `backlog/024` (közös generált mátrix-JSON asset + szerver-oldali index) — ha az előbb
  készül el, az új kulcsok oda kerülnek.

## Lezáráskor (on-done)

- Frissített specek: [[Nehézségi szint skálája]] — 3–5 opcionális betű szabály, súgó; [[Nehézségi szint skálája (konverziós mátrix)]] — új alsó cellák + leképezés
- `IMPLEMENTATION_STATUS.md` sor: <dátum> — #155 Font + francia 3–5 opcionális betű
- Kód: `frontend/src/app/shared/climbing/{climbing-grade-matrix,grade-scale}.ts` (+ spec), i18n `SHARED.GRADE_INPUT.HELP_*`
