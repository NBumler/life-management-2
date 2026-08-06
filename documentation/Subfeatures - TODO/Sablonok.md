# Sablonok

## Business

| | |
|---|---|
| **Státusz** | `TODO` |
| **Szülő** | [[GearCheck]] |
| **Kapcsolódó** | [[Eszközök]], [[Pakolás]], [[Bejelentkezés]], [[Backend-offline first]] |

### Célállapot

Pakolási sablonok: elnevezett [[Eszközök]] listák (pl. „Hétvégi mászás”, „Tél”). A [[Pakolás]] egy vagy több sablonból indul.

**Ownership:** **user-owned** — [[Bejelentkezés]].

### Funkcionális leírás

_Nincs business érintettség._

### UI/UX elvárások

_Nincs UI/UX érintettség._

### Megjegyzések

- **Sablon törlés (elvárás, részletezendő a spechez):** hard delete a sablonra + sablon-tételekre; futó [[Pakolás]] érintetlen; [[Eszközök]] katalógus nem törlődik.
- **Eszköz törlés:** a sablon-tételekből hard cascade — [[Eszközök]].

### Nyitott kérdések

- Sablon szerkesztése futó pakolás közben (a [[Pakolás]] szerint a futó lista nem változik)
- Üres sablon engedélyezett-e

## Architektúra

### Frontend

Sablon CRUD UI.

#### Backend-offline

Backend-offline és Full-offline: olvasás/írás a helyi store-on; módosító kérések outboxba (`OfflineQueueService`), kliens UUID. Sync: [[Szinkronizációs központ]]. Lásd [[Backend-offline first]].

### Backend

_Nincs backend érintettség._

### Nyitott kérdések

Nincs nyitott kérdés.
