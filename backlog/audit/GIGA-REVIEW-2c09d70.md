# GIGA-REVIEW — `2c09d70..c6d7a85` (71 reviewzatlan commit)

> **Cél:** a `2c09d709f9f0d2e5c30229bb15732aafcdeae729` óta a `master`-re került 71 commit
> utólagos kód-review-ja, több session-ben, chunkokra bontva. Ez a fájl a **haladás-napló
> és a findings-gyűjtő**. Amikor minden chunk `DONE`, a „Konszolidált fix-lista" szakaszból
> `backlog/` jegyek készülnek, és egy külön session onnan indítja a fix-implementációt.

- **Baseline (utolsó reviewzott):** `2c09d70` — `fix(frontend): audit RED javítások — Dark&Light, Naptár hónapváltó, nyelv fallback` (2026-09-02)
- **Review-HEAD (rögzített, NEM mozog):** `c6d7a85` — `docs: #020 lezárás …` (2026-09-03)
- **Diff nagyságrend:** 275 fájl, +9918 / −1195. Ebből tényleges kód: ~90 `frontend/src/app`, ~17 `backend/src/main`, ~12 backend teszt, 1 `shared/`, 1 `scripts/`. A többi `documentation/` + `backlog/`.
- **Worktree:** `.claude/worktrees/giga-review`, branch `worktree-giga-review` (a `master`-en a felhasználó közben dolgozik — ezt a branchet a végén rebase-elni/mergelni kell).
- **Létrehozva:** 2026-09-03 · Session: https://claude.ai/code/session_014Dwnntit8yXGvFn9Pnhg9r

## Hogyan dolgozz ezen (session-protokoll)

