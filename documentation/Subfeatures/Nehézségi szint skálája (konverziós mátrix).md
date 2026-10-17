---
verifikalva: 2026-10-17
verifikalt_commit: 79665b0
---

# Nehézségi szint skálája (konverziós mátrix)

## Business

| | |
|---|---|
| **Státusz** | `Kész` |
| **Szülő** | [[Mászónapló]] |
| **Kapcsolódó** | [[Nehézségi szint skálája]], [[Mászónapló]], [[Tápérték kalkulátor]], [[Backend-offline first]] |

### Jelenlegi működés

Skálák → egységes belső numerikus index \(I_{\text{grade}}\) (`absoluteDifficultyIndex`) statisztikához és volumenhez. A mátrix **megvalósítva** `shared/climbing/climbing-grade-matrix.ts` **client-only TS const**-ként (`FRENCH` / `YDS` / `UIAA` / `FONT` / `V_SCALE`), nem külön `shared/fixtures/*.json` asset. A Font alsó cellák a V-skála anchorjaihoz igazítva (`backlog/155`: `3`=5, `4`=8, `4C+`=10≈V0, `5`=12≈V1, `5C`=14≈V2, `6A`=16≈V3); a `6B=18 … 8B=40` önkonzisztens farok verbatim. A francia és a Font `3`–`5` fok opcionális al-betűs alakjai (`3a`…`5c+`, `3A`…`5C+`) is a mátrixban vannak — lásd lent „Alsó sáv (3–5)". Közös generált JSON asset + szerver-oldali betöltés tervezett: `backlog/024-climbing-grade-matrix-kozos-generalt-json-asset-backend-index-uj.md`.

### Funkcionális leírás

#### Referencia-anchor tábla

A skálák közti nehézség-egyeztetés eredendően szakértői-konszenzus kérdés (nincs zárt matematikai képlet, ami a boulder és a köteles skálákat összeméri) — publikált mászó-nehézségi összehasonlító táblázatok (pl. UIAA / terembeli grade-átváltó táblák) egymással is ±1 alfokozatot térhetnek el. Az alábbi anchor sorok ezt a general consensus-t rögzítik referenciaként:

| \(I_{\text{grade}}\) | Francia (kötél) | UIAA | Font (boulder) | V-Scale | YDS |
|---|---|---|---|---|---|
| 2 | 3 | III | — | — | 5.4 |
| 6 | 4 | IV | 4 | — | 5.6 |
| 8 | — | — | — | VB | — |
| 10 | 5a | V | 4 | V0 | 5.8 |
| 12 | 5c | VI- | 6A | V1 | 5.9 |
| 14 | 6a | VI | 5 | V2 | 5.10a |
| 16 | 6b | VII- | 6A | V3 | 5.10c |
| 18 | 6c | VII | 6B | V4 | 5.11a |
| 20 | 7a | VIII- | 6C | V5 | 5.11c |
| 22 | 7a+ | VIII | 6C+ | V6 | 5.11d |
| 24 | 7b | IX- | 7A | V7 | 5.12b |
| 26 | 7b+ | IX | 7A+ | V8 | 5.12c |
| 28 | 7c | IX+ | 7B | V9 | 5.12d |
| 30 | 7c+ | X- | 7B+ | V10 | 5.13a |
| 32 | 8a | X | 7C | V11 | 5.13b |
| 34 | 8a+ | X+ | 7C+ | V12 | 5.13c |
| 36 | 8b | XI- | 8A | V13 | 5.13d |
| 38 | 8b+ | XI | 8A+ | V14 | 5.14a |
| 40 | 8c | XI+ | 8B | V15 | 5.14b |

> A V-skála legalsó fokozata a `VB` („V-Basic”, a `V0` alatt) — `I_grade = 8`, egy V-lépésköz (2) a `V0` alatt.
>
> A `10`–`20` sorok az eredeti, kézzel megerősített öt anchor (nem módosultak); a többi sor ezek köré/fölé bővíti a táblát, szigorúan növekvő indexekkel, ismétlődő fokozat-címke nélkül.
>
> A Font oszlop alsó cellái (`4`, `6A`, `5` a 6–14 sorokban) a forrás-konszenzus ellentmondásos értékei; a megvalósított Font-létra a V-skálához igazodik — lásd „Alsó sáv (3–5)".

#### Alsó sáv (3–5) — opcionális al-betű (`backlog/155`)

Francia és Font jelölésben `3`–`5` fokon az al-betű (`a`–`c` / `A`–`C`, opcionális `+`) **opcionális**, `6`-tól kötelező. A sávban több felismert fokozat van, mint szabad egész index, ezért itt **szomszédos fokozatok osztozhatnak egy indexen** (a tábla sorrendjében az index sosem csökken). `6a` / `6A` fölött és minden más skálán továbbra is minden fokozat egyedi indexet kap.

| \(I_{	ext{grade}}\) | Francia | Font |
|---|---|---|
| 1 | 3a, 3a+ | — |
| 2 | **3**, 3b | — |
| 3 | 3b+, 3c | — |
| 4 | 3c+ | 3A, 3A+ |
| 5 | 4a, 4a+ | **3**, 3B, 3B+ |
| 6 | **4**, 4b | 3C |
| 7 | 4b+ | 3C+, 4A |
| 8 | 4c, 4c+ | 4A+, **4**, 4B |
| 9 | **5** | 4B+, 4C |
| 10 | 5a, 5a+ | 4C+ |
| 11 | 5b, 5b+ | 5A, 5A+ |
| 12 | 5c | **5**, 5B |
| 13 | 5c+ | 5B+ |
| 14 | 6a | 5C |
| 15 | 6a+ | 5C+ |
| 16 | 6b | 6A |

