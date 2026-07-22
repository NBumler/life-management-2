# AYCM Check-In

## Business

| | |
|---|---|
| **Státusz** | `Váz` |
| **Szülő** | [[AYCM tracker]] |
| **Kapcsolódó** | [[AYCM elfogadóhely hozzáadása]], [[AYCM Statisztikák]], [[Rendszeres kiadások]] |

### Célállapot

A felhasználó a pontos belépési időpontja alapján kapja meg a bérletével kalkulált valós látogatási értéket anélkül, hogy manuálisan kellene idősávokat kiválasztania.

### Funkcionális leírás

Automatikus idősáv-illesztés: a rendszer a dátum és a belépési időpont alapján határozza meg az árat.

Szűrési szabály:

1. Az alkalmazás lekéri a megadott `checkInDate` napját (pl. Hétfő).
2. Megkeresi a kiválasztott partnerhez tartozó olyan árszabályokat, ahol a nap flag-je aktív (pl. `applies_mon == true`).
3. A találatok közül kiválasztja azt az egyet, ahol a megadott belépési időpont (`checkInTime`) a szabály határai közé esik:

$$\text{startTime} \le \text{checkInTime} < \text{endTime}$$

4. A megtakarítás mértéke a megtalált szabály `price_huf` + `extra_co_payment_huf` értéke lesz.

### UI/UX elvárások

* **Dátum mező:** Alapértelmezetten a mai nap.
* **Időpont mező:** Alapértelmezetten a jelenlegi pontos idő.
* **„[Most]” gomb:** Egy kattintással frissíti az időpontot az aktuális óra/percre.
* **Reaktív visszajelzés (Signal computed):** Amint a dátum, időpont és partner ki van választva, zöld színnel megjelenik a felismert idősáv és értéke (pl. *Csúcs időszak - 4200 Ft*).
* Ha az adott időpontra nincs konfigurált szabály, sárga figyelmeztetés, belépés 0 Ft-tal rögzül.

### Megjegyzések

Ez a specifikáció még nem végleges — átnézendő.

### Nyitott kérdések

- Árszabály modell véglegesítése ([[AYCM elfogadóhely hozzáadása]])

## Architektúra

### Frontend

Check-in űrlap; computed idősáv / ár megjelenítés.

### Backend

Check-in entitás + partner árszabályok lekérdezése (OpenAPI) — TBD.

### Nyitott kérdések

Nincs nyitott kérdés.
