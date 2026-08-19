# Nyelv választás

## Business

| | |
|---|---|
| **Státusz** | `Kész` |
| **Szülő** | [[Life Management 2.0]] |
| **Kapcsolódó** | [[Frontend]], [[Dark&Light mode]], [[Értesítések]], [[Backend]], [[Szinkronizációs központ]], [[Bejelentkezés]], [[Backend-offline first]] |

### Célállapot

Az alkalmazás többnyelvű (i18n): **magyar** és **angol**. Alapértelmezésben a készülék nyelvét követi, és magyarra esik vissza, ha az nem támogatott.

### Funkcionális leírás

#### Három állapot (döntés)

| Beállítás | Viselkedés |
|---|---|
| **Rendszer** (default) | A készülék nyelve, ha `hu` vagy `en`; egyébként **`hu`**. |
| **Magyar** | Fix `hu`. |
| **Angol** | Fix `en`. |

- **Tárolás:** device-local (`@capacitor/preferences`), nem syncel a profilba / más eszközre az első körben — [[Bejelentkezés]].
- A váltás **azonnali**, app-újraindítás nélkül.
- A fordítófájlok build assetek, tehát Full-offline állapotban is elérhetők ([[Backend-offline first]] §15).

#### Mi tartozik az i18n alá

Minden felhasználónak megjelenő szöveg, tehát az űrlapokon és listákon túl:

- **Enum- és állapotcímkék** (étkezés-típusok, ismétlődés-ritmus címkék, GearCheck állapotok, sync állapotok).
- **Értesítés-szövegek** ([[Értesítések]]).
- **Hibaüzenetek**, a szerver `code`-ja alapján — lásd alább.
- Üres állapotok, megerősítő párbeszédek, `~` melletti magyarázó szövegek.

#### Formázás

A dátum- és számformázás a **kiválasztott nyelv** locale-ját követi (`hu`, illetve `en-GB`), nem a készülék locale-ját — különben magyar felületen angol dátumformátum jelenhetne meg.

Ez **csak a megjelenítésre** igaz: a tárolt és a hálózaton utazó formátumok változatlanok (naptári nap `YYYY-MM-DD`, időpont `HH:mm`, időbélyeg UTC ISO-8601 — [[Backend-offline first]]). A tizedes elválasztó a beviteli mezőkben a [[Mennyiség mező]] szerződése szerint működik.

#### Szerver-hibák fordítása (döntés)

A szerver hibaüzenete **nincs lokalizálva**: a kliens a `code` alapján fordít, és a szerver `message`-e csak fallback / diagnosztika a [[Szinkronizációs központ]] hibasorában ([[Backend]], [[Backend-offline first]]). Következmény: **új hibakód = új i18n kulcs**, mindkét nyelvben.

#### Nyelvváltás és a már ütemezett értesítések

Az OS-nél ütemezett lokális értesítések szövege az ütemezés pillanatában dől el, tehát nyelvváltás után a régi nyelven szólalnának meg. Ezért **nyelvváltás után az ütemező újraértékel és újraütemez** ([[Értesítések]]) — ugyanaz a művelet, mint amit egy értesítés-kapcsoló átállítása kiváltana.

#### Hiányzó kulcs

- Hiányzó kulcs esetén a fallback nyelv a **`hu`**; ha ott sincs, a kulcs jelenik meg (nem üres szöveg).
- Dev buildben a hiányzó kulcs konzol-figyelmeztetést ad.
- **A `hu.json` és az `en.json` kulcshalmazának azonosnak kell lennie**; az eltérés build / CI hiba. Ez az egyetlen mód, hogy a hiányzó fordítás ne a felhasználónál derüljön ki.

### UI/UX elvárások

- **Belépés:** Menü → Nyelv (`/tabs/menu/language`) — [[Frontend]].
- Három rádió opció: Rendszer / Magyar / Angol. A választás azonnal érvényes, nincs „mentés" gomb és nincs újraindítás-kérés.
- A nyelvek neve **a saját nyelvén** jelenik meg (Magyar / English), hogy angol felületről is megtalálható legyen a magyar.
- **Core feature:** nincs feature flagje, nem kapcsolható ki — [[Frontend]] flag registry.

### Megjegyzések

Nincs harmadik nyelv az első körben, de a hozzáadás költsége egy új fordítófájl + locale regisztráció (a támogatott nyelvek listája egy helyen él).

Nincs ICU plural az első körben: ahol darabszám van, a kulcs paraméterezett (`{{count}}`), és a szöveg úgy fogalmazódik, hogy egyes és többes számban is helyes legyen — magyarban ez természetes, angolban a megfogalmazás dolga.

### Nyitott kérdések

Nincs nyitott kérdés.

## Architektúra

### Frontend

- **ngx-translate** (starter kit konvenció), `assets/i18n/hu.json` és `en.json`; egymásba ágyazott kulcsstruktúra, `feature.képernyő.elem` konvenció.
- `LanguageService` (root, [[Frontend]] `core/config/`): a beállítás signalja, a rendszernyelv feloldása, `TranslateService.use(...)`, valamint az Angular locale (`registerLocaleData`, `LOCALE_ID`) és a natív értesítés-újraütemezés kiváltása.
- A nyelv betöltése az app init része (a témával együtt, hálózat nélkül) — [[Frontend]] indulási sorrend.
- Hiányzó kulcs kezelése központi `MissingTranslationHandler`-ben, nem komponensenként.
- A kulcs-paritás ellenőrzése script / teszt, ami a build része.

#### Backend-offline

Preferencia és fordítófájlok **csak** helyi erőforrások, tehát Backend-offline és Full-offline állapotban is teljesen működnek; nincs hálózati kör és nincs outbox tétel. Nincs profil-sync az első körben ([[Bejelentkezés]] device-local tábla). Lásd [[Backend-offline first]].

### Backend

_Nincs backend érintettség_ a szövegek szempontjából (a UI szövegek kliensoldalon élnek). Egy követelmény viszont a szerverre esik: minden hibaválasz **stabil `code`-ot** ad, mert a fordítás ezen alapul — [[Backend]].

### Nyitott kérdések

Nincs nyitott kérdés.
