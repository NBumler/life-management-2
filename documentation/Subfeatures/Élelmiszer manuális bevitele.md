# Élelmiszer manuális bevitele

## Business

| | |
|---|---|
| **Státusz** | `Kész` |
| **Szülő** | [[Élelmiszer hozzáadása]] |
| **Kapcsolódó** | [[Élelmiszerek]], [[Vonalkódos élelmiszer beolvasás]], [[Élelmiszer importálása clipboard-ról]], [[Élelmiszer tárolás]], [[Mennyiség mező]], [[Backend-offline first]], [[Szinkronizációs központ]] |

### Célállapot

Új vagy szerkesztett [[Élelmiszerek]] tétel rögzítése / módosítása egy űrlapon (kézi adatbevitel; vonalkódos vagy clipboard előtöltés utáni kiegészítés ugyanitt).

### Funkcionális leírás

Az űrlap **új létrehozásra** és **szerkesztésre** is szolgál ([[Élelmiszerek]]). Mentés és szerkesztés **backend-offline** állapotban is működik ([[Backend-offline first]], [[Szinkronizációs központ]]).

#### Kötelező / opcionális

- **Kötelező:** csak a **Termék** (név).
- Minden más mező **opcionális**. Üres / hiányos élelmiszer szándékosan létrehozható; későbbi feature: szűrés hiányos tételekre.

#### Alapadatok

| Mező | Leírás |
|---|---|
| **Termék** | Élelmiszer neve (pl. Tej). Kötelező. |
| **Üzlet** | Hol árulják (pl. Aldi). Szabad szöveg. |
| **Márka** | Termék márkája (pl. Nestlé). |
| **Vonalkód (EAN)** | Termék vonalkódja. [[Vonalkódos élelmiszer beolvasás]] automatikusan töltheti. Kézi javítás után az input végén lévő **sync gomb** újra lekéri az Open Food Facts adatokat (lásd lent). |
| **Egyéb** | Tetszőleges megjegyzés (pl. ízesített termék). **Nem** azonos a bevásárlás nem-élelmiszer `note` mezőjével. |
| **Ár** | Egy szám; jelentése **Ft / csomag** (egység a UI-n jelölve, nem külön input). |
| **1 csomag nettó tartalma** | [[Mennyiség mező]] `quantity` módban. **Egy darabra** vonatkozik (pl. 1 tojás → `1db`; tej → `1l`). |

#### Tápanyagok szekció

Értékek **100 g / 100 ml** élelmiszerre vetítve. Nincs külön flag, hogy g vagy ml — a nettó tartalom egységéből és a termék természetéből utólag egyértelmű; a kalkulációknak sem kell külön tárolt flag.

**Kötelező megjelenési sorrend** (és mezőazonosítók):

1. Energia (kcal)
2. Zsír (g)
3. Zsír — telített (g)
4. Zsír — telítetlen (g)
5. Zsír — transz (g)
6. Szénhidrát (g)
7. Szénhidrát — cukrok — egyszerű (g)
8. Szénhidrát — összetett (g)
9. Szénhidrát — összetett — rost (g)
10. Fehérje (g)
11. Só (g)
12. Nátrium (g)
13. Klorid (g)

#### Só → nátrium / klorid

- Ha a **só** értéke változik:
  - ha a **nátrium** mező üres (auto mód): `nátrium = só / 2.5` (EU: só = nátrium × 2.5)
  - ha a **klorid** mező üres (auto mód): `klorid = só − nátrium` (NaCl feltételezés; a fenti nátriumértékkel)
- Ha a nátrium / klorid mezőben **user által begépelt** érték van → **nem** írjuk felül sóváltozáskor.
- Ha a user **kitörli** a nátrium vagy klorid mezőt → reset auto módba (úgy, mintha még nem gépelt volna); legközelebbi sóváltozáskor / azonnal újraszámolható.
- Kerekítés: **3 tizedes** a számított nátrium / klorid értékeknél.

#### Romlási idők szekció

[[Mennyiség mező]] `duration` módban, helper ikonnal. Sorrend:

1. **Szobahőmérsékleten (kamra)**
2. **Hűtőben**
3. **Fagyasztva**
4. **Felbontás után** (fogyaszthatóság felbontástól)

**Engedélyezett tárolási mód** ([[Élelmiszer tárolás]], [[Bevásárlás teljesítve]]):

- A három tárolási hely (kamra / hűtő / fagyasztó) közül az **engedélyezett**, amelyikhez van kitöltött időtartam; az üres **nem** engedélyezett.
- A **felbontás után** mező nem tárolási hely; külön szabály a tárolás / fogyasztás flow-ban (lásd [[Élelmiszer tárolás]]).

#### Vonalkód sync gomb (Open Food Facts)

Az EAN mező végén gomb (jelszó-reveal mintára). Megnyomásra: OFF API hívás a mezőben lévő vonalkóddal (ugyanaz a forrás, mint [[Vonalkódos élelmiszer beolvasás]]).

- Ha a válasz mezői **felülírnának** meglévő, **eltérő** űrlapértékeket → **megerősítő dialógus**: érintett mezők listája, régi → új érték.
- Ha régi és új megegyezik → azt a mezőt kihagyjuk (nincs „frissítés”, nem jelenik meg a dialógusban).
- Megerősítés után: az OFF-ból jövő, változó mezők **felülírják** az űrlapot (függetlenül attól, hogy user gépelte-e).
- Nincs találat / hiba: toast / hibaüzenet; az űrlap nem törlődik.

#### Duplikáció

Létrehozáskor / mentéskor: új tétel **tiltott**, ha **minden** mezője megegyezik egy már létező élelmiszerével (lásd [[Élelmiszerek]]). Részleges egyezés (pl. ugyanaz a név, más üzlet) **megengedett**.

### UI/UX elvárások

- Szekciók: alapadatok → tápanyagok (rögzített sorrend) → romlási idők.
- Mentés gomb: fix alsó footer (thumb-zone).
- iOS zoom védelem: beviteli mezők betűmérete minimum `16px`.
- Mennyiség / idő: [[Mennyiség mező]] (`quantity` nettó tartalomra; `duration` romlási időkre).
- Vonalkód: sync gomb az input végén; felülírás megerősítő dialógus (régi → új, csak eltérések).

### Megjegyzések

Későbbi modellbontás (külön élelmiszer + bolt entitás, ár boltonként) **nincs** scope-ban; UI terv sincs rá.

### Nyitott kérdések

Nincs nyitott kérdés.

## Architektúra

### Frontend

- Új / szerkesztő űrlap; nátrium/klorid auto vs user-touched állapot a komponensben.
- OFF hívás a sync gombra: közvetlenül a kliensről ([[Vonalkódos élelmiszer beolvasás]] szerint); megerősítő dialógus a diff alapján.

#### Backend-offline

- Offline / backend-offline: mentés outboxba (`PENDING`), helyi katalógus azonnal frissül ([[Backend-offline first]], [[Szinkronizációs központ]]).
- Duplikáció ellenőrzés: helyi adatállományon is (backend-offline esetén is).

### Backend

Élelmiszer create / update (OpenAPI); kliens UUID. Mezők a [[Élelmiszerek]] entitásban. Duplikáció: szerveroldali ellenőrzés is (online); a kliens offline is ugyanazt a szabályt alkalmazza.

### Nyitott kérdések

Nincs nyitott kérdés.
