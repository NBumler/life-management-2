# Élelmiszer tárolás

## Business

| | |
|---|---|
| **Státusz** | `Kész` |
| **Szülő** | [[Kaja]] |
| **Kapcsolódó** | [[Bevásárlás]], [[Bevásárlás teljesítve]], [[Élelmiszerek]], [[Étkezés]], [[Élelmiszer forrású étkezés]], [[Recept forrású étkezés]], [[Ismeretlen forrású étkezés]], [[Értesítések]], [[Mennyiség mező]], [[Szöveges keresés]], [[Backend-offline first]] |

### Célállapot

Otthon tárolt élelmiszer-készlet vezetése: tételenkénti mennyiség, tárolási hely, lejárat, felbontás; romlás jelzése és értesítés; étkezéskor készletcsökkentés; manuális felvétel bevásárlás nélkül is.

### Funkcionális leírás

#### Készletegység

- Minden tárolási sor **külön tétel** (saját lejárat, hely, felbontás-állapot). **Nincs** összevonás azonos `Food` + hely + lejárat alapján — pl. két hús külön romolhat.
- Backend-offline: teljes CRUD támogatott ([[Backend-offline first]]).

#### Létrehozás — bevásárlásból

[[Bevásárlás teljesítve]]: pipált élelmiszer → tárolási tétel(ek).

- Lejárat és tárolási hely szabályai: lásd lentebb + [[Bevásárlás teljesítve]].
- **Darabolás:** ha a lista tétel mennyisége `db` egységű és `amount = N` → **N külön** tárolási tétel jön létre (felbontás külön követhető). Egyéb egységnél (pl. `1kg`): **egy** tárolási tétel a megadott mennyiséggel. Csomagszám szerinti vásárláshoz a listán `db` használandó.

Minden új tétel mennyisége: `db` szétválasztáskor egy tétel = a katalógus **1 csomag nettó tartalma** (ha van); ha nincs nettó a katalógusban → `1 db`.

#### Létrehozás — manuális

Bevásárlás nélkül is felvehető:

- [[Élelmiszerek]] választó ([[Szöveges keresés]])
- Mennyiség ([[Mennyiség mező]] `quantity`)
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

Forrás: [[Élelmiszer forrású étkezés]], [[Recept forrású étkezés]] (nem: [[Ismeretlen forrású étkezés]]).

Egy adott `Food`-ra fogyasztott mennyiség levonása:

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

| Katalógus tárolhatóság (adott hely) | Értesítés |
|---|---|
| **> 5 nap** | lejárat előtt **3 nappal** |
| **≤ 5 nap** (és kitöltött) | lejárat előtt **2 nappal** |

Ha a helyhez nincs katalógus-idő (manuális lejárat / null engedélyezett hely): a felvétel napja és a lejárat közötti napok száma ugyanígy küszöböl (>5 → 3 nap, egyébként 2 nap). Részletek / küldés: [[Értesítések]].

#### Törlés

- Tétel hard delete (megerősítéssel).
- [[Élelmiszerek]] katalógus törlésekor cascade: az összes rá hivatkozó tárolási tétel törlődik.

### UI/UX elvárások

- Kaja tab: készlet lista.
- **Csoportosítás / szűrés** tárolási hely szerint (kamra / hűtő / fagyasztó / mind).
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
- Étkezés flow hívja a készletlevonás szolgáltatást (opened-first, auto-open, ≤0 delete).
- Offline: helyi store + outbox.

### Backend

| Entitás | Fő mezők |
|---|---|
| `StoredFood` | `id` (UUID, kliens); `foodId`; `quantityAmount` + `quantityUnit`; `storageLocation` (`ROOM` \| `FRIDGE` \| `FREEZER`); `expiresOn` (date); `opened` (bool); `openedAt` (opcionális); `createdAt`, `updatedAt` |

Műveletek: CRUD; felbontás (lejárat újraszámolás); fogyasztás / batch levonás (étkezés orchestrálhatja); cascade delete `Food` törlésekor.

Mennyiség egységek: [[Mennyiség mező]]. Lejárat számítás: katalógus `duration` → dátum.

### Nyitott kérdések

Nincs nyitott kérdés.
