Egy pakolás megkezdését az alábbival tudjuk:
- egy vagy több [[Sablonok]] kiválasztása (kötelező)
- úticél megadása (opcionális)

Ha egy pakolás elkezdődik, akkor a kiválasztott [[Sablonok]]hoz tartozó [[Eszközök]] fel lesznek sorolva.

Ha több sablont is kiválasztottunk a pakoláshoz és ugyanazt az eszközt több sablon is tartalmazza, akkor az összesített pakolásban a duplikációt ki kell szűrni, és egyszer jelenhet meg az eszköz.

Ha valamelyik kiválasztott sablon pakolás közben módosul, attól még a pakolás eszközei nem módosulnak.

Folyamatban lévő pakolás közben lehetőség van csak arra a pakolásra hozzáadni egy új [[Eszközök]] elemet. Mivel nincs lehetőség egy elem duplikált hozzáadására, ezért a megjelenő select element disabled-ként mutassa a már kiválasztott elemeket, és rendezze a lista legvégére.

Pakolás indítása után tehát létrejönnek a pakolás eszközei; mindegyik eszközhöz az alábbi állapotok léteznek:
Állapotok és Színkódok (Tailwind példák):
NOT_PACKED (Nincs bepakolva) -> Halvány piros háttér.
KNOWN_LOCATION (Tudom hol van) -> Sárgás/Narancs.
PREPARED (Táska mellé készítve) -> Világoskék.
WEAR_ON_DEPARTURE (Induláskor veszem fel) -> Lila.
BUY_ON_THE_WAY (Út közben kell venni, pl. magnézia/energiaital) -> Barna/Narancs.
PACKED (Bepakolva) -> Zöld háttér.
NOT_NEEDED -> Szürke háttér

Ha egy eszköz PACKED vagy NOT_NEEDED állapotba került, akkor egy új szekcióba kerülnek ahol a kész vagy nem szükséges eszközök vannak tárolva.

A UI tetején van keresés felület is.
Keresés alatt van sorba rendezés, ami egy gomb, és akkor az lábi státusz alapján rendez:
Felülről lefelé:
NOT_PACKED
KNOWN_LOCATION
PREPARED
WEAR_ON_DEPARTURE
BUY_ON_THE_WAY

(A PACKED és NOT_NEEDED eszközök mivel külön vannak, azokat nem rendezzük)

Emellett meg minden eszközt újra lehet rendezni manuálisan is. Ez weben drag-and-drop módon működik, telefonon pedig az eszközök előtt megjelenik felfele és lefele nyíl, hogy merre mozogjon az eszköz.

A UI tetején lévő keresés alatt lévő sorba rendezés alatt lesz a pakolás lezárása gomb, ami törli az adatbázisból a pakolást (hard delete), erre kell majd egy confirmation a user-től, alatta pedig az új egyéni eszköz hozzáadása ehhez a pakoláshoz
