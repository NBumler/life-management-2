# Life Management 2.0

## Business

| | |
|---|---|
| **Státusz** | `Váz` |
| **Szülő** | _Nincs szülő (hub / architektúra / gyökér)._ |
| **Kapcsolódó** | [[Backend]], [[Frontend]], [[Backend-offline first]], [[Mennyiség mező]], [[Szöveges keresés]], [[SPEC-TEMPLATE]] |

### Célállapot

Személyes life-management alkalmazás (hibrid mobil + web). Több felhasználóra is felkészülünk, de az elsődleges cél a személyes használat.

### Funkcionális leírás

#### Általános elvek

- Minden feature **feature flag**-hez kötve a hibridben, hogy az alkalmazás egyes feature-ök nélkül is kiadható legyen.
- Input mezők egységesítve; web vs mobil esetén a platformnak megfelelő, legkényelmesebb kontroll.
- Ha egy felületen egyértelmű, hogy melyik inputot fogja használni a user, az mező legyen automatikusan fókuszban.
- Offline / backend-offline állapot kezelése: [[Backend-offline first]] + [[Szinkronizációs központ]].

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
- [[Kalóriakalkulátor]]
- [[Profile]]
- [[Lépésszám követés]]
- [[Úszás napló]]
- [[Értesítések]]
- [[Szinkronizációs központ]]
- [[Bevásárlás]]

#### Feature lista — hiányos / stub (`Feature - TODO/`)

- [[Pénzügyek]]
- [[Események]]
- [[Mászónapló]]
- [[Biciklizés napló]]
- [[Bejelentkezés]]

### UI/UX elvárások

Alsó tab bar: lásd [[Frontend]] (Kaja, Edzés, Feladatok, Menü).

### Megjegyzések

_Nincs megjegyzés._

### Nyitott kérdések

Nincs nyitott kérdés.

## Architektúra

### Frontend

- Ionic — Angular (hibrid)
- OpenAPI-ból generált kliens
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
