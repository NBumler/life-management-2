# Pakolás

## Business

| | |
|---|---|
| **Státusz** | `Váz` |
| **Szülő** | [[GearCheck]] |
| **Kapcsolódó** | [[Sablonok]], [[Eszközök]] |

### Célállapot

Aktív pakolás indítása sablon(ok)ból, eszközök állapotának végigvezetése, lezárás.

### Funkcionális leírás

Pakolás megkezdése:

- egy vagy több [[Sablonok]] kiválasztása (kötelező)
- úticél megadása (opcionális)

Ha egy pakolás elkezdődik, a kiválasztott [[Sablonok]]hoz tartozó [[Eszközök]] fel lesznek sorolva.

Ha több sablont is kiválasztottunk és ugyanaz az eszköz több sablonban is szerepel, az összesített pakolásban a duplikációt ki kell szűrni (egyszer jelenhet meg).

Ha valamelyik kiválasztott sablon pakolás közben módosul, a futó pakolás eszközei **nem** módosulnak.

Folyamatban lévő pakolás közben csak arra a pakolásra lehet új [[Eszközök]] elemet hozzáadni. Duplikáció tilos: a selectben a már kiválasztott elemek disabled-ek, és a lista végére rendezve.

Pakolás eszközeinek állapotai és színkódok (Tailwind példák):

| Állapot | Jelentés | Szín |
|---|---|---|
| `NOT_PACKED` | Nincs bepakolva | Halvány piros |
| `KNOWN_LOCATION` | Tudom hol van | Sárgás / narancs |
| `PREPARED` | Táska mellé készítve | Világoskék |
| `WEAR_ON_DEPARTURE` | Induláskor veszem fel | Lila |
| `BUY_ON_THE_WAY` | Út közben kell venni | Barna / narancs |
| `PACKED` | Bepakolva | Zöld |
| `NOT_NEEDED` | Nem kell | Szürke |

Ha egy eszköz `PACKED` vagy `NOT_NEEDED` állapotba került, külön szekcióba kerül (kész / nem szükséges).

**Lezárás:** a pakolás hard delete az adatbázisból; confirmation dialog kötelező. Alatta: új egyéni eszköz hozzáadása ehhez a pakoláshoz.

### UI/UX elvárások

- UI tetején: keresés
- Keresés alatt: sorba rendezés gomb státusz szerint (`NOT_PACKED` → `KNOWN_LOCATION` → `PREPARED` → `WEAR_ON_DEPARTURE` → `BUY_ON_THE_WAY`); a `PACKED` / `NOT_NEEDED` szekciót nem rendezi
- Manuális újrarendezés: weben drag-and-drop; telefonon felfelé / lefelé nyilak az eszköz előtt
- Lezárás gomb a rendezés alatt; confirmation a hard delete előtt

### Megjegyzések

_Nincs megjegyzés._

### Nyitott kérdések

Nincs nyitott kérdés.

## Architektúra

### Frontend

Pakolás képernyő állapotgéppel; platformfüggő reorder (web vs mobil).

### Backend

Pakolás + pakolás-eszköz entitások; hard delete lezáráskor; [[Backend-offline first]].

### Nyitott kérdések

Nincs nyitott kérdés.
