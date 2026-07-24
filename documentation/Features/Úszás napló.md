# Úszás napló

## Business

| | |
|---|---|
| **Státusz** | `Váz` |
| **Szülő** | [[Life Management 2.0]] |
| **Kapcsolódó** | [[Tápérték kalkulátor]], [[Profile]], [[Edzés]], [[Backend-offline first]] |

### Célállapot

Az úszóedzések részletes rögzítése; a távolság és az úszásnem alapú kalóriaégetés automatikus, offline is működő kiszámítása.

### Funkcionális leírás

Bemeneti paraméterek:

* `id`: UUID (v4)
* `date`: Date (alapértelmezetten a mai nap)
* `durationMinutes`: Integer (kötelező)
* `distanceMeters`: Integer (távolság méterben, pl. 1500)
* `poolLength`: Enum (`SHORT_25M`, `LONG_50M`, `OPEN_WATER`)
* `strokeType`: Enum (`BREASTSTROKE`, `CRAWL_FREESTYLE`, `BACKSTROKE`, `BUTTERFLY`, `MIXED`)
* `swimmingIntensity`: Enum (`CASUAL`, `VIGOROUS`)

Kalória MET tábla és képlet: [[Tápérték kalkulátor]].

### UI/UX elvárások

_Nincs UI/UX érintettség._

### Megjegyzések

_Nincs megjegyzés._

### Nyitott kérdések

- `strokeType` vs `swimmingIntensity` és MET mapping egyértelműsítése (lásd [[Tápérték kalkulátor]] konstansok)

## Architektúra

### Frontend

Napló űrlap; offline kalóriaszámítás utility; Edzés tab környékén.

#### Backend-offline

Napló űrlap + offline kalóriaszámítás utility Backend-offline / Full-offline. Mentés outboxba, kliens UUID. Lásd [[Backend-offline first]].

### Backend

Úszásnapló CRUD (OpenAPI, kliens UUID); szerveroldali kalória ellenőrzés / tárolás.

### Nyitott kérdések

Nincs nyitott kérdés.
