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
- [ ] Monoton, **egész** index-leképezés (a szerveren `absolute_difficulty_index integer`), csak az
      alsó sáv újraosztásával: Font `3 … 6A` lejjebb nyújtva (kb. `3` ≈ 4 … `6A` = 16, a V-skála
      `VB = 8` / `V0 = 10` anchorokhoz igazítva), francia `3 … 5a` a 2…10 sávban. A `6A` / `5a` és
      afölötti értékek **nem változnak**. A csupasz szám és a betűs változatai konzisztensen
      illeszkednek. A leképezés dokumentálva a konverziós mátrix specben.
- [ ] A már tárolt csupasz Font / francia `3`/`4`/`5` kísérletek indexe egyszer újraszámolva a
      megőrzött beírt fokozatból (`userRawInput` / `guidebookGrade`), helyben és a szerveren is
      konvergálva (a sorok újramentése a szokásos outbox-úton).
- [ ] Tartomány és shorthand az új fokozatokkal is működik (`5A/B`, `5A/+`, `4a/b`, `4c/+`).
- [ ] A súgó szövege (`SHARED.GRADE_INPUT.HELP_BOULDER` / `HELP_ROPE`, minden nyelven) kimondja, hogy
      3–5-nél a betű opcionális, 6-tól kötelező — példával (pl. `5` vagy `5A`).
- [ ] Unit tesztek: `grade-scale.spec.ts` (VALID / AMBIGUOUS esetek, tartomány), 
      `climbing-grade-matrix.spec.ts` (monotonitás, új kulcsok).

## Terv / döntési napló

- Javítás a client-only mátrixban (`CLIMBING_GRADE_MATRIX`) — új kulcsok a 3–5 sávba; a regex
  valószínűleg változatlan maradhat. Nincs backend / Flyway / OpenAPI / outbox-payload változás (az index
  már integer, a fokozat-string szabad szöveg a szerveren).
- **Döntés (2026-10-17): nincs teljes index-átskálázás** (pl. ×2 / ×10). 6-tól felfelé minden
  skálán már ma is minden alfokozat külön egész indexet kap, így ott nem nyernénk felbontást; az
  átskálázás viszont minden tárolt indexet (kísérlet, hossz, beltéri út, szín-sáv határok), a boulder
  kcal-modell konstansait (`BOULDER_RELATIVE_BAND = 8`, `DEFAULT_BOULDER_REFERENCE_INDEX = 20`) és a
  volumen-előzményeket is érintené. A felhasználó jelezte, hogy jelenleg egyetlen, online eszköz van
  (nincs függő outbox-sor), tehát az átskálázás megoldható lenne — de nem éri meg, ezért marad a
  mostani skála.
- Helyette **csak az alsó sáv újraosztása**: a Font alja lejjebb vihető (a V-skála `VB = 8`-ig
  megy, elterjedt átváltás: Font 4 ≈ V0−, 5 ≈ V1, 6A ≈ V3), így a `3 … 6A` sávra kb. 12 egész hely
  jut; a francia `3 … 5a` sávra 8–9 hely.
- Tudatos korlát: a legalsó sávban néhány szomszédos al-fokozat így is ugyanarra az indexre eshet
  (a fokozat-piramisban egy sorba olvadnak, a felirat a gyakoribb beírt fokozat). Kcal-ra / volumenre
  érdemi hatása nincs; ilyen könnyű fokozatoknál a topók eltérése is nagyobb ennél.
- A Font és a francia bővítés egy jegyben, közös szabállyal (3–5: opcionális betű, 6-tól kötelező).
- Kapcsolódó: `backlog/024` (közös generált mátrix-JSON asset + szerver-oldali index) — ha az előbb
  készül el, az új kulcsok oda kerülnek.

## Lezáráskor (on-done)

- Frissített specek: [[Nehézségi szint skálája]] — 3–5 opcionális betű szabály, súgó; [[Nehézségi szint skálája (konverziós mátrix)]] — új alsó cellák + leképezés
- `IMPLEMENTATION_STATUS.md` sor: <dátum> — #155 Font + francia 3–5 opcionális betű
- Kód: `frontend/src/app/shared/climbing/{climbing-grade-matrix,grade-scale}.ts` (+ spec), i18n `SHARED.GRADE_INPUT.HELP_*`
