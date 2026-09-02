---
verifikalva:
verifikalt_commit:
---

# Nehézségi szint skálája (konverziós mátrix)

## Business

| | |
|---|---|
| **Státusz** | `Kész` |
| **Szülő** | [[Mászónapló]] |
| **Kapcsolódó** | [[Nehézségi szint skálája]], [[Mászónapló]], [[Tápérték kalkulátor]], [[Backend-offline first]] |

### Jelenlegi működés

Skálák → egységes belső numerikus index \(I_{\text{grade}}\) (`absoluteDifficultyIndex`) statisztikához és volumenhez. **A teljes mátrix JSON implementáció-időben előállítandó** (a repóban ma nincs kód, ez a fájl a specifikáció) — a lenti tábla a **kiindulási referencia-anchor**, a generálási módszer pedig az „Előállítási módszer" alfejezet. A JSON, ha egyszer elkészült, a repo SSOT-ja lesz; eddig ez a spec az.

### Funkcionális leírás

#### Referencia-anchor tábla

A skálák közti nehézség-egyeztetés eredendően szakértői-konszenzus kérdés (nincs zárt matematikai képlet, ami a boulder és a köteles skálákat összeméri) — publikált mászó-nehézségi összehasonlító táblázatok (pl. UIAA / terembeli grade-átváltó táblák) egymással is ±1 alfokozatot térhetnek el. Az alábbi anchor sorok ezt a general consensus-t rögzítik referenciaként:

| \(I_{\text{grade}}\) | Francia (kötél) | UIAA | Font (boulder) | V-Scale | YDS |
|---|---|---|---|---|---|
| 2 | 3 | III | — | — | 5.4 |
| 6 | 4 | IV | 4 | — | 5.6 |
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

> A `10`–`20` sorok az eredeti, kézzel megerősített öt anchor (nem módosultak); a többi sor ezek köré/fölé bővíti a táblát, szigorúan növekvő indexekkel, ismétlődő fokozat-címke nélkül.

#### Előállítási módszer (a JSON-hoz)

1. Válassz **egy** konzisztens, publikált skálaegyeztető forrást (pl. egy elismert terem / szövetségi grade-táblázat) a hiányzó alfokozatok (pl. `6a+`, `V2.5` közi lépések) kitöltéséhez — **ne** keverj több forrást egy skálapáron belül.
2. Minden felismert alfokozat egy egyedi, **szigorúan növekvő** egész `I_grade`-et kap; a lépések **köztudottan nem egyenletesek** (a nehézség-érzet nem lineáris a fokozatokkal) — ez szándékos, nem hiba.
3. A fenti anchor sorok értékei **kötöttek** (nem módosíthatók a JSON generálásakor); közéjük / köréjük a választott forrás szerint kell interpolálni.
4. A generált JSON-t mindkét oldal (kliens parser + szerver validáció) ugyanabból a fájlból tölti be — [[Backend-offline first]] §15 (build asset).

**Volumen** ([[Mászónapló]]) — **kísérletenkénti** összegzés, nem session-szintű egy `I_grade`-del szorzás:

- Kötél: \(\text{Volume} = \sum_{\text{sikeres kísérletek}} \text{mászott méter}_i \times I_{\text{grade},i}\)
- Boulder: \(\text{Volume} = \sum_{\text{sikeres kísérletek}} 4\,\text{m} \times I_{\text{grade},i}\)

**Indoor szín-sáv reprezentatív index (kötelező szabály):** az admin a szín-sávhoz alsó és felső `I_grade` határt vesz fel (`lowIndex`, `highIndex`); a napló ezt a tartományt snapshotolja. A kísérlet `absoluteDifficultyIndex`-e a volumenhez és a statisztikához:

\[I_{\text{grade}} = \left\lfloor \frac{lowIndex + highIndex}{2} \right\rfloor\]

(egész lefelé kerekítés — determinisztikus, klienst és szervert egyaránt köti).

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

Ugyanaz a repo JSON startup seed / cache; mentéskori index számítás paritás a klienssel.

### Nyitott kérdések

Nincs nyitott kérdés.
