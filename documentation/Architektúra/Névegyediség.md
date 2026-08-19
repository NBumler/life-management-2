# Névegyediség

## Business

| | |
|---|---|
| **Státusz** | `Kész` |
| **Szülő** | [[Frontend]] |
| **Kapcsolódó** | [[Backend-offline first]], [[Szöveges keresés]], [[Mennyiség mező]], [[Háztartási feladatok]], [[Eszközök]], [[Sablonok]], [[Gyakorlat]], [[Recept]], [[Élelmiszerek]], [[AYCM elfogadóhely hozzáadása]], [[Indoor boulder admin]], [[Bejelentkezés]] |

### Célállapot

Egyetlen, kőbe vésett szabály arra, hogy **két név mikor számít azonosnak** — és a kliens meg a szerver pontosan ugyanezt alkalmazza.

Ez azért kritikus, mert a névegyediséget **offline a kliens ellenőrzi előre**, a szerver pedig syncnél kényszeríti ki. Ha a két szabály a legkisebb részletben is eltér, a user offline mentése hibátlannak látszik, majd a szinkronizációnál `409`-cel elhasal, és kézzel kell rendezni ([[Backend-offline first]]).

### Funkcionális leírás

#### Normalizálás (`normalizeName`)

Két név **azonos**, ha az alábbi lépések után karakterről karakterre egyeznek:

