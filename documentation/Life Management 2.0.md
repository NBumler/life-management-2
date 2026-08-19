# Life Management 2.0

## Business

| | |
|---|---|
| **Státusz** | `Váz` |
| **Szülő** | _Nincs szülő (hub / architektúra / gyökér)._ |
| **Kapcsolódó** | [[Backend]], [[Frontend]], [[Backend-offline first]], [[Mennyiség mező]], [[Szöveges keresés]], [[Névegyediség]], [[Bejelentkezés]], [[SPEC-TEMPLATE]] |

### Célállapot

Személyes life-management alkalmazás (hibrid mobil + web). Több felhasználóra is felkészülünk, de az elsődleges cél a személyes használat.

### Funkcionális leírás

#### Általános elvek

- Minden feature **feature flag**-hez kötve a hibridben, hogy az alkalmazás egyes feature-ök nélkül is kiadható legyen. A flag-ek **build-time ship configból** jönnek (nincs in-app kapcsoló); a core (nem kapcsolható) kör és a teljes flag registry SSOT-ja: [[Frontend]].
- Input mezők egységesítve; web vs mobil esetén a platformnak megfelelő, legkényelmesebb kontroll.
- Ha egy felületen egyértelmű, hogy melyik inputot fogja használni a user, az mező legyen automatikusan fókuszban.
- Offline / backend-offline állapot kezelése: [[Backend-offline first]] + [[Szinkronizációs központ]]. Az offline működés a **natív** builden teljes; a **web build online-only**.

#### Dokumentációs konvenciók

| Mappa | Jelentés |
|---|---|
| `Features/` | Feature szintű specifikáció (részben vagy teljesen kidolgozva) |
| `Feature - TODO/` | Feature szintű specifikáció, ami még hiányos / stub |
| `Subfeatures/` | Kidolgozott (vagy legalább vázolt) alfeature |
| `Subfeatures - TODO/` | Alfeature specifikáció még hiányzik vagy részleges |
| `Architektúra/` | Kidolgozott architektúra jegyzetek |
| `Architektúra - TODO/` | Architektúra jegyzetek stub / bővítendő |

Minden specifikáció egységes szerkezetet követ: **Business** + **Architektúra** (Frontend → **Backend-offline** → Backend). A `#### Backend-offline` alfejezet kötelező. Sablon: [[SPEC-TEMPLATE]]. Státusz: `TODO` / `Váz` / `Ideiglenes` / `Kész`.
Agent skill: `.cursor/skills/documentation-spec/`. Offline SSOT: [[Backend-offline first]].

#### Feature lista — kidolgozott / részben (`Features/`)

- [[Kaja]]
- [[Edzés]]
- [[GearCheck]]
- [[Tennivalók]]
- [[Naptár]]
- [[Nyelv választás]]
- [[Dark&Light mode]]
- [[AYCM tracker]]
- [[Tápérték kalkulátor]]
- [[Profile]]
- [[Lépésszám követés]]
- [[Úszás napló]]
- [[Biciklizés napló]]
- [[Értesítések]]
- [[Szinkronizációs központ]]
- [[Bevásárlás]]
- [[Mászónapló]]
- [[Bejelentkezés]]
- [[Események]]
- [[Pénzügyek]]

#### Feature lista — hiányos / stub (`Feature - TODO/`)

_Nincs._

### UI/UX elvárások

Alsó tab bar: Kaja, Edzés, Feladatok, Menü. Tab-térkép, tabon belüli navigáció, route-térkép és a minden tabon látszó szinkronizációs státuszjelző: [[Frontend]] (app-shell SSOT).

### Megjegyzések

_Nincs megjegyzés._

### Nyitott kérdések

Nincs nyitott kérdés.

## Architektúra

### Frontend

- Ionic — Angular (hibrid), standalone komponensek
- Állapotkezelés: Angular Signals + root service-ek (nincs NgRx)
- OpenAPI-ból generált kliens
- Az első kiadás **kiadott** targetje a natív build; a web online-only és nem QA-zott platform
- Részletek: [[Frontend]]

#### Backend-offline

Minden feature kötelezően Backend-offline first. Közös mechanizmus: helyi store, kliens UUID, outbox, sync UI. Részletek: [[Backend-offline first]], [[Szinkronizációs központ]], [[Frontend]].

### Backend

- Java — Spring Boot
- API szerződés: OpenAPI (Swagger) — Spring Boot interface + Ionic Angular kliens generálás
- [[Backend-offline first]] (kötelező)
- Részletek: [[Backend]]

### Nyitott kérdések

Nincs nyitott kérdés.
