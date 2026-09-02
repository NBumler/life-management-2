---
verifikalva: 2026-09-03
verifikalt_commit: b9d7577
---

# Élelmiszer tárolás

## Business

| | |
|---|---|
| **Státusz** | `Kész` |
| **Szülő** | [[Kaja]] |
| **Kapcsolódó** | [[Bevásárlás]], [[Bevásárlás teljesítve]], [[Élelmiszerek]], [[Étkezés]], [[Élelmiszer forrású étkezés]], [[Recept forrású étkezés]], [[Egyéni forrású étkezés]], [[Értesítések]], [[Mennyiség mező]], [[Szöveges keresés]], [[Backend-offline first]] |

### Jelenlegi működés

Otthon tárolt élelmiszer-készlet vezetése: tételenkénti mennyiség, tárolási hely, lejárat, felbontás; romlás jelzése és értesítés; étkezéskor készletcsökkentés; manuális felvétel bevásárlás nélkül is.

### Funkcionális leírás

#### Készletegység

- Minden tárolási sor **külön tétel** (saját lejárat, hely, felbontás-állapot). **Nincs** összevonás azonos `Food` + hely + lejárat alapján — pl. két hús külön romolhat.
- Backend-offline: teljes CRUD támogatott ([[Backend-offline first]]).

#### Létrehozás — bevásárlásból

[[Bevásárlás teljesítve]]: pipált élelmiszer → tárolási tétel(ek).

- Lejárat és tárolási hely szabályai: lásd lentebb + [[Bevásárlás teljesítve]].
- **Darabolás:**
  - lista tétel `cs` egységű, **egész** `amount = N` → **N külön** tárolási tétel (felbontás külön követhető);
  - `cs` egységű, **tört** `amount` → **egy** tárolási tétel a tört mennyiséggel;
  - **legacy `db`** egységű sor (a `db` a bevásárlólistán már nem választható — `backlog/063`) → a darab-definíción át `cs`-re old fel, **egész csomagra felfelé kerekít**, majd az egész-`cs` ág szerint darabol;
  - egyéb egységnél (pl. `1kg`): **egy** tárolási tétel a megadott mennyiséggel.

Minden új tétel mennyisége: `cs` szétválasztáskor egy tétel = a katalógus **1 csomag nettó tartalma** (ha van); ha nincs nettó a katalógusban → `1 cs`. A frontend (`shopping-list-complete.ts` `splitCountFor`) és a backend (`ShoppingListService.splitCountFor`) bitre azonos szabályt futtat.

#### Létrehozás — manuális

Bevásárlás nélkül is felvehető:

- [[Élelmiszerek]] választó ([[Szöveges keresés]])
- Mennyiség ([[Mennyiség mező]] `quantity` — `db` is megadható, egy `Food`-hoz kötve, a darab-definíción át feloldva)
- Tárolási hely (engedélyezett módok a katalógusból; ha nincs kitöltve egyik sem → mindhárom választható)
- Lejárati dátum (előtöltés a helyhez tartozó katalógus-romlási idővel; üresen hagyva abból számolódik; felülírható)
- Opcionálisan rögtön „felbontva” (akkor a felbontás szabályai érvényesülnek mentéskor)

#### Lejárat (általános)

- User megadott dátum > üresen hagyott számítás: a választott hely katalógusbeli romlási ideje (`duration`) a felvétel / teljesítés napjától.
- Előtöltés a dátum mezőben ugyanezzel.

#### Tárolási hely

- Engedélyezett = katalógusban kitöltött kamra / hűtő / fagyasztó idő; üres = nem engedélyezett.
- Bevásárlás flow: [[Bevásárlás teljesítve]].
- Manuális felvétel: ugyanaz az engedélyezett-készlet; null engedélyezett → user szabadon választ a három közül.

#### Felbontás

- Művelet: „Felbontva” (még nem felbontott tételen).
- Új lejárat = **min(** ma + katalógus *felbontás után* időtartam **,** eredeti lejárat **)** — a korábbi lejáratnál nem lehet későbbi.
- Ha a *felbontás után* mező a katalógusban **üres** → a lejárat **változatlan** marad; a tétel ettől még felbontottnak jelölődik.
- Felbontott állapot megmarad (nem „zárható vissza”).

#### Készletcsökkenés étkezéskor

Forrás: [[Élelmiszer forrású étkezés]], [[Recept forrású étkezés]] (nem: [[Egyéni forrású étkezés]]).

Étkezés **létrehozásakor** levonás; szerkesztés / törlés esetén **nincs** visszapótlás ([[Étkezés]]).

