# Life Management 2.0

Személyes life-management alkalmazás (hibrid mobil + web). Több felhasználóra is felkészülünk, de az elsődleges cél a személyes használat.

## Architektúra

- [[Backend]]: Java — Spring Boot
- [[Frontend]] + mobil (hibrid): Ionic — Angular
- **API szerződés:** OpenAPI (Swagger) — ebből generálódik a Spring Boot interface és az Ionic Angular kliens kód is
- [[Backend-offline first]] megközelítés (kötelező)

## Általános elvek

- Minden feature **feature flag**-hez kötve a hibridben, hogy az alkalmazás egyes feature-ök nélkül is kiadható legyen.
- Input mezők egységesítve; web vs mobil esetén a platformnak megfelelő, legkényelmesebb kontroll.
- Ha egy felületen egyértelmű, hogy melyik inputot fogja használni a user, az mező legyen automatikusan fókuszban.
- Offline / backend-offline állapot kezelése: [[Backend-offline first]] + [[Szinkronizációs központ]].

## Dokumentációs konvenciók

| Mappa | Jelentés |
|---|---|
| `Features/` | Feature szintű specifikáció (részben vagy teljesen kidolgozva) |
| `Feature - TODO/` | Feature szintű specifikáció, ami még hiányos / stub |
| `Subfeatures/` | Kidolgozott (vagy legalább vázolt) alfeature |
| `Subfeatures - TODO/` | Alfeature specifikáció még hiányzik vagy részleges |
| `Architektúra/` | Kidolgozott architektúra jegyzetek |
| `Architektúra - TODO/` | Architektúra jegyzetek stub / bővítendő |

Minden specifikáció egységes szerkezetet követ: **Business** + **Architektúra** (Frontend / Backend). Sablon: [[SPEC-TEMPLATE]]. Státusz: `TODO` / `Váz` / `Ideiglenes` / `Kész`.
Agent skill (formázás létrehozáskor / szerkesztéskor): `.cursor/skills/documentation-spec/`.

A `> **Státusz:** TODO` jelölés a fájl tetején elavult; a státusz a Business táblázatban él.

---

## Feature lista

### Kidolgozott / részben kidolgozott (`Features/`)

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

### Hiányos / stub (`Feature - TODO/`)

- [[Pénzügyek]]
- [[Események]]
- [[Mászónapló]]
- [[Biciklizés napló]]
- [[Bejelentkezés]]
