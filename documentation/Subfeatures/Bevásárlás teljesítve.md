---
verifikalva: 2026-09-03
verifikalt_commit: b9d7577
---

# Bevásárlás teljesítve

## Business

| | |
|---|---|
| **Státusz** | `Kész` |
| **Szülő** | [[Bevásárlás]] |
| **Kapcsolódó** | [[Élelmiszerek]], [[Élelmiszer tárolás]], [[Bevásárlás előzmény]], [[Bevásárlólista írás]], [[Backend-offline first]] |

### Jelenlegi működés

A felhasználó „Bevásárlás vége” gombjára a pipált / pipálatlan tételek alapján: lista archiválása, megvett élelmiszerek felvétele az [[Élelmiszer tárolás]]ba (lejárat + szükség szerint tárolási hely), pipálatlan tételek új aktív listára másolása.

### Funkcionális leírás

A folyamat **csak** a „Bevásárlás vége” megnyomásakor indul (a pipálás önmagában nem indít semmit).

1. **Pipált tételek = megvett**
   - **Élelmiszer:** egy áttekintő képernyő, soronként egy pipált élelmiszer:
     - Lejárati dátum megadása / megerősítése — szabályok: [[Élelmiszer tárolás]] (előtöltés a választott / egyetlen tárolási hely katalógusbeli romlási ideje alapján; üresen hagyva abból számolunk).
     - **Tárolási hely:** az [[Élelmiszerek]] katalógusban **engedélyezett** mód = kitöltött romlási idő (kamra / hűtő / fagyasztó); üres idő = nem engedélyezett.
       - Több engedélyezett → a flow megkérdezi, hol tárolja.
       - Pontosan egy → nem kérdez, azzal megy.
       - Null engedélyezett → a user választ helyet és ad lejáratot (nincs katalógus-alapértelmezés).
     - Létrejön a megfelelő [[Élelmiszer tárolás]] bejegyzés / bejegyzések:
       - Lista mennyiség `cs` és **egész** `amount = N` → **N külön** tárolási tétel (egyenként a katalógus 1 csomag nettó tartalmával; ha nincs nettó → `1 cs`).
       - `cs` és **tört** `amount` → **egy** tárolási tétel a tört mennyiséggel.
       - **Legacy `db`** sor (a `db` a listán már nem választható — `backlog/063`) → a darab-definíción át `cs`-re old fel, egész csomagra **felfelé** kerekít, majd az egész-`cs` ág szerint darabol.
       - Egyéb egység → **egy** tárolási tétel a lista mennyiségével.
       - Indoklás / szabályok: [[Élelmiszer tárolás]].
   - **Nem-élelmiszer:** nem kerül tárolásba; csak az archív lista része lesz.
2. **Pipálatlan tételek = meg nem vett**
   - Új **aktív** lista jön létre ugyanezekkel a tételekkel és mennyiségekkel, **üres pipákkal**.
   - Ha nincs pipálatlan tétel, nem jön létre új lista.
3. **Archiválás**
   - Az eredeti lista `ARCHIVED` lesz (előzmény: [[Bevásárlás előzmény]]), a teljesítés időpontjával; a tételek és pipaállapotok megmaradnak az archívumban.

Részleges teljesítés = a fenti szabályok együtt (pipált → archívum + tárolás ahol kell; pipálatlan → új aktív lista).

### UI/UX elvárások

- „Bevásárlás vége” gomb az aktív lista nézetén ([[Bevásárlólista írás]]), ha a listán van legalább egy tétel.
- **Egy áttekintő képernyő** a pipált élelmiszerekre (nem szekvenciális wizard): soronként egy tétel, lejárati dátum + (ha a katalógus szerint >1 tárolási hely engedélyezett, vagy null engedélyezett) hely-választó.
- Dátum mező előtöltése: [[Élelmiszer tárolás]].
- Üres aktív lista: a „Bevásárlás vége” **nem** elérhető / nem indítható; az üres listát törölni kell ([[Bevásárlólista írás]] — soft delete).
- Ha van legalább egy tétel, de mind pipálatlan: teljesítéskor nincs tárolás-lépés; az eredeti lista archiválódik, és új aktív lista jön létre a pipálatlan tételekkel (üres pipákkal).

### Megjegyzések

Az engedélyezett tárolási módok és a felbontás utáni fogyaszthatóság az [[Élelmiszerek]] / [[Élelmiszer manuális bevitele]] spechéz tartoznak; a Bevásárlás azokat olvassa. Null engedélyezett mód esetén a user választ a teljesítéskor — a Bevásárlás spechen belül ne találjunk ki hallgatólagos alapértelmezett helyet.

### Nyitott kérdések

Nincs nyitott kérdés.

## Architektúra

### Frontend

