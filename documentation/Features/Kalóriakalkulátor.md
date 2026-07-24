# Kalóriakalkulátor

## Business

| | |
|---|---|
| **Státusz** | `Váz` |
| **Szülő** | [[Life Management 2.0]] |
| **Kapcsolódó** | [[Profile]], [[Edzés]], [[Mászónapló]], [[Biciklizés napló]], [[Lépésszám követés]], [[Úszás napló]], [[Étkezés]], [[Energiaegyenleg napló]], [[Backend-offline first]] |

### Célállapot

1. Az aznapi **elégetett** kalória kiszámítása a [[Profile]] és az aktivitás-naplók ([[Edzés]], [[Mászónapló]], [[Biciklizés napló]], [[Lépésszám követés]], [[Úszás napló]]) alapján.
2. A [[Profile]] alapján a **még bevihető** napi kalóriakeret kiszámítása.
3. Diagramok az egyenlegről / idősorokról.

### Funkcionális leírás

#### [[Úszás napló]] — offline kalóriaszámítás

A frontend Store és a backend szerviz az alábbi MET (Metabolic Equivalent of Task) konstansokat használja:

* `CASUAL` / `BREASTSTROKE`: 5.5 MET
* `BACKSTROKE`: 7.0 MET
* `CRAWL_FREESTYLE`: 8.0 MET
* `OPEN_WATER`: 9.5 MET
* `VIGOROUS` / `BUTTERFLY`: 11.0 MET

Számítási képlet:

$$\text{Égetett Kalória} = \text{MET} \times \text{Testsúly (kg)} \times \left( \frac{\text{durationMinutes}}{60} \right)$$

Mentéskor a kiszámított értékkel az optimista UI azonnal megemeli a mai bevihető keretet.

### UI/UX elvárások

- Diagramok az elégetett / bevihető / egyenleg megjelenítésére
- Offline becsült érték jelölés (lásd [[Backend-offline first]])

### Megjegyzések

Jelenleg csak az úszás MET tábla van kidolgozva; más aktivitások képletei hiányoznak.

### Nyitott kérdések

- Edzés / mászás / bicikli / lépés MET vagy egyéb képletek
- BMR / TDEE képlet a [[Profile]] mezőkből

## Architektúra

### Frontend

Pure TypeScript utility a MET / keret számításhoz (pragmatikus duplikáció — [[Backend-offline first]]); Store frissítés mentéskor.

#### Backend-offline

Számítás Backend-offline és Full-offline is (pure TS utility). Becsült / csak-online értékeknél ~ / homokóra. Store frissítés helyi; szerver érvényesítés outboxolható. Lásd [[Backend-offline first]].

### Backend

Ugyanazok a konstansok / képletek a szerveroldali szervizben; OpenAPI-n keresztül visszaadott / érvényesített értékek TBD.

### Nyitott kérdések

- Hol él a kanonikus számítás (mindig mindkét oldalon szinkronban tartva)?
