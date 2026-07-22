## 1. Célállapot
A különböző mászóstílusok (Indoor/Outdoor és Boulder/Köteles) nehézségi skáláinak egységes kezelése, hogy a statisztikákban az edzésvolumen megfelelően súlyozható legyen.

## 2. Támogatott Skálák és Leképzés
Az alkalmazás az alábbi skálákat kezeli, amelyeket a háttérben egy egységes belső numerikus indexre ($I_{grade}$) képez le a rendszer a statisztikai számításokhoz:

| Belső Index ($I_{grade}$) | Francia (Köteles) | UIAA (Outdoor) | Font (Boulder) | V-Scale (USA) |
|---|---|---|---|---|
| 10 | 5a | V | 4 | V0 |
| 14 | 6a | VI | 5 | V2 |
| 16 | 6b | VII- | 6a | V3 |
| 18 | 6c | VII | 6b | V4 |
| 20 | 7a | VIII- | 6c | V5 |

## 3. UI/UX Folyamat
* Amikor a felhasználó új mászónaplót rögzít (pl. `Indoor - boulder`), a nehézségi szint dropdown **csak az adott stílushoz releváns** skálát mutatja (pl. Font vagy színkód).
* Nem kell manuálisan begépelni a fokozatot, egy gördülő szelektor (`ion-select`) biztosítja a gyors, mobilbarát kiválasztást.

## 4. Adatmodell paritás
A skálák statikus erőforrásként a frontend és a backend oldalon is JSON formátumban vannak deklarálva, így offline módban is azonnal elérhető az illesztés és az edzésvolumen ($Vol = \text{Mászott méter} \times I_{grade}$) kiszámítása.