`ShoppingListCompletePage` — egy áttekintő képernyő (`shopping-list-complete.page.ts` + `shopping-list-complete.ts` pure builder); a `cs`/legacy-`db` darabolás (`splitCountFor`), hely-feloldás és lejárat-előtöltés kliensoldali; új aktív lista létrehozása a pipálatlanokból; eredeti lista archiválása. Egy outbox tétel (`entityType: 'ShoppingListComplete'`), a spun-off lista / tételek / `StoredFood` sorok saját outbox tétel nélkül.

#### Backend-offline

Backend-offline és Full-offline: olvasás/írás a helyi store-on; módosító kérések outboxba (`OfflineQueueService`), kliens UUID. Sync: [[Szinkronizációs központ]]. Lásd [[Backend-offline first]].

### Backend

**Van backend érintettség** — ez a legösszetettebb write-path a Bevásárlás klaszterben (egy user-akció 3 aggregátumot módosít elválaszthatatlanul); [[Backend-offline first]] §11 ezt kötelező atomi végpontként listázza.

**Kötelező** (nem csak ajánlott) végpont: `POST /api/shopping-lists/{id}/complete`, **egy** szerver-tranzakcióban, **egy** outbox tételként a kliensen — [[Backend-offline first]] §11.

**Request body:**

```json
{
  "checkedFoodEntries": [
    {
      "shoppingListItemId": "uuid",
      "expirationDate": "YYYY-MM-DD",
      "storageLocation": "ROOM | FRIDGE | FREEZER",
      "storageEntryIds": ["uuid", "..."]
    }
  ],
  "newActiveList": {
    "id": "uuid | null",
    "items": [{ "id": "uuid", "...": "…" }]
  }
}
```

(`storageEntryIds` a kliens által generált `StoredFood` id-k, `cs`-darabolásnál soronként több; `newActiveList` `null`, ha nincs pipálatlan tétel.)

`checkedFoodEntries` csak a pipált **élelmiszer** tételekhez tartalmaz sort (nem-élelmiszer és pipálatlan tételek nem szerepelnek benne — azok állapotát a lista már tárolt `checked` mezői adják, a kliens ezt nem duplikálja a body-ban). `storageLocation` csak akkor kötelező mezőnként, ha a katalógus szerint nem pontosan egy tárolási mód engedélyezett (a "Null engedélyezett" vagy "több engedélyezett" ág — a user választott helyet); pontosan egy engedélyezett módnál a szerver azt használja.

**Válasz (200):**

```json
{
  "archivedListId": "uuid",
  "createdStorageEntryIds": ["uuid", "..."],
  "newActiveListId": "uuid | null"
}
```

**Szerveroldali lépések (egy DB tranzakcióban):**

1. A `checkedFoodEntries` alapján létrehozza a storage sorokat (mennyiség szerinti bontás: [[Élelmiszer tárolás]] szabálya — `cs` + egész N → N külön tétel; `cs` + tört → egy tétel; legacy `db` → egész csomagra felfelé kerekítve; egyéb egység → egy tétel). A `ShoppingListService.splitCountFor` a klienssel bitre azonos.
2. Az eredeti listát `ARCHIVED`-re állítja, `completedAt` időbélyeggel; a tételek és pipaállapotok megmaradnak.
3. Ha van pipálatlan tétel, létrehozza az új aktív listát **a kliens által küldött UUID-kal** (lásd lent) — ha nincs, `newActiveListId = null`.
4. Bármely lépés hibája → teljes rollback, semmi nem íródik félig.

**Hibakódok:** `404` ismeretlen `listId` vagy idegen user listája; `409` `ENTITY_DELETED` ha a lista már nem `ACTIVE` (pl. duplikált complete egy másik eszközről — lásd az idempotencia-pontot); `400` `VALIDATION_ERROR` ha egy pipált élelmiszer tételhez sem a `checkedFoodEntries`, sem a katalógus nem ad egyértelmű `storageLocation`-t / `expirationDate`-et.

**Kliens UUID-k:** a `newActiveListId`-t és a benne lévő új `ShoppingListItem` sorok UUID-jait **a kliens generálja** és küldi a requestben — [[Backend-offline first]] §2 (kliensoldali ID minden szinkronizált entitáson). A válasz `newActiveListId` mezője visszaigazolás, nem újonnan kiosztott azonosító; így a kliens a helyi store-ba már a mentés pillanatában beírhatja az új aktív listát, mielőtt a szerver válasza megérkezne.

**Idempotencia:** a `complete` egy **atomi** végpont — [[Backend]] „Idempotencia” pontja szerint `Idempotency-Key` headerrel és szerveroldali `idempotency_key` táblás replay-vel védett. A natív drain az **outbox tétel `id`-ját** küldi kulcsként; a web (online-only) útvonalon nincs outbox, ott a lista `id`-ja a kulcs. Ha a kérés megismétlődik (pl. app-kill a válasz előtt), a szerver a **tárolt választ** adja vissza újra, nem `409`-et és nem duplikált storage/lista létrehozást.

Offline: [[Backend-offline first]] §11 (atomi, többentitásos művelet — egy outbox tétel).

### Nyitott kérdések

Nincs nyitott kérdés.