Egy adott `Food`-ra fogyasztott mennyiség levonása. A kereslet és a tárolási sorok is **közös kanonikus alapra** kerülnek: `cs` / SI egység a szokásos módon, `db` a `Food` darab-definícióján át (elsőként csomagra — ez a „darabolás" sorok granularitása —, majd g/ml-re; definíció nélkül `1 db = 1 cs`). A `resolveFoodQuantity` közös feloldó. A tétel visszaírt mennyisége **arányos** a megmaradt kanonikus hányaddal (nincs egység-specifikus inverz).

1. Először a **már felbontott** tételekből (pl. lejárat szerint növekvő — FIFO a felbontottak között).
2. Ha még kell: **zárt** tételből — a fogyasztás előtt / közben **felbontás** (fenti lejárat-szabály), majd levonás.
3. Több tétel érinthető, amíg a kért mennyiség le nem vonódik.
4. Ha a készlet **nem elég** (0 alá menne a számítás): **nincs hiba** — a hiányzó részt nem adminisztrált bevásárlásnak / tárolásnak tekintjük; a létező tételeket nulláig / alá fogyasztjuk.
5. Ha egy tétel mennyisége **≤ 0** → **törlődik** a tárolásból (pl. 1 l tej teljes elhasználása receptben → nincs többé a listán).

#### Romlott állapot

- Lejárati dátum **napja után** (vagy a nap végén — UI: naptári nap alapján) a tétel **romlott** jelzéssel **megmarad** a listán; nem auto-törlődik.
- Manuális törlés / elfogyasztás továbbra is lehetséges.

#### Értesítések

Lead time a tétel **katalógusbeli tárolhatósági ideje** alapján (a tétel tárolási helyéhez tartozó `duration`, napokra vetítve):

| Katalógus tárolhatóság (adott hely) | Figyelmeztetési ablak kezdete |
|---|---|
| **> 5 nap** | lejárat előtt **3 nappal** |
| **≤ 5 nap** (és kitöltött) | lejárat előtt **2 nappal** |

Ha a helyhez nincs katalógus-idő (manuális lejárat / null engedélyezett hely): a felvétel napja és a lejárat közötti napok száma ugyanígy küszöböl (>5 → 3 nap, egyébként 2 nap).

**Küldés (SSOT ritmus: [[Értesítések]]):** lead-time napjától amíg a tétel a tárolóban van → napi **09:00** emlékeztető; romlottá váláskor **egyszer** „megromlott” értesítés.
#### Törlés

- Tétel soft delete (megerősítéssel) — [[Backend-offline first]]. Soha nem szinkronizált helyi draft → helyi hard remove + outbox tisztítás.
- [[Élelmiszerek]] katalógus törlésekor cascade: az összes rá hivatkozó tárolási tétel soft delete.

### UI/UX elvárások

- Kaja tab: készlet lista.
- **Szűrés** tárolási hely szerint szegmenssel (kamra / hűtő / fagyasztó / mind). A vizuális hely-szerinti csoportosítás (szekció-fejlécek) tervezett: `backlog/045-tarolas-lista-vizualis-hely-szerinti-csoportositas-szekcio-fejle.md`.
- **Rendezés** lejárat szerint (közeli / romlott elöl).
- Romlott és felbontott vizuális jelzés.
- Keresés: [[Szöveges keresés]] (terméknév / márka).
- Belépők: manuális hozzáadás; felbontás művelet; szerkesztés (mennyiség, hely, lejárat — ahol értelmes); törlés.
- Bevásárlás teljesítés wizard: [[Bevásárlás teljesítve]].

### Megjegyzések

Az étkezés UI / kalória a [[Étkezés]] spechéz tartozik; itt a készletlevonás szabályai az SSOT.

### Nyitott kérdések

Nincs nyitott kérdés.

## Architektúra

### Frontend

- Készlet lista: szűrő (hely), rendezés (lejárat), badge-ek (romlott, felbontott).
- Manuális create / edit form; felbontás action.
- Értesítés ütemezés: lokális ([[Értesítések]]) a lead time táblázat szerint.
- Étkezés flow hívja a készletlevonás szolgáltatást (opened-first, auto-open, ≤0 → soft delete a tárolási tételen).

#### Backend-offline

- Offline: helyi store + outbox.

Lásd [[Backend-offline first]].

### Backend

| Entitás | Fő mezők |
|---|---|
| `StoredFood` | `id` (UUID, kliens); `foodId`; `quantityAmount` + `quantityUnit`; `storageLocation` (`ROOM` \| `FRIDGE` \| `FREEZER`); `expiresOn` (date); `opened` (bool); `openedAt` (opcionális); `deleted` / `deleted_at`; `createdAt`, `updatedAt` |

Műveletek: CRUD; cascade soft delete `Food` törlésekor. Listák `deleted = false`. `DELETE` idempotens.

A **felbontás** (lejárat újraszámolás) és a **fogyasztáskori készletcsökkentés** logikája **kliens-oldali**: a kliens kiszámolja az új állapotot, és full-replace `PUT`-ként küldi a soronként érintett `StoredFood` tételekre (a ≤0-ra fogyott tétel `DELETE`). A szerver a küldött snapshotot fogadja el, nem futtat újra lejárat- vagy FIFO-számítást. Ez szándékos a [[Backend-offline first]] szerződés szerint (a levonás Full-offline is működik).

Mennyiség egységek: [[Mennyiség mező]]. Lejárat számítás: katalógus `duration` → dátum.

### Nyitott kérdések

Nincs nyitott kérdés.
