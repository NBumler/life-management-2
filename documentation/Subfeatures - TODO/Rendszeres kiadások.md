# Rendszeres Kiadások (Subscriptions & Fixed Costs)

## 1. Célállapot
Minden rendszeres, fix időközönként ismétlődő kiadás (streaming szolgáltatások, edzőtermi bérletek, biztosítások) központi adminisztrációja, amely a [[Pénzügyek]] modul és az [[AYCM tracker]] közös Single Source of Truth (SSOT) alapját képezi.

## 2. Adatstruktúra
Minden előfizetés az alábbi kötelező adatokkal rendelkezik:
* `id`: UUID (v4) - Kliensoldalon generált
* `name`: String (pl. "AYCM XXL bérlet", "Netflix")
* `amountHuf`: Integer (Fix összeg forintban)
* `frequency`: Enum (`MONTHLY`, `QUARTERLY`, `YEARLY`)
* `category`: Enum (`ENTERTAINMENT`, `SPORT`, `UTILITIES`, `INSURANCE`)
* `nextBillingDate`: Date

## 3. Építészeti Összeköttetés (Az AYCM Kapocs)
* Az itt rögzített előfizetések listáját használja fel az `AYCM tracker` setup képernyője.
* Ha az AYCM egy éves bérlet, az itteni `amountHuf` és `frequency` alapján számolja ki a rendszer dinamikusan a havi leosztott költséget, elkerülve az adatok duplázását.
* A [[AYCM tracker]] feature specifikációjába is be van vezetve ez az SSOT kapcsolat.

## 4. UI/UX és Offline működés
* A listában szereplő tételek csúsztatással (`ion-item-sliding`) törölhetőek vagy inaktiválhatóak.
* Offline rögzítés esetén a kérés bekerül az `OfflineQueueService` sorába.