1. **Unicode NFC** normalizálás. (Ugyanaz a látható „é" lehet egyetlen kódpont vagy `e` + kombináló ékezet, platformtól függően — normalizálás nélkül két eszköz azonosnak látszó, de bájtszinten különböző nevet hozna létre.)
2. **Trim:** minden whitespace levágása a szöveg elejéről és végéről (szóköz, tab, nem törhető szóköz `U+00A0`).
3. **Belső whitespace összevonása:** minden whitespace-sorozat → egyetlen normál szóköz (`U+0020`). Így a „Kamra  polc" nem külön tétel a „Kamra polc" mellett.
4. **Kisbetűsítés:** Unicode case folding, **locale-független** (nem `toLocaleLowerCase`, hogy a készülék nyelvi beállítása ne befolyásolja).
5. **Az ékezet megmarad** — lásd alább.

#### Ékezet: itt szándékosan NEM foldolunk

| | [[Szöveges keresés]] | Névegyediség (ez a spec) |
|---|---|---|
| Cél | A user megtalálja, amit keres | Ne jöjjön létre két azonos sor |
| Kis- / nagybetű | egyenértékű | egyenértékű |
| Ékezet | **egyenértékű** (`arviz` = `árvíz`) | **különböző** (`Sör` ≠ `Sor`) |

A kereséskor a kényelem a cél, az egyediségnél viszont az, hogy a user valós különbségeket rögzíthessen: a „Sör" és a „Sor" külön tétel maradhat. Ha az egyediségnél is foldolnánk az ékezetet, a rendszer legitim neveket tiltana le.

**Következmény a megvalósításra:** a [[Szöveges keresés]] utility-je **nem** használható újra erre a célra.

#### Csak élő sorok

Minden névegyediség **kizárólag az élő sorokra** (`deleted = false`) vonatkozik. Törölt sor neve újra felvehető, és ez nem ad figyelmeztetést. (Nincs undelete UI, tehát a user számára a törölt sor megszűnt — [[Backend-offline first]].)

#### Hatókör (mihez képest egyedi)

A hatókört a feature spec adja meg; a **normalizálás mindenhol a fenti**.

| Entitás / mező | Hatókör | Spec |
|---|---|---|
| `HouseholdRoom.name` | user | [[Háztartási feladatok]] |
| `HouseholdTask.name` | az adott helyiség | [[Háztartási feladatok]] |
| `GearItem.name` | user | [[Eszközök]] |
| `PackingTemplate.name` | user | [[Sablonok]] |
| `Exercise.name` | user | [[Gyakorlat]] |
| `AycmPartner.name` | user | [[AYCM elfogadóhely hozzáadása]] |
| `Recipe.name` | **globális** (shared katalógus) | [[Recept]] |

Explicit **nem** egyedi (több azonos név megengedett): `CalendarEvent.title` ([[Események]]), `LifePlan.title` ([[Élet tervek]]), `RecurringExpense.name` ([[Rendszeres kiadások]]), `ShoppingList.name` ([[Bevásárlás]]), `GymColorBand.name` ([[Indoor boulder admin]] — ott a `hexColor` egyedi, a név nem), `Food.name` önmagában (lásd mezőhalmaz-egyediség).

Ahol a feature spec **nem** ír elő egyediséget, ott nincs egyediség — pl. `Gym.name`, `Crag.name`, `Sector.name`, `Route.name`.

#### Mezőhalmaz-egyediség (`Food`)

Az [[Élelmiszerek]] duplikáció-szabálya nem egy névre, hanem **minden mező** egyezésére épül. Két tétel akkor duplikátum, ha az alábbi összehasonlítások **mindegyike** egyezik:

| Mezőtípus | Összehasonlítás |
|---|---|
| Szöveg (termék, üzlet, márka, egyéb) | `normalizeName` szerint |
| Vonalkód (EAN) | Trim + minden nem-számjegy karakter eltávolítása, majd karakteres egyezés. Üres = üres. |
| Szám (ár, tápanyag értékek) | A tárolt érték pontos egyezése. **`null` ≠ `0`** |
| Mennyiség / időtartam | `amount` + `unit` párként, a [[Mennyiség mező]] kanonikus egységére váltva (`1 l` = `100 cl`) |

Ugyanez a szabály fut a [[Élelmiszer manuális bevitele]] mentésénél és a [[Élelmiszer importálása clipboard-ról]] előnézetében — ott a **batchen belüli** korábbi érvényes sorokkal is összevetve.

#### Hex színkód (`GymColorBand.hexColor`)

Nem név, de ugyanaz a probléma: `#FFF`, `#ffffff` és `#FFFFFF` ugyanaz a szín. Kanonikus alak mentés **előtt**:

1. Trim, `#` prefix elhagyása.
2. 3 jegyű rövid forma kifejtése 6 jegyűre (`f0a` → `ff00aa`).
3. Kisbetűsítés.
4. Tárolás `#rrggbb` alakban.

Az egyediség a kanonikus alakon áll ([[Indoor boulder admin]]).

#### Kivétel: `username`

A [[Bejelentkezés]] `username`-je **szándékosan case-sensitive**, és nem esik e szabály alá (`alice` ≠ `Alice`). Ott nincs offline create sem: a usert admin API hozza létre, tehát a kliens–szerver paritás nem kérdés.

### UI/UX elvárások

- Az ütközést a kliens **mentés előtt** jelzi, a szokásos mezőszintű validációs hibával — offline sem hagyjuk, hogy a user sikeresnek higgye a mentést.
- A hibaüzenet a **user által beírt** nevet idézze, ne a normalizált alakot.
- **A tárolt érték a user által beírt alak** (a trim és a belső whitespace-összevonás után). A kisbetűsítés kizárólag az összehasonlítás eszköze: a megjelenítés megőrzi a user kis- és nagybetűit.
- Átnevezésnél a saját sort ki kell zárni az ellenőrzésből (ne ütközzön önmagával).

### Megjegyzések

Megosztott pure TS utility (`normalizeName`, `normalizeBarcode`, `normalizeHexColor`) — nem UI komponens. A szerver ugyanezt a normalizálást implementálja, és a két oldal paritása **közös fixture-listán futó teszttel** biztosított. A fixture-nek tartalmaznia kell legalább: NFC vs NFD ékezet, dupla belső szóköz, nem törhető szóköz, vezető/záró szóköz, csupa nagybetű, ékezetes vs ékezet nélküli pár.

### Nyitott kérdések

Nincs nyitott kérdés.

## Architektúra

### Frontend

- Pure TypeScript utility a normalizáláshoz; a form validátorok és a helyi duplikáció-ellenőrzés ezt hívja.
- A helyi ellenőrzés a helyi store **élő** sorain fut (`deleted = false`), az éppen szerkesztett sort kizárva.
- **Nem** a [[Szöveges keresés]] utility-jét használja (ott ékezet-fold van).

#### Backend-offline

- A duplikáció-ellenőrzés Backend-offline és Full-offline állapotban is a **helyi** adaton fut, ugyanezzel a szabállyal. Nincs hálózati kör és nincs saját outbox ebben a spechen.
- Két eszköz párhuzamos offline munkájánál a helyi ellenőrzés nem tudhat a másik eszközről: ilyenkor a szerver `409 UNIQUE_VIOLATION`-t ad, és a tétel a [[Szinkronizációs központ]]ban javítható (átnevezés → újraküldés) vagy eldobható. Részletek: [[Backend-offline first]].

### Backend

- A szerver a normalizált alakot **generált / tárolt oszlopban** tartja (pl. `name_normalized`), és a **partial unique index ezen** áll: `WHERE deleted = false`.
- Puszta `lower(name)` **nem elég**: nem végez NFC normalizálást és nem vonja össze a belső whitespace-t — ezért nem is használható index-kifejezésként.
- A hatókör szerinti index a feature spec szerint, pl. `(user_id, name_normalized)`, `(room_id, name_normalized)`.
- Sértés → `409` + `{ "code": "UNIQUE_VIOLATION", "field": "name" }` ([[Backend-offline first]]).
- A `Food` mezőhalmaz-duplikáció **alkalmazás-szintű** ellenőrzés (nem egyetlen index), a fenti mezőnormalizálással.
- A normalizáló implementáció viselkedése a klienssel **azonos**; közös fixture-alapú teszt kötelező.

### Nyitott kérdések

Nincs nyitott kérdés.