1. Nyisd meg ezt a fájlt, keresd az első `TODO` chunkot a haladás-táblában.
2. Állítsd `WIP`-re (session-URL + dátum a „Ki / mikor" oszlopba), commitold **csak ezt a fájlt**.
3. A chunk „Diff-parancs" sorával nézd meg a változást (a review-HEAD `c6d7a85` **fix**, sose `HEAD`).
4. Review: `/code-review high` a szűkített diffre; nagy/kockázatos chunknál előbb manuális olvasás, aztán `/code-review`. Nézd a hozzá tartozó **tesztek** meglétét/minőségét is.
5. A találatokat írd a chunk „Findings" táblájába: súlyosság · `fájl:sor` · leírás · javasolt fix · (opc.) hozzáadandó teszt · státusz.
6. Ha nincs találat: írd be `— nincs finding —` és a rövid indoklást (mit néztél át).
7. Chunk `DONE`, a fájl commitolása. **Új chunkot ne kezdj** — a session itt véget ér.

**Súlyossági skála:** `blocker` (adatvesztés / hibás működés / build-tör) · `major` (funkcionális hiba edge-case-en, rossz UX, hiányzó kulcs-teszt) · `minor` (kisebb helytelenség, szűk edge-case) · `nit` (stílus, elnevezés, komment).
**Finding-státusz:** `open` · `fixed` (már ebben a worktree-ben) · `wontfix` (indoklással) · `ticketed` (`backlog/NNN`).

## Haladás-tábla

| Chunk | Téma | Commitok | Kockázat | Státusz | Ki / mikor | Findings (b/M/m/n) |
|---|---|--:|---|---|---|---|
| A | Doksi-restrukturálás (Fázis 3b–6) | 21 | alacsony | **DONE** | session_014Dwn / 2026-09-03 | 0/0/1/2 |
| B | Vegyes frontend UI | 7 | közepes | **DONE** | session_014Dwn / 2026-09-03 | 0/1/2/3 |
| C | #063 mennyiség `db→cs` + tört bevitel + **adatmigráció** | 8 | **magas** | **DONE** | session_014Dwn / 2026-09-03 | 0/0/4/5 |
| D | #040 AYCM statisztika bővítés | 5 | közepes | **DONE** | session_014Dwn / 2026-09-03 | 0/0/0/1 |
| E | Kis frontend fix-jegyek (#013 #012 #064 #011 #010 #009) | 13 | közepes | **DONE** | session_014Dwn / 2026-09-03 | 0/0/2/1 |
| F | Backend sync-jobok (#056 #057 #058) | 6 | közepes-magas | **DONE** | session_014Dwn / 2026-09-03 | 0/2/2/3 |
| G | Záró kis jegyek (#019 #026 #038 #044 #020) | 9 | alacsony | **DONE** | session_014Dwn / 2026-09-03 | 0/0/1/1 |
| H | `install-android.ps1 -Deliver` | 2 | alacsony | **DONE** | session_014Dwn / 2026-09-03 | 0/0/1/3 |

`b/M/m/n` = blocker / major / minor / nit darabszám, a chunk lezárásakor kitöltve.

> **2026-09-03 — FIX KÉSZ.** Mind a 35 finding rendezve ugyanebben a session-ben (`worktree-giga-review`
> ág, 12 fix-szelet). A lenti chunk-táblákban a `Státusz` oszlop `open` értékei elavultak: 33 finding
> `fixed` (kód + teszt), 2 `dokumentált korlát` (C-4, E-3). Részletek: „Konszolidált fix-lista" →
> „Fix-implementáció".

---

## Chunk A — Doksi-restrukturálás (Fázis 3b–6)

**Jelleg:** csak `documentation/` + `backlog/` + `IMPLEMENTATION_STATUS.md` + `README.md` + `CLAUDE.md`. Nincs futó kód. A review itt = **konzisztencia-ellenőrzés**: a jelen-idejűre átírt specek tényleg a `c6d7a85` kódot írják-e le, a `verifikalt_commit` bélyegek stimmelnek-e, a törölt „post-MVP / későbbi scope" blokkok helyett valós működés vagy `> Tervezett: [[backlog/NNN]]` pointer áll-e, a CLAUDE.md kiegészítések igazak-e.

**Diff-parancs:**
```
git diff 2c09d70..c6d7a85 -- documentation/ backlog/ IMPLEMENTATION_STATUS.md README.md CLAUDE.md
```

**Commitok:**
```
48bb533  docs(audit): Fázis 3b — 14 chunk dokumentáció↔implementáció audit riport
7588d01  docs(backlog): Fázis 3c — audit rollup + 54 jegy a hiányosságokból
6acbd9d  docs(status): audit + 3 RED-javítás bejegyzés a változásnaplóba
74314eb  docs(spec): Fázis 4 — Steps chunk jelen-idejű átírás + verifikálás-bélyeg
ebf0f17  docs(spec): Fázis 4 — Értesítések jelen-idejű átírás + verifikálás-bélyeg
279a21b  docs(spec): Fázis 4 — Pénzügyek chunk jelen-idejű átírás + verifikálás-bélyeg
59d07bf  docs(spec): Fázis 4 — AYCM chunk jelen-idejű átírás + verifikálás-bélyeg
8819b52  docs(spec): Fázis 4 — Google Calendar szinkronizálása → Váz + tervezett-banner
0d07ce6  docs(spec): Fázis 4 — Tasks chunk
f9ca94e  docs(spec): Fázis 4 — GearCheck chunk jelen-idejű átírás
a409f5b  docs(spec): Fázis 4 — Auth/Profile/Nyelv/Téma chunk jelen-idejű átírás
65c3b52  docs(spec): Fázis 4 — Food katalógus chunk jelen-idejű átírás
f605541  docs(spec): Fázis 4 — Food meals/recept/tápérték/statisztika chunk átírás
39829a9  docs(spec): Fázis 4 — Bevásárlás chunk jelen-idejű átírás
dac7f81  docs(spec): Fázis 4 — Workout (nem climbing) chunk jelen-idejű átírás
9a41447  docs(spec): Fázis 4 — Climbing chunk jelen-idejű átírás + Giga archív törlése
7475369  docs(spec): Fázis 4 — Architektúra-SSOT-k + hub chunk jelen-idejű átírás
e952b9c  docs(spec): Fázis 4 zárás — Szinkronizációs központ bélyeg
846872b  docs: Fázis 5 — SSOT-deklaráció átbillentése
20bf851  docs(status): Fázis 6 — IMPLEMENTATION_STATUS.md elvékonyítása
e124ce5  docs(claude): CLAUDE.md kiegészítése hiányzó fejlesztői tudással
```

**Fókusz-kérdések:**
- `e124ce5` CLAUDE.md állításai (NVS útvonalak, `CHROME_BIN`, `gen:api` jar-fallback, `-Deliver`, nested-aggregate PUT, shared/global Food) — mind igaz a kódra?
- Steps/Értesítések „08:00 → 09:00" háttér-worker, `/api/workout/sessions` → `/api/workout-sessions`, `PANTRY` → `ROOM` javítások tényleg egyeznek a kóddal?
- Van-e spec, ami `Kész` státuszú, de a Fázis 4 átírás után is drifty (pl. #063 még nem volt kész a Fázis 4-kor — a 6db89cf külön újraírta)?
- `verifikalt_commit` bélyegek: a Fázis 4 commitok a saját akkori HEAD-jüket írták-e be, vagy elcsúsztak?

**Findings:**

| # | Súly | `fájl:sor` | Leírás | Javasolt fix | Státusz |
|---|---|---|---|---|---|
| A-1 | minor | `CLAUDE.md` (~147) + minden `documentation/**` frontmatter | **`verifikalt_commit` off-by-one a CLAUDE.md drift-recepthez képest.** Minden Fázis-4-ben átírt spec a saját átíró-commitja **előtti** commitra van bélyegezve: `Értesítések.md` bélyeg `74314eb`, utolsó érintés `ebf0f17`; `Recept.md` bélyeg `bdf5680`, utolsó érintés `932d7ca`; `Lépésszám követés.md` bélyeg `6acbd9d`, utolsó érintés `e952b9c`. A CLAUDE.md recept (`git log -1 --format=%h -- <spec>` „elmozdult a bélyegtől" → „drifty") ezért **azonnal, minden specre false-positive-ot ad**. | Vagy az átíró-commit hash-ét bélyegezd (amend / követő bump-commit), vagy a CLAUDE.md-ben a check triggerje egy későbbi **kód**-commit legyen, ami a feature kódját érinti — ne bármely későbbi commit a spec-fájlon (a docs-only követő-commit ne számítson driftnek). | open |
| A-2 | nit | `frontend/android/app/src/main/java/hu/bumler/lm2/notifications/ReminderScheduler.kt:13-16` | A fájl-komment a `documentation/Features/Értesítések.md "08:00 / 20:00 háttér-értesítés worker"` és `"08:00 step worker"` sztringeket idézi; a Fázis-4 átírás (`ebf0f17`) a spec kanonikus szövegét mindenhol **09:00**-ra váltotta (spec 160. sor: „09:00 / 20:00 háttér-értesítés worker"). Az idézett sztringek már nem léteznek. A `.kt` nincs a diff-tartományban, de a doc-átírás árválította el az idézetet. | A Kotlin-komment spec-idézeteit írd át 09:00-ra. | open |
| A-3 | nit | `documentation/Architektúra/Backend-offline first.md:458` | A `#### 17. Nem scope (első kör)` fejléc a „Nem scope" szóhasználatot viszi tovább, amit `e124ce5` épp tiltott specekben („No `Nem scope (MVP)` / 'post-MVP' / 'későbbi scope' blocks"). Tartalmilag ez architektúra-SSOT non-goal szakasz (a CLAUDE.md maga hivatkozik rá „§17"-ként), tehát a tartalom rendben — csak a címke ütközik az új szabállyal. | Opcionális: átcímkézés a `#### Tudatos korlát` konvencióra, vagy explicit kivétel a CLAUDE.md-ben, hogy az offline-first note §17-e mentesül. | open |

**Pozitív ellenőrzések (ne ismételd újra-review-nál):**
- CLAUDE.md konkrét állítások a fa ellen: backend feature-csomagok (`auth/aycm/climbing/finance/food/gear/profile/steps/tasks/workout`) ✓ · `shared/fixtures/` = pontosan a 4 nevesített JSON ✓ · NVS `node/24.1.0` létezik ✓ · `capacitor.config.ts` `LM2_CAP_HTTP_SCHEME === '1'` → `androidScheme:'http'` ✓ · Capacitor plugin-lista egyezik a `package.json`-nal ✓ (apró: `@capacitor/status-bar` a package.json-ban van, a CLAUDE.md nem listázza — lényegtelen).
- ROLLUP „tény-javítás" állítások: OpenAPI tag/path `workout-sessions` (nem `workout/sessions`) ✓ · sehol nincs `PANTRY` literál a `frontend/src` / `backend/src/main` alatt (→ `ROOM` átnevezés kész) ✓ · `ReminderScheduler.kt` 09:00 + 20:00 slotot fegyverez, a spec-próza konzisztensen 09:00 ✓.
- Maradék halasztás-blokkok: csak `Backend-offline first.md:458` (lásd A-3); máshol a `documentation/`-ban nincs `post-MVP` / `Nem scope` / `későbbi scope` ✓.
- `openapi-generator-cli` jar-verzió (7.24.0): **nem ellenőrizhető** — a worktree-ben nincs `node_modules`; halasztva, alacsony kockázat.
- `IMPLEMENTATION_STATUS.md` elvékonyítás (`20bf851`): a fájl most changelog per-round bejegyzésekkel; érdemi információvesztés nem látszik.

---

## Chunk B — Vegyes frontend UI

**Jelleg:** kisebb, egymástól független frontend változások. Nincs backend, nincs migráció.

**Diff-parancs:**
```
git diff 2c09d70..c6d7a85 -- frontend/src/app/shared/ frontend/src/app/pages/food/ documentation/
# vagy commit-onként: git show <hash>
```

**Commitok:**
```
84835e3  fix(frontend): hiányzó ion-icon regisztráció — wallet-outline + storefront-outline
6987549  feat(frontend): app-quantity-input placeholder — mód szerinti példa hint
522e97d  feat(frontend): reorder-list — fel/le nyilak egymás alá
d67c348  feat(frontend): étkezés-tételek — csak-olvasható összegző lista + tétel-szerkesztő modal
5fe3206  docs(spec): Étkezés — tétel-szerkesztő modal + összegző lista jelenlegi állapot
4fe11e1  feat(frontend): quantity-input unitChips + étkezés FOOD mennyiség FormControl-ra
41672c1  docs(spec): Mennyiség mező unitChips + Étkezés FOOD FormControl — jelenlegi állapot
```

**Fókusz-kérdések:**
- `d67c348` tétel-szerkesztő modal: OnPush + signal minta betartva? A modal dismiss/mentés útvonal helyes-e (nincs elárvult subscription, `ModalController` cleanup)? A „csak-olvasható összegző lista" tényleg nem ír-e a store-ba?
- `4fe11e1` FOOD mennyiség `FormControl`-ra állítása: a korábbi kétirányú signal-kötés migrálása nem hagyott-e ott dupla forrást / elveszett validációt? A `unitChips` mértékegység-váltás kerekítése/konverziója megegyezik-e a `shared/quantity.ts` SSOT-tal?
- `522e97d` reorder-list nyilak: a fel/le gomb `disabled` állapota a szélső sorokon helyes? Billentyűzet/AT-elérhetőség?
- `6987549` placeholder hint: XSS-mentes (nincs `innerHTML`), i18n kulcsokon megy?

**Findings:**

| # | Súly | `fájl:sor` | Leírás | Javasolt fix | Státusz |
|---|---|---|---|---|---|
| B-1 | **major** | `frontend/src/app/pages/food/meal/meal-item-editor.component.ts` + `meal-edit.page.ts` (`save()`, `openEditor`) | **A tétel-szerkesztő modal „Mégse" gombja nem állít vissza.** A modal a megosztott sor-objektumot helyben mutálja (`FormControl` / signal `.set()` minden billentyűleütésre); a `cancelled.emit()` csak bezár. Egy már érvényes sor szerkesztését „Mégse"-vel elhagyva minden módosítás megmarad. FOOD/CUSTOM sor hozzáadása → szerkesztő → Mégse → a sor „hiányos" marad, és a `save()` az egész étkezésre blokkol (`hasIncompleteItem`) — csak kitöltéssel vagy a sor törlésével (reorder-list remove) oldható. A commit-üzenet a „hiányos-dismisskor" viselkedést szándékosnak írja, de a „Mégse ami nem mégse" + a mentés-blokk csapda UX-korrektségi hiba. | A szerkesztő draft/pillanatkép-másolaton dolgozzon; `done` commitál, `cancelled` visszaállít; egy sosem-érintett, frissen hozzáadott sor `cancelled`-re essen ki a listából. | open |
| B-2 | minor | `frontend/src/app/pages/food/meal/meal-item-editor.component.ts` (`onServingsInput`, `parseOptionalNumber`) | `onServingsInput` az üres / `0` / negatív / NaN bemenetet **csendben eldobja** — a signal a régi értéket tartja, miközben az `ion-input` egyirányú `[value]` kötése a bevitt (elutasított) szöveget mutatja tovább → model/view desync a következő érdemi írásig. A `parseOptionalNumber` a negatív CUSTOM makró/kcal értéket is elfogadja (`-50` átmegy). | Elutasításkor a mezőt állítsd vissza a modell-értékre; a negatívokat is utasítsd el. | open |
| B-3 | minor | `frontend/src/app/pages/food/meal/meal-item-row.ts` (`buildFoodRow`) | `toSignal(quantityControl.valueChanges, { injector })` a **page** injectorát kapja, így minden **eltávolított** FOOD sor `valueChanges` feliratkozása a page destroy-ig él. Navigáció közti szivárgás nincs (a page élettartama határolja), de egy hosszú szerkesztő-munkamenetben korlátlanul gyűlik. | Soronkénti `DestroyRef` / kézi teardown a sor eltávolításakor. | open |
| B-4 | nit | `meal-edit.page.ts` (`rowTitle`, `rowSummaryLine`), `frontend/src/app/shared/quantity-input/quantity-input.component.ts` (`activeUnit`) | Template-ből hívott metódusok munkát végeznek (`translate.instant`, `parseQuantityInput`) minden change-detection körben; a lecserélt kód pipe-okat használt. Jelenlegi lista-méret + OnPush mellett elhanyagolható, de altitude-visszalépés. | `computed()` / tiszta pipe. | open |
| B-5 | nit | `frontend/src/app/shared/quantity-input/quantity-input.component.ts` (`pickUnit`) | `pickUnit()` kézzel épített `{amount, unit}`-ot emittál, nem járatja körbe a `parseQuantityInput`-on; ha egy chip-címke valaha eltér a parser kanonikus unit-tokenétől, az emittált érték és a látható szöveg szétcsúszik. Ma a chipek hívó-kuráltak, így lappangó. | `pickUnit` is `parseQuantityInput`-on keresztül. | open |
| B-6 | nit | `frontend/src/app/pages/food/meal/meal-item-row.ts` (`NO_QUANTITY`) | Megosztott modul-szintű mutálható objektum minden `createFoodRow` control kezdőértékeként; egy jövőbeli in-place mutáció korrumpálná a közös sentinelt. | `Object.freeze(NO_QUANTITY)` vagy factory. | open |

**Pozitív ellenőrzések (ne ismételd újra-review-nál):**
- `84835e3` ikon-reg: helyes; a `crescent` / `dots` `ion-spinner` név (beépített), nem `addIcons` bejegyzés — a commit „minden más ion-icon regisztrálva" állítása áll ✓.
- `6987549` placeholder hint: OnPush megmaradt, `TranslatePipe` importban, `PLACEHOLDER_QUANTITY/DURATION` kulcs hu+en ✓.
- `522e97d` reorder-nyilak: OnPush megmaradt, `COMMON.MOVE_UP/MOVE_DOWN/REMOVE` kulcs létezik (a1ef360-ból), spec `provideTranslateService()`-szel bővítve ✓; UI-only, a move-logika érintetlen.
- `d67c348` / `4fe11e1`: a `save()` guard `!isRowComplete(row)`-ra egyszerűsítése viselkedés-ekvivalens az explicit checkekkel ✓; modal teljesen bekötve (`[isOpen]`, `(didDismiss)`, `(done)`, `(cancelled)` → `closeEditor()`) ✓; minden új i18n kulcs feloldódik hu+en ✓; `HelpInputComponent`-nek van `<ng-content select="[chips]">` slotja ✓; OnPush mindkét új komponensen ✓.

**Cross-ref Chunk C-hez:** `FOOD_QUANTITY_UNIT_CHIPS = ['g','dkg','db','ml']` megtartja a `'db'`-t; #063 után `cs` **és** `db` is érvényes unit — a chipek nem kínálják a `cs`-t; ellenőrizd Chunk C-ben, hogy ez szándékos.

---

## Chunk C — #063 mennyiség `db → cs` + tört bevitel + adatmigráció  ⚠️ MAGAS KOCKÁZAT — ÖNÁLLÓ SESSION

**Jelleg:** mértékegység-átnevezés végigvezetve backend + frontend + shared fixtures + **három migrációs mechanizmus** (Flyway `V30`, lokális SQLite `V28`, `OutboxMigrator` v2). Plusz tört (`N/M`) bevitel és skálázott-egész kanonikus egyenlőség a `shared/quantity.ts`-ben, és a katalógus `Food.pieceAmount` / `pieceUnit` új mezők + `db` mint kontextuális egység + közös feloldó.

**Diff-parancs:**
```
git diff 2c09d70..c6d7a85 -- shared/ frontend/src/app/shared/quantity.ts \
  frontend/src/app/core/storage/ frontend/src/app/core/sync/ \
  backend/src/main/resources/db/migration/ backend/src/main/java/hu/bumler/lm2/food/ \
  backend/src/main/resources/openapi/ frontend/src/app/pages/food/ frontend/src/app/api/
```

**Commitok:**
```
39d5e26  docs(backlog): 063 — mértékegység db→csomag + katalógus darab-definíció (in-progress)
5c1df5f  feat(mennyiség): »darab« (db) → »csomag« (cs) mértékegység-átnevezés (#063 A. fázis)
dff1456  feat(sync): db→cs adatmigráció — Flyway V30 + lokális SQLite V28 + OutboxMigrator v2 (#063 E. fázis)
fb1e267  feat(mennyiség): tört bevitel (N/M) + skálázott-egész kanonikus egyenlőség (#063 D. fázis)
c6c52f4  feat(food): katalógus darab-definíció — Food.pieceAmount + pieceUnit (#063 B. fázis)
61815f9  feat(food): »darab« (db) mint kontextuális mennyiség-egység + közös feloldó (#063 C. fázis)
b9d7577  docs(backlog): 063 — haladás-jegyzet, kód-szeletek (A–E) kész és zöld
6db89cf  docs(spec): #063 lezárás — 12 spec átírva a jelen állapotra + jegy archiválva
```

**Fókusz-kérdések (a legfontosabb chunk):**
- **Flyway `V30`**: idempotens? Csak `WHERE unit = 'db'` élő sorokat írja át? Van-e olyan tábla, amiről lemaradt (grep `'db'` minden mennyiség-oszlopon)? A `updated_at` trigger emiatti tömeges bump nem rontja-e el a delta-pull horizontját?
- **SQLite `V28`**: a `SCHEMA_V28` blokk **append**-only (nem módosít korábbit)? A `db→cs` update ugyanazt a sorhalmazt éri-e el a kliensen, mint a szerveren? Mi történik egy sosem-syncelt lokális draft-tal?
- **`OutboxMigrator` v2**: a `PENDING` outbox payload-okban lévő `unit: 'db'` átírása — minden érintett entitástípusra lefut? Verzió-latch helyes (nem futtatja újra, nem hagy ki eszközt, ami két verziót ugrik)?
- **Kétirányú fogyasztás**: online web (`db→cs` a szerveren) és offline natív (migrátorok) **konvergál** ugyanarra? Egy régi kliens `cs`-t nem ismerő payload-ja mit csinál a szerveren (400/422?) — van kezelés?
- **`shared/quantity.ts` tört bevitel**: `N/M` parse — nulla nevező, negatív, `1/0`, `3/2` > 1, whitespace, `,` vs `.`? A „skálázott-egész kanonikus egyenlőség" nem tör-e el meglévő egyenlőség-hívót? **Van-e minden edge-case-hez `shared/fixtures/quantity-conversion.json` sor** (a repo szabálya: fixture-sor, nem egyoldali teszt)? A Java `QuantityConverterTest` és a TS `quantity.spec.ts` ugyanazt a fixture-t olvassa?
- **`Food.pieceAmount` / `pieceUnit`**: OpenAPI schema + Flyway oszlop + entity + mapper + generált kliens mind szinkronban? `null` (nincs darab-definíció) helyesen kezelt mindenhol? A „közös feloldó" (`db` kontextuális egység → tényleges mennyiség) hol él, egy helyen van-e (frontend+backend paritás)?
- Regenerált API kliens (`frontend/src/app/api/`) — kézzel nem editált, a `gen:api` kimenete?

**Findings:**

| # | Súly | `fájl:sor` | Leírás | Javasolt fix | Státusz |
|---|---|---|---|---|---|
| C-1 | minor | `frontend/src/app/core/sync/outbox-migrator.ts` (`ALL_ENTITY_TYPES`) | A komment azt állítja, hogy a `... as const satisfies readonly OutboxEntityType[]` elkapja, ha valaki új uniont-tagot vesz fel az `OutboxEntityType`-hoz e lista frissítése nélkül — **nem kapja el** (a `satisfies` csak az elemek assignability-jét ellenőrzi, nem a teljességet). **Ma a lista teljes** (36 == 36, set-diff igazolva). De egy jövőbeli új entitástípus, amit a unionba felvesznek, de ide nem, csendben regresszál: az adott típus elakadt offline írásai → ERROR a következő `OUTBOX_PAYLOAD_SCHEMA_VERSION` bumpkor. | `ALL_ENTITY_TYPES`-t a már `Record<OutboxEntityType, …>`-tipusú `OutboxEntityRegistryService`-ből származtatni, vagy valódi exhaustiveness-guard (`Record<OutboxEntityType, true>` az array-ből — nem fordul, ha hiányos). | open |
| C-2 | minor | `frontend/src/app/pages/food/food-quantity.ts` (`netBase`, SI-ágak) | Nincs védelem `netAmount <= 0` / `NaN` / `Infinity` ellen. `netAmount: 0` Food → `netBase` = `0` → `packages = baseAmount / 0 = Infinity` (SI-unit és SI-darab-definíció ág). A backend `validatePiece` a `pieceAmount > 0`-t őrzi, de a `netAmount > 0`-t semmi ebben a diffben. A „közös feloldó" védje magát. | `netBase` → `null`, ha `netAmount <= 0`. | open |
| C-3 | minor | `frontend/src/app/pages/food/food-quantity.ts` (`formatFoodQuantity`) | Display-hint inkonzisztencia szemantikailag azonos mennyiségekre. `formatFoodQuantity(2,'cs',food)` → `"2cs (2000g)"`, de `formatFoodQuantity(2,'db',food)` darab-definíció nélkül → csupasz `"2db"` — pedig `1 db = 1 cs`. Enyhe regresszió is a #063 előtti `formatIngredientQuantity`-hez képest (az `"2db (Xg)"`-t mutatott bármely `db`-re, ha volt nettó tartalom). | `db` + nincs `pieceDef` esetén essen át a `cs` formázó ágra. | open |
| C-4 | minor (mélyebb vizsgálat; a tartomány előtti gyökér) | `frontend/src/app/core/data/meal.repository.ts` (`canonicalDemand`) + `frontend/src/app/pages/food/storage/stock-consumption.ts` (`planStockConsumption`) | A készlet demand/consumption „kanonikus alap-egysége" egy piece-Food-ra nem egyértékű: `cs`→csomag, SI→g/ml, `db`→`.packages ?? .baseAmount`. Ha egy Food StoredFood-sorai és az étkezés-hivatkozásai nem ugyanabban a dimenzióban vannak (pl. `cs` split-vásárlásból vs `g`-ben megadott étkezés-tétel), a FIFO-ciklus grammot von ki csomagból. Az ambivalencia #063 előtti (a régi `db` szorzó is 1 volt), de #063 szélesíti a felületet a `cs` külön unitként. | Normalizáló lépés (Food-onként egy dimenzióra feloldani) vagy dokumentált `#### Tudatos korlát`. | open |
| C-5 | nit | `stock-consumption.ts` (`rowCanonical` ternár) | `resolveFoodQuantity(row.quantityAmount, 'db', food)` 2–3× hívva egy kifejezésben (`.packages ?? <újra hív>.baseAmount ?? …`). | Egyszer számítsd lokálisba. | open |
| C-6 | nit | `frontend/src/app/shared/quantity.ts` (`scaledEqual`) vs `QuantityConverter.scaledEqual` | Kerekítési mód eltérés: TS `Math.round` (fél → +∞), Java `RoundingMode.HALF_UP` (fél → nullától el). ≥ 0 értékekre azonos (a tört-regex `-1/2`-t elutasít), így gyakorlati paritás-törés nincs — lappangó eltérés a pontos félnél, ha valaha negatív kanonikus érték lehetségessé válik. | Egységes kerekítési szabály dokumentálva/kódban. | open |
| C-7 | nit | `backend/.../db/migration/V30__unit_db_to_cs_and_food_piece.sql` + `local-database.service.ts` SCHEMA_V28 | `piece_amount`/`piece_unit`-nak nincs DB-szintű `CHECK` (both-or-neither, egység-halmaz, `db` tiltás, `> 0`) — csak `FoodService.validatePiece` + kliens-form. A repo egyébként DB-constraintre támaszkodik (partial unique index, `CHECK (step_count >= 0)` stb.). | `CHECK ((piece_amount IS NULL) = (piece_unit IS NULL))` legalább. (A migráció-komment szándékosnak írja — lehet wontfix.) | open |
| C-8 | nit | `frontend/src/app/shared/quantity.ts` (`INPUT_PATTERN`) | A tört-alternatíva `\d+\/\d+` nem visz `-?`-t, így `-1/2cs` teljesen elhasal, míg `-1cs` parse-olódik. Negatív mennyiség/időtartam amúgy értelmetlen — csak konzisztencia-észrevétel. | — (vagy explicit elutasítás mindkettőre). | open |
| C-9 | nit | `backend/.../ShoppingListService.java` (`splitCountFor`) | `cs` ágon `amount.intValueExact()` `ArithmeticException`-t dob egy abszurd (>2³¹) mennyiségre, ahol a kliens `Math.max(1, amount)` simán visszaad — kliens/szerver divergencia + 500 az irreális szélen. | `intValueExact` helyett `min(SOME_CAP, …)` vagy `intValue()`. | open |

**Pozitív ellenőrzések (ne ismételd újra-review-nál):**
- **Frontend ↔ backend mennyiség-paritás:** `EQUALITY_DECIMAL_SCALE = 4` mindkét oldalon; `scaledEqual` tükrözve (`setScale(4, HALF_UP)` ↔ `Math.round(x*1e4)`); `PIECE_MULTIPLIERS = {cs:1, db:1}` mindkét oldalon; `quantityFamily('db') == PIECE` mindkét oldalon. A Java-ban **szándékosan nincs** tört-parser (a backend `numeric`-et tárol; a tört bevitel frontend-affordancia) — nincs paritás-rés.
- **Fixture-vezérelt tesztek:** `quantity.spec.ts` olvassa a `fixture.equalityDecimalScale`-t + iterál a `fixture.fractionExamples`-ön; `QuantityConverterTest` olvassa a `/equalityDecimalScale`-t. A repo „fixture-sor, nem egyoldali teszt" szabálya betartva ✓.
- **`durationsEqual`** kapott egy `canonicalB != null` guardot (lappangó NPE-javítás) ✓.
- **V30 migráció:** az 5 UPDATE lefedi az összes quantity-unitot tartó `*_unit` oszlopot (`food.net_unit`, `recipe_ingredient`, `meal_item`, `stored_food`, `shopping_list_item`); a packing-template-nek nincs quantity unitja. `ADD COLUMN … NULL` nem bumpolja az `updated_at`-et; az UPDATE-vezérelt egyszeri `updated_at`-bump + delta-újratöltés explicit módon végiggondolt, korlátos no-op merge. A SQLite `SCHEMA_V28` pontosan tükrözi, helyesen appendelve (`toVersion: 27` kiemelve, `SCHEMA_VERSION = 28`), korábbi `SCHEMA_Vn` blokk nem szerkesztve ✓.
- **OutboxMigrator v2:** `ALL_ENTITY_TYPES` ma teljes az `OutboxEntityType`-hoz képest (36/36, set-diff); `rewriteNode` kulcs-szűkített (`netUnit`/`quantityUnit`/`pieceUnit`), így egy literál `"db"` egy névben/megjegyzésben érintetlen; a rekurzió kezeli a nested aggregátumokat; a payloadok JSON-parsed sima objektumok, így az újraépítés biztonságos. `migrateOutboxItem` verziónként lépked, a `${entityType}:${version}` kulcsformátum egyezik a regisztrált kulcsokkal ✓.
- **`recipe-summary.ts` refaktor** (`baseAmountOf` + `priceContribution` → `resolveFoodQuantity`): viselkedés-megőrző a darab-definíció nélküli (gyakori) esetre — ágról ágra ellenőrizve SI / `db` / hiányzó-nettó; helyesen bővül `cs`-re és darab-definíciókra.
- **`splitCountFor` kliens ↔ szerver paritás:** `db` → ceil mindkettő; `cs` → integer-check mindkettő (`Number.isInteger` ↔ `stripTrailingZeros().scale() <= 0`, a `3E+1` trailing-zero esetet is beleértve); fallback unit `'cs'` mindkettő. Minden reális bemenetre áll (egyetlen eltérés: C-9).
- **`FoodService.validatePiece`:** both-or-neither, `db`-tiltás, ismeretlen-egység-tiltás (`quantityFamily == null`), `pieceAmount > 0` — mind kikényszerítve; `findLiveDuplicate` az új mezőket `quantitiesEqual`-lel hasonlítja, aminek a both-null ága helyesen `true` (a gyakori darab-definíció-nélküli dedup ép); OpenAPI `Food.yaml` + generált `food.ts` hordozza a mezőket; a kliens `food-edit.page.ts` tükrözi a `db`-tiltást (`pieceUnitNotDb` validátor) és a `QuantityInputComponent` „sose commitál fél értéket" garanciájára épít a both-or-neither-hez.

---

## Chunk D — #040 AYCM statisztika bővítés

**Diff-parancs:**
```
git diff 2c09d70..c6d7a85 -- frontend/src/app/pages/menu/aycm/ documentation/ backlog/
```

**Commitok:**
```
8c6b5c6  docs(backlog): 040 — idei év (THIS_YEAR) szelet beolvasztva, jegy kiscoppolva
52a097c  feat(frontend): AYCM statisztika — idei év (THIS_YEAR) preset
a385df6  feat(frontend): AYCM statisztika — egyéni tartomány + összes idő + önrész-kártya
6c8fe56  feat(frontend): AYCM statisztika — havi bontás diagram
cd982bc  docs: #040 lezárás — AYCM statisztika bővítés specre írva, jegy archiválva
```

**Fókusz-kérdések:**
- Dátum-tartomány számítás: `THIS_YEAR` / „összes idő" / egyéni tartomány határai — inkluzív/exkluzív konzisztens? Időzóna (kliens TZ vs UTC) a hónaphatároknál?
- „önrész-kártya" pénzösszeg: kerekítés, deviza, 0/negatív eset?
- Havi bontás diagram: üres hónapok (0 érték) megjelenítése; a diagram lib ugyanaz-e, mint a többi képernyőn; nagy tartomány (több év) teljesítmény?
- Minden számítás pure/computed signal, OnPush?

**Findings:**

| # | Súly | `fájl:sor` | Leírás | Javasolt fix | Státusz |
|---|---|---|---|---|---|
| D-1 | nit | `frontend/src/app/pages/menu/aycm/aycm-stats.page.ts` (`setCustomFrom`, `setCustomTo`) | Kiürített dátum-mezőt csendben eldob, a régi értéket tartja (a B-2-vel azonos alak). Kötelező tartomány-végpontra védhetőbb, mint a B-2, ezért kisebb súly. | — (elfogadható) | open |

**Pozitív ellenőrzések (ne ismételd újra-review-nál):**
- `aycm-stats.ts` tiszta pure TS: `monthsSpanned` / `customRange` (végpont-csere fordítottnál) / `allTimeRange` (üres → 1 nap/1 hónap) / `monthlyBuckets` (rés nélküli hónap-sorok, kronológiai sorrend) — mind `YYYY-MM-DD` lexikai összehasonlítással, **nincs időzóna-hiba** (minden kliens-lokális dátum-string).
- `AycmCheckIn.coPaymentHuf: number` **kötelező, nem nullable** → `summarize` `sum + c.coPaymentHuf` nem ad NaN-t.
- Osztás-védelem: `chartMaxHuf = Math.max(1, ...)` (sose 0); `coPaymentAvgHuf` `visitCount === 0 ? null`; `showChart` csak ≥ 2 hónapra.
- Nagy tartomány (`ALL_TIME` több év) teljesítmény: `monthlyBuckets` hónaponként 1 bucket, pár tucat–száz — korlátos, olcsó.
- Minden számítás `computed` signal, OnPush megtartva; a chart CSS `[style.width.%]` kötése számított érték (nem user-szöveg), Angular sanitizálja.
- i18n: `THIS_YEAR`/`ALL_TIME`/`CUSTOM`/`CUSTOM_FROM`/`CUSTOM_TO`/`CUSTOM_RANGE_REVERSED`/`CARD_COPAY`/`COPAY_AVG`/`CHART_TITLE`/`CHART_MONTH_SUMMARY` hu+en felvéve ✓.
- **Tudatos döntés (nem finding):** `monthCount` minden ablakra egész-hónap-számláló a részleges vég-hónapot is beleértve (`THIS_YEAR` fix 12, 1 napos CUSTOM = 1) → a „megéri-e" az ablak elején mindig kedvezőtlenül olvas. Kommentben dokumentált, a presetekkel konzisztens.

---

## Chunk E — Kis frontend fix-jegyek (#013 #012 #064 #011 #010 #009)

**Diff-parancs:**
```
git diff 2c09d70..c6d7a85 -- frontend/src/app/pages/ frontend/src/app/core/ documentation/ backlog/
# jobb commit-onként nézni, mert 6 külön jegy
```

**Commitok:**
```
3db8536  fix(climbing): szín-sáv közép-index floor a Math.round helyett (#013)
88b22ab  docs: #013 lezárás
18da204  fix(frontend): featureFlagGuard a shopping + tasks al-route-fákon (#012)
dd5e6f4  docs: #012 lezárás
1917ba8  fix(frontend): featureFlagGuard a gear menü-al-route-fán (#064)
677d6aa  docs: #064 lezárás
a72c86f  fix(frontend): aktív /login átirányítás sikertelen csendes refresh után (#011)
da5b904  docs: #011 lezárás
b56be9c  fix(frontend): offline Food-törlés helyi cascade meal_item + shopping_list_item (#010)
a9305d4  docs: #010 lezárás
e1f31e1  fix(frontend): Food törlés-megerősítő felsorolja a cascade-hivatkozásokat (#009)
bdf5680  fix(frontend): Recept törlés-megerősítő is felsorolja a hivatkozásokat (#009)
932d7ca  docs: #009 lezárás
```

**Fókusz-kérdések:**
- **#013** floor vs round: a közép-index most helyes minden sáv-hosszra (páros/páratlan, 1 elemű, üres)? Nincs off-by-one a szélső sávnál?
- **#012 / #064** `featureFlagGuard` al-route-fákon: minden gyerek-route tényleg védett (nem csak a parent)? A guard flag-kulcsok stimmelnek? Kikapcsolt flag → redirect hova, nem 404/üres shell?
- **#011** `/login` redirect sikertelen csendes refresh után: nincs redirect-loop? A `returnUrl` megőrződik? Egyidejű több 401 (párhuzamos kérés) egyszer irányít át?
- **#010** offline Food-törlés helyi cascade: a `meal_item` + `shopping_list_item` cascade **egy tranzakcióban** megy a tombstone + outbox írással? A szerver-oldali cascade ugyanezt teszi (konvergencia)? Soft-delete, nem hard? Mi van a már-syncelt vs sosem-syncelt gyerekkel?
- **#009** törlés-megerősítő hivatkozás-lista: a lekérdezés (mely receptek/étkezések hivatkozzák a Food-ot) offline is működik lokális store-ból? Teljesítmény nagy adathalmazon? i18n?

**Findings:**

| # | Súly | `fájl:sor` | Leírás | Javasolt fix | Státusz |
|---|---|---|---|---|---|
| E-1 | minor (pattern-szintű) | `frontend/src/app/core/storage/sqlite-storage-backend.ts` `deleteFood` (~1820) | A cascade-del kiürült Meal helyi soft-delete-je **nincs összeegyeztetve az outboxszal**: ha a Meal-t offline hozták létre (van függő POST), a cascade nem enqueue-ol coalesce-elő DELETE-et, így a drain **újra létrehozza a Meal-t a szerveren** a most már törölt Food-ra hivatkozva. A szerver saját cascade-je nem kapta el (a Meal nem létezett szerver-oldalon a Food DELETE feldolgozásakor), így csak egy későbbi pull javíthatja — vagy ERROR lesz belőle. Offline-nehéz edge, de a minta (`deleteHouseholdRoom`, `deleteRecipe` cascade) is osztja. | Cascade-elt entitásoknál a coalesce-elő DELETE enqueue-olása, ha van függő create; vagy dokumentált korlát. | open |
| E-2 | minor | `sqlite-storage-backend.ts` `deleteFood` (emptied-meal számláló, ~1795-1810) | Az új `(élő darabszám) - removedCount <= 0` üres-meal logika off-by-one-ra hajlamos, és **nincs rá teszt** (a commit elismeri, hogy a helyi cascade-eknek nincs harness-e — de ez új, nem-triviális ág). | Legalább egy unit-teszt a 2-tétel/1-hivatkozik és az összes-tétel-hivatkozik esetre. | open |
| E-3 | nit | `frontend/src/assets/i18n/en.json` `FOOD.CATALOG.DELETE_REF_*` / `FOOD.RECIPE.DELETE_REF_*` | Az angol ref-sztringek sima `{{count}} storage item` interpoláció, nincs plural forma → `2 storage item`. A magyar helyes így (számnév után nincs többesszám). | ICU plural az en oldalon (`{count, plural, one {…} other {…}}`). | open |

**Pozitív ellenőrzések (ne ismételd újra-review-nál):**
- **#013** (`3db8536`): az inline `Math.round((low+high)/2)` → a megosztott `colorBandMidIndex` (= `Math.floor(...)`) helper; a szerver csak a kliens-snapshotot tárolja (nincs szerver-oldali közép-index számítás a `climbing/`-ben), így nincs paritás-rés. Teszt hozzáadva a páratlan-összegű sávra (`[15,18] → 16`). Tiszta.
- **#012 + #064** (`18da204`, `1917ba8`): `featureFlagGuard` a `shopping` / `life-plans` / `events` / `calendar` / `gear` route-fák tetején — Angular a szülő `canActivate`-et minden gyerekre lefuttatja, így a deep link is védett. Flag-kulcsok (`menu.bevasarlas`, `feladatok.{eletTervek,esemenyek,naptar}`, `menu.gearcheck`) egyeznek a `features.json` + `feature-flags.service.ts` union/dependency-map/known-keys hármassal; a `household` al-route-ot a `tab.feladatok` fedi (nincs saját flagje). Új `app.routes.spec.ts` mind az 5 útra teszteli a ki→redirect / be→aktiválható párost. Tiszta.
- **#011** (`a72c86f`): `AppComponent` effect az `isAuthenticated()` jelen, csak `authentikált → nem` átmenetre navigál `/login`-ra, `!router.url.startsWith('/login')` guarddal a loop ellen; a `wasAuthenticated` field-initializer az `inject()`-ek után fut, első effect-futáskor nincs spurious nav. 4 új teszt (átmenet / cold start / már-login-on). A bare `/login` (returnUrl nélkül) **egyezik a meglévő `auth.guard.ts`-szel** (`parseUrl('/login')`) — az app sehol nem csinál returnUrl-t, ez tudatos termék-döntés, nem #011 regressziója. Tiszta.
- **#009** (`e1f31e1` + `bdf5680`): `shared-catalog-delete-confirm.ts` tiszta pure helper (`buildMessage` — count>0 csoportok szűrése + fix sorrend + generic fallback); `FoodReferenceCounts` (4 count) / `RecipeReferenceCounts` (1) tipizált; a web (`HttpStorageBackend`) `null`-t ad → generikus figyelmeztetés (online-only, a szerver saját cascade-je). Minden i18n kulcs megvan hu (617-622, 706-708) + en (7 találat). Spec hozzáadva.

---

## Chunk F — Backend sync-jobok (#056 #057 #058)

**Diff-parancs:**
```
git diff 2c09d70..c6d7a85 -- backend/ frontend/src/app/core/ documentation/ backlog/
```

**Commitok:**
```
b8699cf  feat(backend): tombstone-retenció cleanup + horizon-frissítő ütemezett job (#056)
2b7b35f  docs: #056 lezárás
f3f888e  feat(frontend): seed_state helyi latch tábla, natív seed explicit verzió-latch-csel (#057)
d336a7e  docs: #057 lezárás
e6b8617  feat(backend): Idempotency-Key 30-napos prune job (#058)
d23ba72  docs: #058 lezárás — Idempotency-Key prune job + enforce-everywhere
```

**Fókusz-kérdések:**
- **#056 tombstone-retenció**: a cleanup **hard-delete**-eli a régi tombstone-okat — a „horizon" úgy frissül, hogy egy `since` kurzor a horizon alatt `410 CURSOR_TOO_OLD`-ot kap (full re-pull), nem pedig csendben hiányos deltát? A retenciós ablak konfigurálható / dokumentált? A job `@Scheduled` — több instance esetén dupla futás elleni védelem (nincs, egy instance — dokumentált)? Tranzakció-méret / batch nagy táblán?
- **#057 seed_state latch**: az új lokális tábla a `SCHEMA_Vn` append szabályt követi? A „natív seed explicit verzió-latch" — újratelepítés / verzióugrás után nem seedel újra duplán, és nem hagy ki új seed-sort? Web (nincs SQLite) ág érintetlen?
- **#058 Idempotency-Key prune**: 30 nap a spec szerinti? A prune nem törölhet még élő (30 napon belüli) kulcsot TZ/összehasonlítás hibából? „enforce-everywhere" — most tényleg minden mutáló endpoint követeli a header-t (nincs kimaradó route)? Hiányzó header → egységes `400` a `@RestControllerAdvice`-ból, stabil `code`-dal?
- Mindhárom jobhoz van teszt (Testcontainers)? A `@Scheduled` cron kifejezések helyesek?

**Findings:**

| # | Súly | `fájl:sor` | Leírás | Javasolt fix | Státusz |
|---|---|---|---|---|---|
| F-1 | **major** | `backend/src/main/java/hu/bumler/lm2/common/IdempotencyKeyPruneJob.java` (`scheduledPrune` → `prune`) | `@Transactional` a `prune()`-on van, de a `@Scheduled` belépő `scheduledPrune()` **self-invocation**-nal hívja → a proxy tranzakció-advice a **production úton nem érvényesül**. A `repository.deleteByCreatedAtBefore()` `@Modifying @Query` bulk DELETE ambient tranzakció nélkül → `TransactionRequiredException` minden ütemezett futáskor; az `idempotency_key` tábla **sosem takarodik**, korlátlanul nő. A `IdempotencyKeyPruneJobTest` a `job.prune()`-t **a proxyn át** hívja, így a teszt-tranzakció elfedi a hibát és zöld. | `@Transactional` a `scheduledPrune()`-ra (v. osztály-szintre, v. repo-metódusra) + teszt, ami a `scheduledPrune()`-t hajtja. | open |
| F-2 | **major** | `frontend/src/app/core/storage/sqlite-storage-backend.ts` `seedExercises` (#057) | A `EXERCISE_SEED_VERSION` verzió-latch **működésképtelen a dokumentált céljára.** Flow: `if (latch >= VERSION) return;` → `if (exercise_catalog count === 0) { seed loop }` → mindig latch = VERSION. A Javadoc/commit szerint bumpolni kell a verziót, „ha az exercise-seed.json úgy bővül, hogy meglévő telepítésekre is le kell mennie" — de minden ilyen telepítésnek **nem-üres** a katalógusa, így a `count === 0` guard átugorja a seed loopot és csak a latchet bumpolja. Új seed-sorok sosem érnek el meglévő telepítést. | `latch < VERSION` esetén a seed loop fusson `count`-tól függetlenül (a v5 id idempotens), vagy töröld a verzió-bump állítást a doksiból. (Trade-off: a loop újrafutása a user által törölt seed-sorokat is visszahozza, ha `upsertExercise` undelete-el.) | open |
| F-3 | minor | `sqlite-storage-backend.ts` `seedExercises` (#057) | A seed `upsertExercise` loop és a záró `seed_state` latch-upsert **külön tranzakció**. Crash a seed közben (pár sor kiírva, latch még nem) → a következő indításkor `count > 0` → loop kihagyva → latch kiírva → a **részleges seed véglegesen latch-elt**. | Loop + latch egy `executeTransaction`-ben. | open |
| F-4 | minor | `backend/.../common/sync/TombstonePurgeJob.java` (`purgeExpiredTombstones` catch) | `catch (DataAccessException retryOnNextPass)` **túl tág.** Csak az FK-violation (SQLState 23503 / `DataIntegrityViolationException`) jelenti azt, hogy „retry a gyerek törlése után"; egy lock-timeout / kapcsolat-hiba / bármi más `DataAccessException` is csendben elnyelődik, a tábla minden passban újrapróbálódik, majd „nem drainelhető (foreign-key order)"-ként logolódik — félreattribúálva, és a job „sikert" ad vissza. | Szűkítsd a catch-et FK-violation-re; a többit propagáld / ERROR-ral logold. | open |
| F-5 | nit | `TombstonePurgeJob` + `IdempotencyKeyPruneJob` | Nincs elosztott lock (`@SchedulerLock`/ShedLock). A projekt egy-instance feltételezésével biztonságos (mindkét job DELETE-je idempotens, a horizon `GREATEST`-monoton), de egyik Javadoc sem mondja ki az egy-instance feltételezést. | Javadoc-jegyzet v. ShedLock, ha többинstance jön. | open |
| F-6 | nit | `TombstonePurgeJob.SAFE_TABLE_NAME` (`[a-z_]+`) | Elutasít minden katalógus-táblanevet, amiben számjegy vagy nagybetű van → `IllegalStateException` az **egész jobot** megszakítja. Ma minden tábla lowercase snake_case, de egy jövőbeli `v2_foo`-szerű tábla eltörné a tombstone-purge-öt. | `[a-z0-9_]+`. | open |
| F-7 | nit | `TombstonePurgeJob.advanceHorizon` | `queryForObject("SELECT tombstone_horizon FROM sync_meta", …)` pontosan 1 sort feltételez. A V1 pontosan egyet seedel és semmi más nem insertál, tehát az invariáns áll — de üres `sync_meta` → `EmptyResultDataAccessException` megszakítja a jobot. | `LIMIT 1` / explicit egy-sor kezelés. | open |

**Pozitív ellenőrzések (ne ismételd újra-review-nál):**
- **#056** `TombstonePurgeJob`: a tábla-halmaz `information_schema`-ból felderítve (jövőbeli synced tábla automatikusan bekerül), regex-guardolva a string-interpoláció előtt (defence-in-depth; a nevek a katalógusból jönnek, nem user-inputból), több-passos FK-sorrendű drain konvergencia-érveléssel, a horizon monoton (`GREATEST`) **és a deletek előtt** halad (így egy párhuzamos `sync/changes` kurzor a résben helyesen kap `410`-et), szándékosan nem-`@Transactional` per-statement autocommittal, hogy egy tábla FK-hibája ne mérgezze a testvéreket. Cron felülírható/kikapcsolható. A belső metódus jól tesztelt (horizon-haladás, expired vs recent, FK-sorrend, idempotencia).
- **#056** `sync_meta` singleton invariáns igazolva: V1 `INSERT INTO sync_meta … VALUES (now() - interval '180 days')`, sehol más insert.
- **#058** a JPQL bulk `DELETE` (nem entity-betöltős derived `deleteBy…`) helyes választás; `RETENTION_DAYS = 30` egyezik a speckel; az enforce-everywhere elemzés helytálló (plain CRUD eleve idempotens a kliens-UUID upsert + idempotens soft-delete miatt; a `POST /api/shopping-lists/{id}/complete` az egyetlen atomi végpont, ott már van header-kötelezettség + tárolás).
- **#057** SCHEMA_V29 helyesen appendelve (`toVersion: 28` kiemelve, `SCHEMA_VERSION = 29`, `CREATE TABLE IF NOT EXISTS`), korábbi `SCHEMA_Vn` blokk nem szerkesztve; `EXERCISE_SEED_VERSION = 1` megőrzi a régi web `localStorage` `'1'` latchet (`Number('1') >= 1`); a „katalógus már nem üres" rövidzár egy sync-populált friss eszközre megmarad; a determinisztikus v5 id idempotenssé teszi a maradék ismételt írást.

---

## Chunk G — Záró kis jegyek (#019 #026 #038 #044 #020)

**Diff-parancs:**
```
git diff 2c09d70..c6d7a85 -- frontend/src/app/ backend/src/test/ documentation/ backlog/
```

**Commitok:**
```
be28d88  feat(frontend): Profile súly mezők kliensoldali 1-tizedes validáció (#019)
3284da7  docs: #019 lezárás
44a9a01  feat: Gear sablon-lista soronkénti élő tételszám (#026)
4db9c0c  docs: #026 lezárás
26dce3d  feat(frontend): AYCM partner-create név-mező auto-focus (#038)
692ce9e  docs: #038 lezárás
a04539c  docs: #044 dropped — clipboard-import fejléc-alias bővítés nem kell
2f99631  test: ThemeService unit teszt + admin-jelszócsere token-revoke teszt (#020)
c6d7a85  docs: #020 lezárás
```

**Fókusz-kérdések:**
- **#019** 1-tizedes súly-validáció: a regex/step csak kliensoldali — a backend elfogad-e több tizedest (dokumentált, hogy csak UX-hint)? `,` vs `.` decimál? Üres / `0` / negatív / `999`?
- **#026** sablon-lista élő tételszám: a szám **computed signal** a lokális store-ból (nem N+1 lekérdezés a listában)? Tombstone-olt tételeket kihagyja? Frissül-e azonnal tétel add/remove után?
- **#038** auto-focus: `setTimeout` nélkül / Ionic `setFocus()` életciklus-helyes? Nem tör-e képernyőolvasót?
- **#044**: csak doc — a „dropped" indoklás konzisztens, nem maradt-e félkész kód/teszt/flag valahol?
- **#020** tesztek: a `ThemeService` unit teszt a `dark.class.css` stratégiát fedi (a `2c09d70` RED-fix B1)? Az admin-jelszócsere token-revoke teszt tényleg ellenőrzi, hogy a régi tokenek érvénytelenednek? Testcontainers vagy mock?

**Findings:**

| # | Súly | `fájl:sor` | Leírás | Javasolt fix | Státusz |
|---|---|---|---|---|---|
| G-1 | minor | `backend/src/main/java/hu/bumler/lm2/gear/PackingTemplateService.java` `list()` (#026) | **N+1 lekérdezés:** `countByTemplateIdAndDeletedFalse(entity.getId())` minden sablonra külön hívva a `.map()`-ben. Személyes-app skálán (pár tucat sablon) elhanyagolható, de valódi N+1. A natív oldal helyesen egyetlen korrelált subquery. | `GROUP BY` / `@Query` join-count egy körben. | open |
| G-2 | nit | `frontend/src/app/pages/menu/profile/profile.page.ts` `oneDecimalPlaceValidator` (#019) | `,`-tizedes bevitel (`70,5`) → `Number("70,5")` = `NaN` → a validátor `null`-t ad (nincs `oneDecimalPlace` hiba); a `Validators.min/max` is átereszti a `NaN`-t. Az `ion-input type="number"` az input-rétegen kezeli a vesszőt, így kis hatás, de a validátor nem robusztus rá. | `,` → `.` normalizálás a validátor elején. | open |

**Pozitív ellenőrzések (ne ismételd újra-review-nál):**
- **#019** (`be28d88`): `oneDecimalPlaceValidator` `1e-9` float-toleranciával (`70.1*10 = 701.0000…1` → valid); üres/`NaN` → null (más validátor dolga); a `weightKg` `Validators.max(300)` miatt nincs precíziós gond a `*10`-nél. Mező-alatti `PROFILE.VALIDATION_ONE_DECIMAL` felirat, `save()` guardolt. +95 spec.
- **#026** (`44a9a01`): `itemCount` derivált, `readOnly`, opcionális; a sync-feed nem tölti (dokumentált), a natív lokálisan számol korrelált subqueryvel, a web a `list()`-ből kapja; a repo mentés után a visszakapott fából újraszámol (`!deleted` szűréssel). Backend integration + service + FE repo + page spec. Az `(int)` cast biztonságos.
- **#038** (`26dce3d`): `[autofocus]="!isEdit"` — a codebase bevett mintája (food-edit, event-edit), edit-módban nincs fókusz; új vs edit tesztelve. AT-elfogadható (create-form első mező).
- **#020** (`2f99631`): **valódi bug-javítást is hozott** — a `ThemeService` system-módú `isDark`-ja nem reagált élő OS-témaváltásra (a `media.matches` nem-reaktív property-olvasás volt); a fix egy `systemDark` signal, amit a `change` handler frissít, az `isDark` computed ezt olvassa — helyes, a nem-system módok érintetlenek. A backend `adminPasswordChange_revokesEverySession_thenNewPasswordWorks` teszt (Testcontainers) 2 eszköz refresh-tokenét + a régi jelszót is 401-re ellenőrzi — meglévő viselkedést verifikál, nem javít.
- **#044** (`a04539c`): docs-only (jegy dropped/archivált, spec forward-pointer törölve → `Megjegyzések` → `Tudatos korlát`). Nincs félkész kód/teszt/flag — a diff csak `.md`.

---

## Chunk H — `install-android.ps1 -Deliver`

**Diff-parancs:**
```
git diff 2c09d70..c6d7a85 -- scripts/ documentation/ CLAUDE.md
```

**Commitok:**
```
7e0c8e7  feat(scripts): install-android.ps1 -Deliver — debug APK GitHub prerelease-re töltése
a998990  fix(scripts): install-android.ps1 -Deliver — gh release view ne bukjon a nem létező release-en
```

**Fókusz-kérdések:**
- `-Deliver` és `-Usb` kölcsönös kizárás tényleg érvényesítve?
- `gh release view` nem-létező release ág: a `a998990` fix helyesen csak a „not found"-ot nyeli el, más hibát (auth, hálózat) nem?
- Az asset felülírása (`--clobber`?) minden futáskor jó nevű assetet tesz közzé; a kiírt publikus URL helyes?
- Nincs titok-szivárgás a logban (`.env`, JWT secret, admin key)?
- PowerShell 5.1 kompatibilis (a repo Windows, WinPS 5.1 — nincs `??`, `?.`, ternary)?

**Findings:**

| # | Súly | `fájl:sor` | Leírás | Javasolt fix | Státusz |
|---|---|---|---|---|---|
| H-1 | minor | `scripts/install-android.ps1` (`git -C $repoRoot remote get-url origin`) | Ez a hívás a script-szintű `$ErrorActionPreference = "Stop"` alatt fut (a `a998990` fix csak a `gh` blokkot csomagolta Continue-ba). `origin` remote nélküli repón a PS 5.1 a git stderr-jét terminációs `NativeCommandError`-rá teszi (opak), a szándékolt tiszta „nem sikerült a repo slug" throw helyett. | Ezt is Continue + `$LASTEXITCODE` blokkba, vagy `git … 2>$null` + exit-code check. | open |
| H-2 | nit | `scripts/install-android.ps1` (`gh release view` ág) | Bármely nem-nulla `gh release view` exit (auth-hiba, hálózat, rossz repo) „release nem létezik"-ként kezelve → `gh release create` következik, aminek a hibaüzenete a `create`-re mutat, nem a valódi okra. | Az exit-code / stderr alapján megkülönböztetni a „not found"-ot a többitől. | open |
| H-3 | nit | `scripts/install-android.ps1` (download URL) | A „bejelentkezés nélkül működik" garancia publikus repót feltételez; nincs ellenőrzés, és privát repón a kiírt URL anonim letöltésre 404. | `gh repo view --json visibility` check + figyelmeztetés privátra. | open |
| H-4 | nit | `scripts/install-android.ps1` (`$repoSlug` regex) | Nem kezeli az `ssh://git@github.com/owner/repo.git` alakú remote-ot (a „nem sikerült a slug" throw-ba fut). | `ssh://` prefix is a `-replace` láncba. | open |

**Pozitív ellenőrzések (ne ismételd újra-review-nál):**
- `-Deliver` + `-Usb` kölcsönös kizárás explicit throw-val a script tetején ✓.
- A `a998990` fix **helyesen** kezeli a PS 5.1 natív-stderr gotchát (amit a CLAUDE.md maga dokumentál): lokális `$ErrorActionPreference = "Continue"` a `gh` blokkra, `try/finally` visszaállítással, kizárólag `$LASTEXITCODE` dönt; `2>&1 | Out-Null` + a `$LASTEXITCODE` a `gh`-t tükrözi (az `Out-Null` cmdlet, nem native). Végigtesztelve a commit szerint.
- `$repoSlug` kezeli az SSH (`git@github.com:`) és HTTPS remote-ot; guard, ha az extrakció nem változtatott (nem-github remote → throw).
- `--clobber` a `gh release upload`-on → nem szaporodnak a release-ek/asset-ek.
- Nincs titok-szivárgás: csak `$apiBaseUrl` (LAN IP) + download URL kiírva; nincs `.env` / JWT / admin key; a `gh` a saját tokenjét kezeli.
- PS 5.1 kompatibilis: `if/throw`, `Get-Command -ErrorAction SilentlyContinue`, `try/finally` — nincs `??` / `?.` / ternary.

---

## Konszolidált fix-lista

> **STÁTUSZ (2026-09-03): mind a 35 finding rendezve.** A fix-implementáció ugyanebben a session-ben
> készült el, a `worktree-giga-review` ágon, 12 zöld (teszt+lint+build) szeletben — lásd
> „Fix-implementáció" lent. 33 finding **javítva** kóddal/teszttel, 2 **dokumentált korlát**
> (C-4, E-3 — a naiv javításuk nagyobb kockázatot / aránytalan infra-t hozna, mint az érték).
>
> Eredeti összegzés: **35 finding: 0 blocker · 3 major · 13 minor · 19 nit.**

### Fix-implementáció (2026-09-03, `worktree-giga-review`)

| Szelet | Commit | Findingok | Teszt |
|---|---|---|---|
| 1 | `fix(backend): IdempotencyKeyPruneJob @Transactional` | **F-1** | `IdempotencyKeyPruneJobTest.scheduledPrune_*` (új) |
| 2 | `fix(backend): ütemezett job + N+1` | G-1, F-4, F-5, F-6, F-7 | `PackingTemplateServiceTest`, `TombstonePurgeJobTest` |
| 3 | `fix: splitCountFor MAX_SPLIT_ROWS` | C-9 | `ShoppingListSplitCountTest` (új) + FE spec |
| 4 | `fix(frontend): exhaustiveness-guard` | C-1 | `outbox-migrator.spec` (compile-time + runtime) |
| 5 | `fix(frontend): food-quantity védelem` | C-2, C-3, C-5 | `food-quantity.spec`, `recipe-summary.spec` |
| 6 | `fix(shared): kerekítés HALF_UP + negatív bevitel` | C-6, C-8 | `quantity.spec` |
| 7 | `fix(frontend): tétel-szerkesztő Mégse` | **B-1**, B-2, B-6 | `meal-edit.page.spec` (5 új), `meal-item-row.spec`, `meal-item-editor.component.spec` |
| 8 | `fix(frontend): CD / élettartam finomítás` | B-3, B-4, B-5 | `quantity-input.component.spec`, `meal-item-row.spec` |
| 9 | `fix(frontend): natív seed + Food-törlés cascade` | **F-2**, F-3, E-1, E-2 | `exercise-seed.spec` (új), `food-delete-cascade.spec` (új) |
| 10 | `fix(frontend): apró polish` | G-2, D-1, E-3 | `profile.page.spec` |
| 11 | `fix(scripts): install-android.ps1 -Deliver` | H-1, H-2, H-3, H-4 | PS AST parse-check (nincs script-teszt) |
| 12 | `docs: drift-recept, ReminderScheduler, §17` | A-1, A-2, A-3 | — |
| 13 | `docs(audit): tracker + C-4 tudatos korlát` | C-4 (dokumentált), tracker-zárás | — |

**Dokumentált korlátok (nem kódváltás):**
- **C-4** → `documentation/Subfeatures/Élelmiszer tárolás.md` §Megjegyzések → `#### Tudatos korlát`:
  a piece-`Food` készlet „kanonikus alap-egysége" nem egyértékű (csomag vs. g/ml); a teljes
  kiküszöbölés `Food`-onkénti dimenzió-normalizálást igényelne kliens+szerver oldalon, ami érdemi
  viselkedés-változás a készlet-FIFO-ban. A [[Backend-offline first]] LWW / relatív-vesztés melletti
  elfogadott pontatlanság.
- **E-3** → `documentation/Subfeatures/Élelmiszerek.md` §Megjegyzések → `#### Tudatos korlát`:
  az en `DELETE_REF_*` `item(s)` alakja marad — nincs messageformat-compiler, egy stringért nem éri
  meg bevezetni; az `(s)` a projekt no-ICU plural konvenciója.

**Verifikáció (mind zöld):** backend `./gradlew test` (teljes, Testcontainers) + `build`;
frontend `npm run lint` + `npm run test:ci` (1498 teszt) + `npm run build`.

### MAJOR (3)

| # | Chunk | `fájl` | Probléma | Javasolt fix | Teszt kell |
|---|---|---|---|---|---|
| **F-1** | F | `backend/.../common/IdempotencyKeyPruneJob.java` | `@Transactional` a `prune()`-on van, de a `@Scheduled scheduledPrune()` **self-invocation**-nal hívja → a production úton nincs tranzakció → a `@Modifying` bulk DELETE `TransactionRequiredException`-t dob **minden éjjel**, az `idempotency_key` tábla sosem takarodik. A teszt a `job.prune()`-t a **proxyn át** hívja, ezért zöld. | `@Transactional` a `scheduledPrune()`-ra (v. osztály-szintre / repo-metódusra). | igen — teszt, ami a `scheduledPrune()`-t hajtja |
| **F-2** | F | `frontend/.../core/storage/sqlite-storage-backend.ts` `seedExercises` (#057) | A `EXERCISE_SEED_VERSION` verzió-latch a dokumentált céljára **működésképtelen**: a `if (exercise_catalog count === 0)` guard átugorja a seed loopot minden „már seedelt" (= nem-üres katalógusú) telepítésen, és csak a latchet bumpolja → verzió-bump **sosem juttat új seed-sort** meglévő telepítésre. | `latch < VERSION` → seed loop `count`-tól függetlenül (v5 id idempotens), VAGY töröld a verzió-bump állítást a Javadoc/commit/spec szövegből. | igen — verzió-bump + nem-üres katalógus eset |
| **B-1** | B | `frontend/src/app/pages/food/meal/meal-item-editor.component.ts` + `meal-edit.page.ts` | A tétel-szerkesztő modal „Mégse" gombja **nem állít vissza** — helyben mutálja a megosztott sor-objektumot minden billentyűleütésre. Egy már érvényes sor szerkesztését „Mégse"-vel elhagyva minden módosítás megmarad; FOOD/CUSTOM sor hozzáadása + „Mégse" után a sor „hiányos" marad, és a `save()` az **egész étkezésre blokkol** (csak kitöltéssel vagy a sor törlésével oldható). | A szerkesztő draft/pillanatkép-másolaton dolgozzon; `done` commitál, `cancelled` visszaállít; sosem-érintett új sor `cancelled`-re essen ki. | igen — edit+cancel és add+cancel+save flow |

### MINOR (13)

| # | Chunk | `fájl` | Probléma | Javasolt fix |
|---|---|---|---|---|
| A-1 | A | `CLAUDE.md` ~147 + `documentation/**` frontmatter | `verifikalt_commit` bélyegek 1 commit-tal a spec-átírás elé mutatnak → a CLAUDE.md drift-recept minden specre azonnal false-positive-ot ad | Bélyeg = az átíró commit, vagy a check triggerje későbbi **kód**-commit legyen |
| B-2 | B | `meal-item-editor.component.ts` (`onServingsInput`, `parseOptionalNumber`) | Érvénytelen adagszorzó (üres/0/negatív/NaN) csendben eldobva → model/view desync; negatív CUSTOM makró/kcal elfogadva | Mezőt visszaállítani a modellre elutasításkor; negatívot is elutasítani |
| B-3 | B | `meal-item-row.ts` (`buildFoodRow`) | Eltávolított FOOD sor `toSignal(valueChanges, {injector})` feliratkozása a **page** injectoron a page destroy-ig él (hosszú szerkesztő-munkamenetben gyűlik) | Soronkénti `DestroyRef` / kézi teardown a sor eltávolításakor |
| C-1 | C | `outbox-migrator.ts` `ALL_ENTITY_TYPES` | A komment szerinti `satisfies` exhaustiveness-garancia **hamis** (csak elem-assignability-t ellenőriz). Ma a lista teljes (36/36), de egy jövőbeli új entitástípus csendben ERROR-ra menne payload-bumpkor | `ALL_ENTITY_TYPES`-t a `Record<OutboxEntityType,…>`-tipusú registry-ből származtatni, v. `Record<OutboxEntityType,true>` guard |
| C-2 | C | `food-quantity.ts` `netBase` / SI-ágak | Nincs `netAmount <= 0` / `NaN` / `Infinity` védelem → `netAmount: 0` Food → `packages = Infinity`. A backend csak a `pieceAmount > 0`-t őrzi | `netBase` → `null`, ha `netAmount <= 0` |
| C-3 | C | `food-quantity.ts` `formatFoodQuantity` | `formatFoodQuantity(2,'db',food)` darab-definíció nélkül → csupasz `"2db"`, de `(2,'cs',food)` → `"2cs (2000g)"` — azonos mennyiség (`1 db = 1 cs`), eltérő hint; enyhe regresszió a #063 előtti `formatIngredientQuantity`-hez | `db` + nincs `pieceDef` → essen át a `cs` formázó ágra |
| C-4 | C | `meal.repository.ts` `canonicalDemand` + `stock-consumption.ts` `planStockConsumption` | A piece-Food készlet „kanonikus alap-egysége" nem egyértékű (csomag vs g/ml); vegyes dimenziójú StoredFood-sorok/étkezés-hivatkozások → a FIFO grammot von ki csomagból. #063 előtti gyökér, de #063 szélesíti a felületet | Food-onként egy dimenzióra feloldó normalizáló lépés, v. dokumentált `#### Tudatos korlát` |
| E-1 | E | `sqlite-storage-backend.ts` `deleteFood` | Cascade-del kiürült, **offline-létrehozott** (függő POST-os) Meal helyi soft-delete-je nincs összeegyeztetve az outboxszal → a drain újra létrehozza a szerveren a most már törölt Food-ra hivatkozva; a szerver saját cascade-je nem kapta el. Pattern-szintű (más cascade-ek is osztják) | Cascade-elt entitásokhoz coalesce-elő DELETE enqueue, ha van függő create; v. dokumentált korlát |
| E-2 | E | `sqlite-storage-backend.ts` `deleteFood` (üres-meal számláló) | Az új `(élő darabszám) - removedCount <= 0` üres-meal logika off-by-one-hajlamos, **nincs rá teszt** | Unit-teszt a 2-tétel/1-hivatkozik és az összes-tétel-hivatkozik esetre |
| F-3 | F | `sqlite-storage-backend.ts` `seedExercises` (#057) | A seed `upsertExercise` loop és a záró `seed_state` latch-upsert **külön tranzakció** → crash a seed közben → a következő indításkor `count > 0` → loop kihagyva → latch kiírva → a **részleges seed véglegesen latch-elt** | Loop + latch egy `executeTransaction`-ben |
| F-4 | F | `backend/.../common/sync/TombstonePurgeJob.java` (`purgeExpiredTombstones` catch) | `catch (DataAccessException retryOnNextPass)` **túl tág**: csak az FK-violation jelenti azt, hogy „retry a gyerek után"; egy lock-timeout / kapcsolat-hiba is csendben elnyelődik, majd „nem drainelhető (foreign-key order)"-ként logolódik, a job pedig „sikert" ad vissza | Szűkítsd FK-violation-re (SQLState 23503 / `DataIntegrityViolationException`); a többit propagáld / ERROR-ral logold |
| G-1 | G | `backend/.../gear/PackingTemplateService.java` `list()` (#026) | N+1: `countByTemplateIdAndDeletedFalse` minden sablonra külön hívva a `.map()`-ben (a natív oldal helyesen egyetlen korrelált subquery). Személyes-app skálán elhanyagolható | `GROUP BY` / `@Query` join-count egy körben |
| H-1 | H | `scripts/install-android.ps1` (`git … remote get-url origin`) | A script-szintű `$ErrorActionPreference = "Stop"` alatt fut (a `a998990` fix csak a `gh` blokkot csomagolta); `origin` remote nélkül a PS 5.1 opak `NativeCommandError`-t dob a tiszta „nem sikerült a repo slug" throw helyett | Ezt is Continue + `$LASTEXITCODE` blokkba, v. `git … 2>$null` + exit-code check |

### NIT (19) — a chunk-szekciók tábláiban

`A-2` `A-3` · `B-4` `B-5` `B-6` · `C-5` `C-6` `C-7` `C-8` `C-9` · `D-1` · `E-3` · `F-5` `F-6` `F-7` · `G-2` · `H-2` `H-3` `H-4`

## Napló

- 2026-09-03 — Fájl + worktree létrehozva, chunk-felosztás rögzítve. Session `session_014Dwnntit8yXGvFn9Pnhg9r`.
- 2026-09-03 — **Chunk A DONE.** 3 finding (1 minor, 2 nit), nincs blocker/major. A doksi-restrukturálás a `c6d7a85` kódot írja le; a CLAUDE.md konkrét állításai és a ROLLUP tény-javításai ellenőrizve, stimmelnek. Egyetlen érdemi észrevétel a `verifikalt_commit` bélyegzési konvenció off-by-one hibája (A-1).
- 2026-09-03 — **Chunk B DONE.** 6 finding (1 major, 2 minor, 3 nit). A major (B-1): a `meal-item-editor` modal „Mégse" gombja nem állít vissza, és hozzáadás+Mégse után a `save()` az egész étkezésre blokkol. A `d67c348`/`4fe11e1` refaktor egyébként tiszta: `save()` guard viselkedés-ekvivalens, modal-életciklus bekötve, i18n kulcsok megvannak, OnPush megtartva. `84835e3`/`6987549`/`522e97d` triviálisan rendben.
- 2026-09-03 — **Chunk G DONE.** 1 minor + 1 nit. #026 backend `list()` N+1 (jelentéktelen skálán); #019 validátor nem robusztus `,`-tizedesre. #038 tiszta. **#020 valódi bug-javítást is hozott**: a `ThemeService` system-módú `isDark`-ja nem reagált élő OS-témaváltásra — a fix (`systemDark` signal) helyes. #044 tiszta docs-only dropped.
- 2026-09-03 — **Chunk F DONE.** **2 major**, 2 minor, 3 nit. F-1: az `IdempotencyKeyPruneJob` `@Scheduled` útja self-invocation miatt tranzakció nélkül fut → a `@Modifying` DELETE `TransactionRequiredException`-t dob, a tábla sosem takarodik (a teszt a proxyn át hív, elfedi). F-2: a #057 `EXERCISE_SEED_VERSION` verzió-latch a `count === 0` guard miatt nem tud új seed-sort meglévő telepítésre juttatni — a dokumentált cél nem valósul meg. A `TombstonePurgeJob` (#056) egyébként jól megírt.
- 2026-09-03 — **Chunk E DONE.** 2 minor + 1 nit. #013 / #012 / #064 / #011 / #009 mind **tiszta** (helyes fix, jó teszt-lefedettség, flag-kulcsok/i18n ellenőrizve). A 2 minor a #010 offline Food-törlés cascade-ben: (E-1) a cascade-elt üres Meal nincs összeegyeztetve az outboxszal offline-create esetén — pattern-szintű; (E-2) az új üres-meal számláló-ág tesztfedetlen.
- 2026-09-03 — **Chunk D DONE.** 1 nit. Az AYCM statisztika bővítés (THIS_YEAR / ALL_TIME / CUSTOM preset, havi diagram, önrész-kártya) **tiszta**: pure TS, nincs időzóna-hiba (mind `YYYY-MM-DD` lexikai), osztás-védelem mindenhol, `coPaymentHuf` nem nullable, i18n megvan, OnPush.
- 2026-09-03 — **Chunk C DONE (a legmagasabb kockázatú).** 9 finding: **0 blocker, 0 major**, 4 minor, 5 nit. A `db→cs` átnevezés + adatmigráció **jól van megcsinálva**: FE↔BE mennyiség-paritás (scale, scaledEqual, piece multipliers) tükrözve; a Flyway V30 + SQLite V28 + OutboxMigrator v2 hármas konzisztens és a delta-pull `updated_at`-bumpot explicit, korlátos no-op mergeként kezeli; a `recipe-summary` refaktor viselkedés-megőrző; a `splitCountFor` kliens↔szerver paritás minden reális bemenetre áll; a `FoodService.validatePiece` erős. A 4 minor: OutboxMigrator exhaustiveness-illúzió (C-1), `food-quantity.ts` nem védi magát `netAmount<=0`-tól (C-2) és hint-inkonzisztencia (C-3), plusz egy #063 előtti gyökér — a piece-Food készlet „kanonikus egysége" nem egyértékű (C-4).
- 2026-09-03 — **Chunk H DONE.** 1 minor + 3 nit. A `-Deliver` ág + a `a998990` PS 5.1 natív-stderr fix helyes; a nyitott apróságok: a `git remote get-url origin` a Stop alatt fut (H-1), a `gh release view` bármely hibája „not found"-ként kezelt (H-2), a download-URL publikus repót feltételez (H-3), az `ssh://` remote-alak nem kezelt (H-4). Nincs titok-szivárgás.
- 2026-09-03 — **GIGA-REVIEW BEFEJEZVE — mind a 8 chunk `DONE`.** Végösszeg: **35 finding — 0 blocker · 3 major · 13 minor · 19 nit.** A 3 major: **F-1** (`IdempotencyKeyPruneJob` `@Scheduled` útja tranzakció nélkül → a prune-job éjjelente `TransactionRequiredException`, a tábla korlátlanul nő; a teszt a proxyn át hív, elfedi), **F-2** (`#057` `EXERCISE_SEED_VERSION` verzió-latch a `count===0` guard miatt nem tud új seed-sort meglévő telepítésre juttatni), **B-1** (a tétel-szerkesztő modal „Mégse"-je nem állít vissza + add+cancel után a `save()` az egész étkezésre blokkol). A legmagasabb kockázatúnak jelölt Chunk C (#063 `db→cs` + adatmigráció) **0 blocker/major** — a hármas migráció és a FE↔BE paritás jól megcsinálva. A fix-implementáció a fenti „Konszolidált fix-lista" majoraiból/minoraiból indítható; javasolt jegyesítés ott.
- 2026-09-03 — **FIX-IMPLEMENTÁCIÓ BEFEJEZVE — mind a 35 finding rendezve** (ugyanez a session, `worktree-giga-review` ág). 33 finding javítva kóddal + teszttel 12 zöld szeletben (a squasholt review-commit felett `87aea7d`…`1864912`); 2 dokumentált korlát (C-4, E-3). Új tesztfájlok: `ShoppingListSplitCountTest`, `exercise-seed.spec.ts`, `food-delete-cascade.spec.ts` + kiemelt tiszta segédfüggvények a `SqliteStorageBackend`-hez (`seedRowsToInsert`, `emptiedMeals`) és az étkezés-sorhoz (`snapshotRow`/`restoreRow`). Verifikáció: backend `./gradlew test` (teljes) + `build`; frontend `npm run lint` + `test:ci` (1498) + `build` — mind zöld. Következő lépés: `git merge --ff-only worktree-giga-review` a főcheckoutban.
