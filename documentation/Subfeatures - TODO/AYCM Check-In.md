# AYCM Automatikus Check-In

## 1. Célállapot
A felhasználó a pontos belépési időpontja alapján kapja meg a bérletével kalkulált valós látogatási értéket anélkül, hogy manuálisan kellene idősávokat kiválasztania.

## 2. Automatikus Idősáv-illesztési Logika
A rendszer a dátum és a belépési időpont alapján határozza meg az árat.

### Szűrési szabály:
1. Az alkalmazás lekéri a megadott `checkInDate` napját (pl. Hétfő).
2. Megkeresi a kiválasztott partnerhez tartozó olyan árszabályokat, ahol a nap flag-je aktív (pl. `applies_mon == true`).
3. A találatok közül kiválasztja azt az egyet, ahol a megadott belépési időpont (`checkInTime`) a szabály határai közé esik:

$$\text{startTime} \le \text{checkInTime} < \text{endTime}$$

4. A megtakarítás mértéke a megtalált szabály `price_huf` + `extra_co_payment_huf` értéke lesz.

## 3. UI/UX Elvárások
* **Dátum mező:** Alapértelmezetten a mai nap.
* **Időpont mező:** Alapértelmezetten a jelenlegi pontos idő.
* **"[Most]" Gomb:** Egy kattintással frissíti az időpontot az aktuális óra/percre.
* **Reaktív Visszajelzés (Signal computed):** Amint a dátum, időpont és partner ki van választva, a felületen azonnal megjelenik zöld színnel a felismert idősáv és annak értéke (pl. *Csúcs időszak - 4200 Ft*).
* Ha az adott időpontra nincs konfigurált szabály, sárga figyelmeztetés jelenik meg, és a belépés 0 Ft-tal rögzül.
TODO: ÁTNÉZNI, EZ MÉG NEM VÉGLEGES!!