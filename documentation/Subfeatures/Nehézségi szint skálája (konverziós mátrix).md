# Nehézségi szint skálája (konverziós mátrix)

## Business

| | |
|---|---|
| **Státusz** | `Kész` |
| **Szülő** | [[Mászónapló]] |
| **Kapcsolódó** | [[Nehézségi szint skálája]], [[Mászónapló]], [[Tápérték kalkulátor]], [[Backend-offline first]] |

### Célállapot

Skálák → egységes belső numerikus index \(I_{\text{grade}}\) (`absoluteDifficultyIndex`) statisztikához és volumenhez. A teljes mátrix **JSON** a repo SSOT; a lenti tábla részleges példa.

### Funkcionális leírás

| \(I_{\text{grade}}\) | Francia (kötél) | UIAA | Font (boulder) | V-Scale |
|---|---|---|---|---|
| 10 | 5a | V | 4 | V0 |
| 14 | 6a | VI | 5 | V2 |
| 16 | 6b | VII- | 6A | V3 |
| 18 | 6c | VII | 6B | V4 |
| 20 | 7a | VIII- | 6C | V5 |

**Volumen** ([[Mászónapló]]):

- Kötél: \(\text{Volume} = \text{mászott méter} \times I_{\text{grade}}\)
- Boulder: \(\text{Volume} = (\text{sikeres kísérletek} \times 4\,\text{m}) \times I_{\text{grade}}\)

Indoor szín-sáv: az admin alsó/felső grade → index tartomány; napló snapshotolja a tartományt; volumenhez reprezentatív index (pl. tartomány közepe) — implementációs részlet a JSON szabályokkal.

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
