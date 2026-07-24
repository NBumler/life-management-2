# Ismeretlen forrású étkezés

## Business

| | |
|---|---|
| **Státusz** | `TODO` |
| **Szülő** | [[Étkezés]] |
| **Kapcsolódó** | [[Energiaegyenleg napló]], [[Kalóriakalkulátor]], [[Élelmiszer tárolás]], [[Backend-offline first]] |

### Célállapot

Étkezés rögzítése, amikor nincs ismert [[Recept]] vagy [[Élelmiszerek]] tétel (pl. éttermi étel, vendégség). A felhasználó manuálisan adja meg legalább a kalóriát (és opcionálisan a makrókat).

### Funkcionális leírás

Ismeretlen forrású étkezés **nem** módosítja az [[Élelmiszer tárolás]] készletet.

### UI/UX elvárások

_Nincs UI/UX érintettség._

### Megjegyzések

_Nincs megjegyzés._

### Nyitott kérdések

- Kötelező / opcionális mezők listája
- Becsült vs pontos érték jelölése a UI-on
- Kapcsolat az [[Energiaegyenleg napló]] / [[Kalóriakalkulátor]] megjelenítésével

## Architektúra

### Frontend

Manuális kalória / makro űrlap; nincs készlet-művelet.

#### Backend-offline

Backend-offline és Full-offline: olvasás/írás a helyi store-on; módosító kérések outboxba (`OfflineQueueService`), kliens UUID. Sync: [[Szinkronizációs központ]]. Lásd [[Backend-offline first]].

### Backend

_Nincs backend érintettség._

### Nyitott kérdések

Nincs nyitott kérdés.
