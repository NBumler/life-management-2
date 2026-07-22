# Úszásnapló (Swimming Log)

## 1. Célállapot
Az úszóedzések részletes rögzítése, a távolság és az úszásnem alapú kalóriaégetés automatikus, offline is működő kiszámítása.

## 2. Bemeneti Paraméterek
* `id`: UUID (v4)
* `date`: Date (Alapértelmezetten a mai nap)
* `durationMinutes`: Integer (Kötelező)
* `distanceMeters`: Integer (Távolság méterben, pl. 1500)
* `poolLength`: Enum (`SHORT_25M`, `LONG_50M`, `OPEN_WATER`)
* `strokeType`: Enum (`BREASTSTROKE`, `CRAWL_FREESTYLE`, `BACKSTROKE`, `BUTTERFLY`, `MIXED`)
* `swimmingIntensity`: Enum (`CASUAL`, `VIGOROUS`)