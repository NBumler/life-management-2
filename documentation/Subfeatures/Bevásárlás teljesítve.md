---
verifikalva:
verifikalt_commit:
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
   - **Élelmiszer:** végigvezető flow:
     - Lejárati dátum megadása / megerősítése — szabályok: [[Élelmiszer tárolás]] (előtöltés a választott / egyetlen tárolási hely katalógusbeli romlási ideje alapján; üresen hagyva abból számolunk).
     - **Tárolási hely:** az [[Élelmiszerek]] katalógusban **engedélyezett** mód = kitöltött romlási idő (kamra / hűtő / fagyasztó); üres idő = nem engedélyezett.
       - Több engedélyezett → a flow megkérdezi, hol tárolja.
       - Pontosan egy → nem kérdez, azzal megy.
       - Null engedélyezett → a user választ helyet és ad lejáratot (nincs katalógus-alapértelmezés).
     - Létrejön a megfelelő [[Élelmiszer tárolás]] bejegyzés / bejegyzések:
       - Lista mennyiség `db` és `amount = N` → **N külön** tárolási tétel (egyenként a katalógus 1 csomag nettó tartalmával; ha nincs nettó → `1 db`). Indoklás / szabályok: [[Élelmiszer tárolás]].
       - Egyéb egység → **egy** tárolási tétel a lista mennyiségével.
   - **Nem-élelmiszer:** nem kerül tárolásba; csak az archív lista része lesz.
2. **Pipálatlan tételek = meg nem vett**
   - Új **aktív** lista jön létre ugyanezekkel a tételekkel és mennyiségekkel, **üres pipákkal**.
   - Ha nincs pipálatlan tétel, nem jön létre új lista.
3. **Archiválás**
   - Az eredeti lista `ARCHIVED` lesz (előzmény: [[Bevásárlás előzmény]]), a teljesítés időpontjával; a tételek és pipaállapotok megmaradnak az archívumban.

Részleges teljesítés = a fenti szabályok együtt (pipált → archívum + tárolás ahol kell; pipálatlan → új aktív lista).

### UI/UX elvárások

- „Bevásárlás vége” gomb az aktív lista nézetén ([[Bevásárlólista írás]]).
- Wizard / lépésenkénti flow a pipált élelmiszerekre: lejárat, majd (ha kell) tárolási hely.
- Dátum mező előtöltése: [[Élelmiszer tárolás]].
- Üres aktív lista: a „Bevásárlás vége” **nem** elérhető / nem indítható; az üres listát törölni kell ([[Bevásárlólista írás]] — soft delete).
- Ha van legalább egy tétel, de mind pipálatlan: teljesítéskor nincs tárolás-lépés; az eredeti lista archiválódik, és új aktív lista jön létre a pipálatlan tételekkel (üres pipákkal).
- Ha van pipált élelmiszer: lejárat (+ szükség szerint tárolási hely) wizard.

### Megjegyzések

Az engedélyezett tárolási módok és a felbontás utáni fogyaszthatóság az [[Élelmiszerek]] / [[Élelmiszer manuális bevitele]] spechéz tartoznak; a Bevásárlás azokat olvassa. Null engedélyezett mód esetén a user választ a teljesítéskor — a Bevásárlás spechen belül ne találjunk ki hallgatólagos alapértelmezett helyet.

### Nyitott kérdések

Nincs nyitott kérdés.

## Architektúra

### Frontend

Completion wizard; navigáció / hívások az [[Élelmiszer tárolás]] create felé; új aktív lista létrehozása a pipálatlanokból; eredeti lista archiválása.

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
      "storageLocation": "PANTRY | FRIDGE | FREEZER"
    }
  ]
}
```

`checkedFoodEntries` csak a pipált **élelmiszer** tételekhez tartalmaz sort (nem-élelmiszer és pipálatlan tételek nem szerepelnek benne — azok állapotát a lista már tárolt `checked` mezői adják, a kliens ezt nem duplikálja a body-ban). `storageLocation` csak akkor kötelező mezőnként, ha a Business §-ban leírt "Null engedélyezett" ág futott (a user választott helyet); egyébként a szerver a katalógus szerinti egyetlen engedélyezett módot használja.

**Válasz (200):**

```json
{
  "archivedListId": "uuid",
  "createdStorageEntryIds": ["uuid", "..."],
  "newActiveListId": "uuid | null"
}
```

**Szerveroldali lépések (egy DB tranzakcióban):**

1. A `checkedFoodEntries` alapján létrehozza a storage sorokat (mennyiség szerinti bontás: [[Élelmiszer tárolás]] szabálya — `db`/`amount = N` → N külön tétel, egyéb egység → egy tétel).
2. Az eredeti listát `ARCHIVED`-re állítja, `completedAt` időbélyeggel; a tételek és pipaállapotok megmaradnak.
3. Ha van pipálatlan tétel, létrehozza az új aktív listát **a kliens által küldött UUID-kal** (lásd lent) — ha nincs, `newActiveListId = null`.
4. Bármely lépés hibája → teljes rollback, semmi nem íródik félig.

**Hibakódok:** `404` ismeretlen `listId` vagy idegen user listája; `409` `ENTITY_DELETED` ha a lista már nem `ACTIVE` (pl. duplikált complete egy másik eszközről — lásd az idempotencia-pontot); `400` `VALIDATION_ERROR` ha egy pipált élelmiszer tételhez sem a `checkedFoodEntries`, sem a katalógus nem ad egyértelmű `storageLocation`-t / `expirationDate`-et.

**Kliens UUID-k:** a `newActiveListId`-t és a benne lévő új `ShoppingListItem` sorok UUID-jait **a kliens generálja** és küldi a requestben — [[Backend-offline first]] §2 (kliensoldali ID minden szinkronizált entitáson). A válasz `newActiveListId` mezője visszaigazolás, nem újonnan kiosztott azonosító; így a kliens a helyi store-ba már a mentés pillanatában beírhatja az új aktív listát, mielőtt a szerver válasza megérkezne.

**Idempotencia:** a `complete` egy **atomi** végpont — [[Backend]] „Idempotencia” pontja szerint `Idempotency-Key` headerrel (az outbox tétel `id`-ja) és szerveroldali `idempotency_key` táblás replay-vel védett, ugyanúgy, mint `POST /api/shopping-lists/{id}/complete`-ra ott is hivatkozva van. Ha a queue drain közben a kérés megismétlődik (pl. app-kill a válasz előtt), a szerver a **tárolt válasz**t adja vissza újra, nem `409`-et és nem duplikált storage/lista létrehozást.

Offline: [[Backend-offline first]] §11 (atomi, többentitásos művelet — egy outbox tétel).

### Nyitott kérdések

Nincs nyitott kérdés.
