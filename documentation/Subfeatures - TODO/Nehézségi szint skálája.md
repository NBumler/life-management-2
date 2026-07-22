Business:
#### Köteles mászás (Sport és Trad)
- Francia skála (French)
	- Számokból, betűkből (a, b, c) és egy opcionális plusz (+) jelből áll (pl. 6a, 6a+, 6b)
- YDS (Yosemite Decimal System)
	- 5-össel kezdődik (az 1–4-ig terjedő skála az max túra), amit egy pont és a nehézségi fok követ (pl. 5.8, 5.9). 5.10 felett itt is belépnek a betűk pontosításként: 5.10a, 5.10b, 5.10c, 5.10d.
- UIAA skála
	- Római számokkal és + / - jelekkel jelölik (pl. VI-, VII, VII+).

#### Boulder skálák

- Fontainebleau (Font) skála
	- Hasonlít a francia sportskálára (szám + betű + plusz), de óriási csapda: a boulder betűit mindig NAGYBETŰVEL írják (pl. 6A, 6B, 7A), és egy 6A boulder mozdulatai sokkal nehezebbek, mint egy 6a köteles úté!
- V-Skála (Hueco)
	- Egy V betűből és egy számból áll (V0, V1, V2 ... V17)

Architektúra:
Input mezőben elég tudni a mászás típusát és string-ként a nehézség, mert regex pattern matching segítségével automatikusan felismerhető milyen skálában lett megadva a nehézség:
Boulder:
- ​`^V\d+$` (pl. V3, V10) -> Egyértelműen V-Skála. Ha V-vel kezdődik, nincs min gondolkodni.
- `^\d[A-C]\+?$` (pl. 6A, 7B+) -> Egyértelműen Font. Szám + Nagybetű + opcionális plusz.
Köteles:
- `​^5\.\d+[a-d]?$` (pl. 5.9, 5.10a) -> Egyértelműen YDS. Ha 5.-tel kezdődik, az amerikai.
- `^\d[a-c]\+?$` (pl. 6a+, 7b) -> Egyértelműen Francia. Szám + kisbetű + opcionális plusz.
- `^[IVXLCDM]+[-+]?$` (pl. VI+, VIII-) -> Egyértelműen UIAA. Római számok.

UI és működés:
1. UI Komponensek és Elrendezés
 * A komponens Input-ként megkapja, hogy: Köteles vagy Boulder.
 * Input Mező: Egy ion-input (type="text").
   * A jobb szélén egy slot="end" attribútummal ellátott postfix gomb (ion-button vagy ion-icon), ami az input aktuális állapotától függően változik.
 * Suggestion Container: Közvetlenül az input mező alatt elhelyezkedő rugalmas konténer, amely dinamikusan jeleníti meg a javaslatokat ion-chip komponensek formájában.
2. Dinamikus Állapotgép (Input-Driven State Machine)
A felhasználó gépelése közben a rendszer 250 ms-os késleltetéssel (debounceTime) elemzi a szöveget, és a következő 4 állapot egyikébe sorolja az inputot:
A) Üres Állapot (Input string hossza == 0)
 * Postfix: Nem jelenik meg semmi.
 * Javaslatok: Nincsenek.
 * Validáció: INVALID (Az űrlap nem küldhető be).
B) Egyértelmű Állapot (A Regex pontosan egy skálára illeszkedik)
 * Postfix: A felismert skála rövidített neve (pl. FRA, YDS, UIAA, V, FONT).
 * Postfix Interakció: Kattintásra egy ion-popover jelenik meg egy rövid, egysoros leírással (pl. "Ez egy francia sportmászó fokozat."). A popover a képernyő mellékattintásával záródik.
 * Javaslatok: Nincsenek.
 * Validáció: VALID.
C) Kétértelmű / Ambiciózus Állapot (A bemenet egy tiszta szám, pl. "4" vagy "6")
 * Postfix: A lehetséges skálák perjellel elválasztva (pl. UIAA / FRA).
 * Postfix Interakció: Kattintásra egy ion-modal (vagy bottom-sheet) nyílik meg.
   * Tartalma: Elmagyarázza, hogy a sima számok több skálát is jelenthetnek, és leírja a rendszerszintű alapértelmezett működést (Fallback szabályok).
 * Javaslatok (Chips): Az input alatt megjelennek a konvertált, szabályos formátumú chipek.
   * Köteles + "6" esetén: VI (UIAA) és 6a (Francia)
   * Köteles + "4" esetén: IV (UIAA) és 4 (Francia)
 * Chip Interakció: Ha a felhasználó rákattint egy chipre, a rendszer felülírja az input mező tartalmát a kiválasztott pontos formátumra (pl. a 6-ból 6a lesz), ezáltal az input azonnal átvált az Egyértelmű Állapotba.
 * Üzleti / Validációs Fallback szabályok (Ha a júzer nem kattint chipre, csak továbblép):
   * Ha a bemenet "6": A validáció INVALID. A sima 6-os francia skálán nem értelmezhető betű nélkül, így ezt kötelező javítani.
   * Ha a bemenet "4" (vagy "5"): A validáció VALID. A rendszer alapértelmezetten Francia skálaként menti el a DB-be.
D) Ismeretlen Állapot (A szöveg nem illeszkedik semmilyen mintára, pl. "xyz")
 * Postfix: Egy kérdőjel ikon (ion-icon - name="help-circle-outline").
 * Postfix Interakció: Kattintásra egy ion-modal ugrik fel (Súgó).
   * Tartalma: Kilistázza a támogatott skálákat és mutat 1-2 példát a helyes szintaxisra (pl. "Példák YDS-re: 5.9, 5.10a").
 * Javaslatok: Nincsenek.
 * Validáció: INVALID.
3. Mobil-specifikus Korrekciós Logika (Pre-parsing)
Mielőtt a Regex kiértékelné a szöveget, a háttérben a következő transzformációk futnak le, hogy kiküszöböljék a mobil billentyűzetek automata javításait:
 * Ha a kiválasztott típus Boulder, a beírt szöveget a rendszer automatikusan NAGYBETŰSSÉ alakítja (hogy a 6a gépelésből 6A legyen a Font skála miatt).
 * Ha a kiválasztott típus Köteles, a beírt betűket (a, b, c) a rendszer automatikusan kisbetűssé alakítja (kivéve a római számok karaktereit: I, V, X).
 * A string eleji és végi white-space-ek automatikusan törlődnek (trim()).

Backend:
[[Nehézségi szint skálája (konverziós mátrix)]]
