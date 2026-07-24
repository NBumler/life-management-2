# Lépésszám átszinkronizálása a Samsung Health-ből

## Business

| | |
|---|---|
| **Státusz** | `Váz` |
| **Szülő** | [[Lépésszám követés]] |
| **Kapcsolódó** | [[Kalóriakalkulátor]], [[Backend-offline first]], [[Szinkronizációs központ]], [[Lépésszám kézzel manuálisan megadása]] |

### Célállapot

A telefon napi lépésszámának teljesen automatikus háttér-szinkronizálása a napi kalóriakeret dinamikus és pontos kiszámításához.

### Funkcionális leírás

#### Háttérfolyamat (Hourly Background Worker)

* Az alkalmazás háttérmunkással (`@capacitor/background-runner` vagy natív Android WorkManager) óránként egyszer lekéri a mai nap aktuális lépésszámát az Android **Health Connect** API-ból.
* Az adatokat átadja az `ActivityStepService`-nek.

#### Offline-first „Upsert” szabály (deduplikáció)

1. Ha a lépésszám frissítésekor a hálózat offline, az `OfflineQueueService` ellenőrzi, hogy van-e már aktív `PENDING` lépésszám-kérés a mai napra.
2. **Ha van:** nem ad hozzá új elemet, hanem frissíti a meglévő kérés payloadját az új, magasabb lépésszámmal.
3. **Ha nincs:** új `PENDING` kérést hoz létre a sorban.

#### Kliensoldali kalória

$$\text{Égetett kalória} = \text{Lépések száma} \times \text{Testsúly (kg)} \times 0.00045$$

Az értékkel az app azonnal frissíti a mai nap bevihető kalóriakeretét ([[Kalóriakalkulátor]]), online / offline függetlenül.

### UI/UX elvárások

_Nincs UI/UX érintettség._

### Megjegyzések

A külső Health Connect hívás közvetlenül a kliensről megy (nincs backend proxy).

### Nyitott kérdések

- iOS Health / egyéb platform támogatás
- Manuális vs szinkron prioritás (lásd [[Lépésszám kézzel manuálisan megadása]])

## Architektúra

### Frontend

Background runner + Health Connect; `ActivityStepService`; outbox upsert; kalória utility.

#### Backend-offline

Samsung synchez net kell (Backend-offline OK ha van internet; Full-offline vár). Saját backend írás outbox + napi upsert szabály. Lásd [[Backend-offline first]], [[Szinkronizációs központ]].

### Backend

Napi lépésszám upsert végpont (OpenAPI); kliens UUID / napi kulcs deduplikáció szerveren is TBD.

### Nyitott kérdések

Nincs nyitott kérdés.
