# Szöveges keresés

## Business

| | |
|---|---|
| **Státusz** | `Kész` |
| **Szülő** | [[Frontend]] |
| **Kapcsolódó** | [[Bevásárlás előzmény]], [[Pakolás]], [[Élelmiszerek]], [[Backend-offline first]] |

### Célállapot

Egységes szöveges keresési viselkedés a teljes alkalmazásban: kis/nagybetű-független, ékezet-független egyezés; ha a felhasználó ékezetesen keres, az ékezetileg pontosan egyező találatok a lista elejére kerülnek.

### Funkcionális leírás

Minden olyan UI, ahol „keresőmező” van (előzmények, katalógusok, listák, stb.), ezt a specre hivatkozva valósítja meg — kivéve ha az adott feature explicit mást ír elő.

#### Egyezés

1. **Kis- és nagybetű:** nincs különbség (`Alma` = `alma`).
2. **Ékezet:** az egyezéshez az ékezetes és nem ékezetes karakterek **egyenértékűek** (`alma` talál `álma`-t és fordítva; `arviz` talál `árvíz`-t).
3. A normalizálás a keresett szövegre és a keresendő mezőkre egyaránt vonatkozik.

#### Sorrendezés (ranking)

- Ha a felhasználó query-je **tartalmaz ékezetes** karaktert, az eredményeket úgy kell rendezni, hogy az **ékezetileg pontosan** (ékezet + betű szerint) egyező / jobb egyezésű találatok kerüljenek **előre**.
- Az ékezet-függetlenül egyező, de ékezetileg nem pontos találatok utánuk következnek.
- Ha a query **nem** tartalmaz ékezetet, nincs kötelező ékezet-pontos előresorolás (az egyezés továbbra is ékezet-független).

A konkrét „pontos ékezet egyezés” értelmezése: a találat mezőjének (vagy a releváns részének) ékezetes alakja közelebb áll / megegyezik a query ékezetes alakjával, mint a csak foldolt egyezés.

#### Alkalmazás

Első fogyasztók többek között: [[Bevásárlás előzmény]], később [[Élelmiszerek]] katalógus kereső, [[Pakolás]] kereső, stb.

### UI/UX elvárások

- Keresőmező; azonnali vagy rövid debounce-os szűrés (feature döntheti a debounce-ot; alapértelmezés: rövid debounce).
- Üres query: teljes (szűretlen) lista / alapnézet.

### Megjegyzések

Közös keresési szerződés — a megvalósítás lehet megosztott utility (normalize + compare + rank), nem feltétlenül egyetlen UI komponens.

### Nyitott kérdések

Nincs nyitott kérdés.

## Architektúra

### Frontend

- Pure TypeScript utility: ékezet-fold (pl. NFD + combining mark strip vagy magyar karaktertábla), case-fold, `matches(query, candidate)`, `compareRank(query, a, b)`.
- A listákat renderelő feature-ök ezt a utility-t hívják kliensoldali szűréshez / rendezéshez.
- Nagy adathalmaznál később szerveroldali keresés is jöhet; akkor is ugyanez a **viselkedési** szerződés marad (ékezet / case / ranking).

#### Backend-offline

Pure client komponens / utility; Backend-offline és Full-offline állapotban is ugyanúgy működik (helyi adat / form state). Nincs saját outbox. Lásd [[Backend-offline first]].

### Backend

_Nincs backend érintettség._ (első körben kliensoldali szűrés; ha később API search készül, az OpenAPI és a ranking szabályok ehhez a spechez igazodjanak)

### Nyitott kérdések

Nincs nyitott kérdés.
