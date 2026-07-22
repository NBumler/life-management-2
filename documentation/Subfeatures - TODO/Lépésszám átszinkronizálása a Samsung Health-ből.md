# Lépésszám Szinkronizáció (Samsung Health / Health Connect)

## 1. Célállapot
A telefon napi lépésszámának teljesen automatikus háttér-szinkronizálása a napi kalóriakeret dinamikus és pontos kiszámításához.

## 2. Háttérfolyamat (Hourly Background Worker)
* Az alkalmazás egy háttérmunkás segítségével (`@capacitor/background-runner` vagy natív Android WorkManager) óránként egyszer lekéri a mai nap aktuális lépésszámát az Android **Health Connect** API-ból.
* Az adatokat átadja az `ActivityStepService`-nek.

## 3. Offline-First "Upsert" Szabály (Deduplikáció)
Mivel az alkalmazás offline-first, a háttérszolgáltatás offline módban is ment. A sor elárasztásának elkerülése érdekében az alábbi szabály érvényes:
1. Ha a lépésszám frissítésekor a hálózat offline, az `OfflineQueueService` ellenőrzi, hogy van-e már aktív `PENDING` lépésszám-kérés a mai napra.
2. **Ha van:** Nem ad hozzá új elemet, hanem frissíti a meglévő kérés payloadját az új, magasabb lépésszámmal.
3. **Ha nincs:** Új `PENDING` kérést hoz létre a sorban.

## 4. Kliensoldali Kalória Kalkuláció
A lépések beolvasásakor a frontend azonnal és optimistán újraszámolja a lépésekért járó kalóriát:

$$\text{Égetett kalória} = \text{Lépések száma} \times \text{Testsúly (kg)} \times 0.00045$$

Az értékkel az app azonnal frissíti a mai nap bevihető kalóriakeretét a főképernyőn, függetlenül attól, hogy online vagy offline vagyunk.
[[Kalóriakalkulátor]]