A csupasz francia `3`/`4`/`5` indexe nem változott; a Font csupasz `3`/`4`/`5` a korábbi `10`/`12`/`14`-ről `5`/`8`/`12`-re került. A már tárolt értékeket a `V53__climbing_grade_index_low_band.sql` egyszer újraszámolta (Font szín-sávok csupasz 3/4/5 határai és a belőlük snapshotolt boulder-kísérlet indexek, ha a snapshot még a sávból származott; index nélkül mentett francia al-betűs köteles kísérletek és hosszak pótlása).

#### Előállítási módszer (a JSON-hoz)

1. Válassz **egy** konzisztens, publikált skálaegyeztető forrást (pl. egy elismert terem / szövetségi grade-táblázat) a hiányzó alfokozatok (pl. `6a+`, `V2.5` közi lépések) kitöltéséhez — **ne** keverj több forrást egy skálapáron belül.
2. Minden felismert alfokozat egy egyedi, **szigorúan növekvő** egész `I_grade`-et kap (kivétel: a francia / Font `3`–`5` sáv, ahol szomszédos fokozatok osztozhatnak — „Alsó sáv (3–5)"); a lépések **köztudottan nem egyenletesek** (a nehézség-érzet nem lineáris a fokozatokkal) — ez szándékos, nem hiba.
3. A fenti anchor sorok értékei **kötöttek** (nem módosíthatók a JSON generálásakor); közéjük / köréjük a választott forrás szerint kell interpolálni.
4. Jelenleg csak a kliens tölti be (a TS const-ból); szerver-oldali paritás-betöltés nincs — `backlog/024-climbing-grade-matrix-kozos-generalt-json-asset-backend-index-uj.md`.

**Volumen** ([[Mászónapló]]) — **kísérletenkénti** összegzés, nem session-szintű egy `I_grade`-del szorzás:

- Kötél: \(\text{Volume} = \sum_{\text{sikeres kísérletek}} \text{mászott méter}_i \times I_{\text{grade},i}\)
- Boulder: \(\text{Volume} = \sum_{\text{sikeres kísérletek}} 4\,\text{m} \times I_{\text{grade},i}\)

**Indoor szín-sáv reprezentatív index (kötelező szabály):** az admin a szín-sávhoz alsó és felső `I_grade` határt vesz fel (`lowIndex`, `highIndex`); a napló ezt a tartományt snapshotolja. A kísérlet `absoluteDifficultyIndex`-e a volumenhez és a statisztikához:

\[I_{\text{grade}} = \left\lfloor \frac{lowIndex + highIndex}{2} \right\rfloor\]

(egész **lefelé** kerekítés — determinisztikus, klienst és szervert egyaránt köti). A kötelező `floor` a `colorBandMidIndex()` helperben (`shared/climbing/climbing-grade-matrix.ts`) él és tesztelt; az `indoor-boulder-session-edit.page.ts` `resolveIndex()` ezt a helpert hívja (a volumen-modellhez és a mentett `absoluteDifficultyIndex` snapshothoz egyaránt), így páratlan `low+high` összegnél is a lefelé kerekített közép jön ki.

**„/"-elválasztott kalauz-tartomány feloldása (kötelező szabály, `backlog/085`):** egy `VIII/VIII+`,
`6c/6c+`, `V4/V5` (ill. rövidített `7a/+`, `6a/b`) alakú `guidebookGrade` átváltásakor a két végpont
mátrix-indexének **lefelé kerekített közepe** a levezetett `absoluteDifficultyIndex` — ugyanaz a
`⌊(a+b)/2⌋` szabály, mint a szín-sávnál. Mindkét végpont ugyanabban a skálában; ha csak az egyik van
a mátrixban, az az index; egyik sem → nincs index (`UNKNOWN`). Kliensoldali (`grade-scale.ts`
`parseSlashRange`); a `guidebookGrade` nyers string marad. Ha a szerver-oldali grade-index paritás
elkészül (`backlog/024`), ez a szabály a mátrix-táblával együtt kerül át a megosztott fixture-be.

### UI/UX elvárások

- Kontextus napló: releváns skála / szín; parser: [[Nehézségi szint skálája]].
- Opcionális `ion-select` a mátrix fokozataiból.

### Megjegyzések

Teljes fokozatlista a JSON-ban; spech nem másolja ki az összes sort.

### Nyitott kérdések

Nincs nyitott kérdés.

## Architektúra

### Frontend

Static JSON asset a buildben; offline illesztés + volumen.

#### Backend-offline

Nincs outbox; pure mapping. Lásd [[Backend-offline first]].

### Backend

Jelenleg **nincs** szerver-oldali mátrix-betöltés vagy mentéskori index-újraszámítás — a szerver az `absoluteDifficultyIndex`-et verbatim tárolja. Mátrix-változáskor a tárolt értékeket egyszeri Flyway adat-migráció igazítja (első: `V53`, `backlog/155`); az érintett sorok `updated_at`-je a triggertől frissül, így delta-pullal jutnak az eszközökre. Paritás tervezett: `backlog/024-climbing-grade-matrix-kozos-generalt-json-asset-backend-index-uj.md`.

### Nyitott kérdések

Nincs nyitott kérdés.
