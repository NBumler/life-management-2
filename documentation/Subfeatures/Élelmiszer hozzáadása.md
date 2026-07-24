# Élelmiszer hozzáadása

## Business

| | |
|---|---|
| **Státusz** | `Kész` |
| **Szülő** | [[Élelmiszerek]] |
| **Kapcsolódó** | [[Vonalkódos élelmiszer beolvasás]], [[Élelmiszer manuális bevitele]], [[Élelmiszer importálása clipboard-ról]], [[Backend-offline first]] |

### Célállapot

Új [[Élelmiszerek]] tétel felvétele több bemeneti csatornán keresztül; a végleges adatbevitel / mentés az [[Élelmiszer manuális bevitele]] űrlapon történik (előtöltve vagy üresen).

### Funkcionális leírás

Csatornák:

- [[Élelmiszer manuális bevitele]] — üres űrlap (egy tétel)
- [[Vonalkódos élelmiszer beolvasás]] — scan → OFF előtöltés → [[Élelmiszer manuális bevitele]]
- [[Élelmiszer importálása clipboard-ról]] — TSV beillesztés → előnézet → tömeges create (saját képernyő, nem az egyedi űrlap)

Kötelező mezők / duplikáció: [[Élelmiszerek]] (és manuális űrlapnál: [[Élelmiszer manuális bevitele]]).

Backend-offline: a csatornák és a mentés is támogatott (OFF híváshoz net kell; teljes offline: manuális / clipboard / késleltetett OFF — lásd [[Vonalkódos élelmiszer beolvasás]]).

### UI/UX elvárások

Belépő / választó a három módhoz (vagy közvetlen FAB a vonalkódra + „új” a manuálishoz + clipboard import belépő).

### Megjegyzések

_Nincs megjegyzés._

### Nyitott kérdések

Nincs nyitott kérdés.

## Architektúra

### Frontend

Router / action sheet / FAB a csatornákhoz; navigáció az [[Élelmiszer manuális bevitele]] formra query/state előtöltéssel.

#### Backend-offline

Backend-offline és Full-offline: olvasás/írás a helyi store-on; módosító kérések outboxba (`OfflineQueueService`), kliens UUID. Sync: [[Szinkronizációs központ]]. Lásd [[Backend-offline first]].

### Backend

_Nincs backend érintettség._ (create az [[Élelmiszerek]] / [[Élelmiszer manuális bevitele]] API-ján)

### Nyitott kérdések

Nincs nyitott kérdés.
