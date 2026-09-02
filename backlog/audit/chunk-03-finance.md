# Audit — Chunk 03: Finance / Pénzügyek
Audit commit: `ff23984`
Specek: `documentation/Features/Pénzügyek.md`, `documentation/Subfeatures/Rendszeres kiadások.md`, `documentation/Subfeatures/Nettó fizetés kalkulátor.md`
Kód: `backend/src/main/java/hu/bumler/lm2/finance/` (Controller, Service, Entity, Mapper, Repository, SyncDataLoader), `backend/src/main/resources/db/migration/V25__recurring_expense.sql`, `backend/src/main/resources/openapi/paths/recurring-expenses{,-item}.yaml` + `components/schemas/RecurringExpense.yaml`, `frontend/src/app/pages/menu/finance/` (dashboard, net-pay, recurring-expense-list/-edit, recurring-expense-math.ts, finance-labels.ts), `frontend/src/app/shared/net-pay-calculator.ts`, `frontend/src/app/shared/local-date.ts`, `frontend/src/app/core/data/recurring-expense.repository.ts`, `frontend/src/app/core/storage/{sqlite,http}-storage-backend.ts` + `local-database.service.ts` (SCHEMA_V23), `frontend/src/app/app.routes.ts`, `frontend/src/app/pages/menu/menu.page.ts`
Tesztek: `backend/.../finance/RecurringExpenseServiceTest.java`, `RecurringExpenseIntegrationTest.java`, `frontend/.../finance/recurring-expense-math.spec.ts`, `frontend/src/app/shared/net-pay-calculator.spec.ts`, `local-date.spec.ts`

---

## documentation/Features/Pénzügyek.md

| # | Spec-állítás (rövid + szekció) | Verdikt | Bizonyíték (fájl:szimbólum / teszt) | Teendő |
|---|---|---|---|---|
| 1 | Hub: 3 szám (nettó, havi fix, maradék), drill-down 2 gyerekre (§Jelenlegi működés) | Implemented | `finance-dashboard.page.ts` netHuf/monthlyExpensesHuf/remainderHuf + `.page.html` 3 kártya | rewrite |
| 2 | Hub fogyasztó: nincs saját entitás / OpenAPI, nem ír kiadást, nem tárol nettót (§Szerep) | Implemented | nincs hub entity/controller; `finance-dashboard.page.ts` csak repository-t olvas | — |
| 3 | Nettó = net-pay `net`; hiányzó `birthDate` **nem** `~` (§Szerep) | Implemented | `net-pay-calculator.ts:computeNetPay` (null birthDate → computable); `net-pay-calculator.spec.ts` "applies full SZJA when birthDate is missing" | — |
| 4 | Havi kiadás = Σ `monthlyEquivalentHuf` a beszámított (`deleted=false ∧ active=true`) sorokra (§Szerep) | Implemented | `recurring-expense-math.ts:sumMonthlyEquivalentHuf`+`countsInMonthlyEquivalent`; `recurring-expense-math.spec.ts` | — |
| 5 | Maradék = nettó − havi kiadás (egész Ft, előjeles, nincs 0-clamp) (§Szerep) | Implemented | `finance-dashboard.page.ts:remainderHuf` (`net - monthlyExpenses`, `[class.negative]`) | — |
| 6 | Nettó kártya: szám ha `grossMonthlySalaryHuf` kitöltve (0 érvényes), `~` ha üres (§Hiányjelzés) | Implemented | `computeNetPay` (0 → computable); `net-pay-calculator.spec.ts` "treats a filled-in 0 gross as computable" | — |
| 7 | Havi kiadás: mindig szám, üres lista → 0 Ft, soha `~` (§Hiányjelzés) | Implemented | `sumMonthlyEquivalentHuf([]) → 0`; `finance-dashboard.page.html` nincs `~` ág a havi kártyán | — |
| 8 | Maradék: szám ha nettó számolható, `~` ha nettó `~` (§Hiányjelzés) | Implemented | `remainderHuf` → `null` ha `netHuf()===null`; html `@if (remainderHuf() !== null) … @else ~` | — |
| 9 | Nincs profil-kitöltöttségi gate; hub + gyerekek üres bruttóval is nyílnak (§Hiányjelzés) | Implemented | `app.routes.ts` csak `featureFlagGuard('menu.penzugyek')`, nincs profil-guard | — |
| 10 | AYCM: nincs AYCM mező / jelölő / UI a hubon vagy kiadás soron (§AYCM) | Implemented | `finance-*` fájlokban nincs AYCM hivatkozás; `RecurringExpense.yaml`-ben nincs AYCM mező | — |
| 11 | AYCM kötés az AYCM specen él (`AycmSettings.linkedRecurringExpenseId`), picker/deep-link (§AYCM) | Implemented (cross-ref) | `local-database.service.ts:1040` `linked_recurring_expense_id` az aycm táblán; `recurring-expense-edit.page.ts` `returnTo`/`createdExpenseId` round-trip | — |
| 12 | Egy flag `menu.penzugyek`: menüpont + mindkét gyerek; ki → rejtve + route-ok nem elérhetők (§Feature flag) | Implemented | `app.routes.ts:101` `featureFlagGuard('menu.penzugyek')` a `finance` fán; `menu.page.ts:41` `penzugyekEnabled` | — |
| 13 | Az AYCM flag független (§Feature flag) | Implemented | külön `menu.aycm` kulcs a `features.json`-ban | — |
| 14 | Dashboard egy képernyő, 3 kártya; tap: Nettó→net-pay, Havi→recurring-expenses, Maradék→recurring-expenses; nincs külön maradék-képernyő (§UI/UX) | Implemented | `finance-dashboard.page.html` `routerLink="net-pay"` / `"recurring-expenses"` ×2 | — |
| 15 | Nincs CRUD a hubon (§UI/UX) | Implemented | `finance-dashboard.page.html` csak olvasó kártyák | — |
| 16 | Bruttó nem szerkeszthető itt (§UI/UX) | Implemented | nincs bruttó input a finance oldalakon; `net-pay.page.html` CTA a Profile-ra | — |
| 17 | Route-ok `/tabs/menu/finance`, `/net-pay`, `/recurring-expenses` (§Architektúra/Frontend) | Implemented | `app.routes.ts:100–129` | — |
| 18 | Képletek nem másolódnak a hubba — import a gyerek utility-kből (§Architektúra/Frontend) | Implemented | `finance-dashboard.page.ts` importál `computeNetPay`, `sumMonthlyEquivalentHuf` | — |
| 19 | Backend-offline: olvasás gyerek/Profile helyi store-ból; nincs hub mutáció → nincs outbox; számítás mindig pure kliens TS (§Backend-offline) | Implemented | repository-k `STORAGE_BACKEND` fölött; `computed` signals; nincs hub outbox út | — |
| 20 | Nincs backend érintettség a hubnál (§Backend) | Implemented | nincs finance-hub backend kód | — |
| 21 | Nem scope (MVP): egyszeri tranzakció, banki szinkron, envelope/keret, más pénznem, bér melletti bevétel, lakásrezsi külön gyerek, befektetés, számla (§Nem scope) | Describes-future | nincs ilyen kód sehol | #11, #15 |
| 22 | Közelgő fizetés-értesítés kint az MVP-ből (§Nem scope) | Describes-future | nincs értesítés-típus a rendszeres kiadáshoz | #12 |
| 23 | Nincs harmadik gyerek (§Gyerekek) | Implemented | `app.routes.ts` csak `net-pay` + `recurring-expenses` gyerek | — |

---

## documentation/Subfeatures/Rendszeres kiadások.md

| # | Spec-állítás (rövid + szekció) | Verdikt | Bizonyíték (fájl:szimbólum / teszt) | Teendő |
|---|---|---|---|---|
| 1 | `id` UUID, kliens generálja (§Entitás) | Implemented | `RecurringExpenseEntity.id` `@Id UUID` nincs `@GeneratedValue`; `recurring-expense.repository.ts` `uuidV4()` | — |
| 2 | `name` kötelező, trim után nem üres, **nem** egyedi (§Entitás) | Implemented | `RecurringExpenseService.applyFields` trim+`ValidationException`; nincs unique index (`V25`); `RecurringExpenseServiceTest.create_trimsName_andRejectsBlankName` | — |
| 3 | `amountHuf` kötelező egész `≥ 1` (§Entitás) | Implemented | `V25` `CHECK (amount_huf >= 1)`; `RecurringExpense.yaml` `minimum: 1`; `recurring-expense-edit.page.ts` `Validators.min(1)` | — |
| 4 | `frequency` enum `MONTHLY\|QUARTERLY\|YEARLY` (§Entitás) | Implemented | `V25` `CHECK (frequency IN …)`; `RecurringExpense.yaml` enum | — |
| 5 | `category` enum `ENTERTAINMENT\|SPORT\|UTILITIES\|INSURANCE\|OTHER` (§Entitás) | Implemented | `V25` `CHECK (category IN …)`; `finance-labels.ts:EXPENSE_CATEGORIES` (5, fix sorrend) | — |
| 6 | `nextBillingDate` kötelező `YYYY-MM-DD`, kliens naptári nap, nincs auto-roll (§Entitás) | Implemented | `RecurringExpenseEntity.nextBillingDate` `LocalDate`; szerver-oldali roll nincs; `RecurringExpenseService` javadoc | — |
| 7 | `billingDayOfMonth` kötelező egész `1`–`31`, szándékolt nap (§Entitás) | Implemented | `V25` `CHECK (billing_day_of_month BETWEEN 1 AND 31)`; `RecurringExpense.yaml` `minimum:1 maximum:31` | — |
| 8 | `active` kötelező boolean default `true`; `false` = szünet: listán marad, dashboard/AYCM összegből kiesik (§Entitás) | Implemented | `RecurringExpenseEntity.active = true`; `V25` `DEFAULT true`; `countsInMonthlyEquivalent`; `classifyExpenseSection` → `PAUSED` | — |
| 9 | `notes` opcionális szabad szöveg (§Entitás) | Implemented | `RecurringExpenseEntity.notes` nullable; `V25` `notes text` | — |
| 10 | `deleted` soft delete, listák szűrik (§Entitás) | Implemented | `RecurringExpenseEntity.softDelete()`; `RecurringExpenseRepository.findByUserIdAndDeletedFalse…`; `sqlite-storage-backend.ts:841` `WHERE deleted = 0` | — |
| 11 | Nincs `lastPaidAt` / occurrence-tábla / AYCM flag (§Entitás) | Implemented | `RecurringExpenseEntity` / `V25` / `RecurringExpense.yaml` egyik sem tartalmaz | — |
| 12 | Beszámított sor: `deleted=false ∧ active=true` (§Beszámított sor) | Implemented | `recurring-expense-math.ts:countsInMonthlyEquivalent`; `recurring-expense-math.spec.ts` "counts only live + active rows" | — |
| 13 | Dashboard-összeg: Σ `monthlyEquivalentHuf` a beszámított sorokra; üres → 0 Ft (§Beszámított sor) | Implemented | `sumMonthlyEquivalentHuf`; spec "rounds each row before summing; empty set is 0" | — |
| 14 | Havi ekvivalens: `MONTHLY`=amount, `QUARTERLY`=round(/3), `YEARLY`=round(/12), `Math.round` 0.5 fel; soronként kerekít majd Σ (§Havi ekvivalens) | Implemented | `recurring-expense-math.ts:monthlyEquivalentHuf`; `recurring-expense-math.spec.ts` mind a 3 ág | — |
| 15 | `addPeriod`: hónapok 1/3/12, naptári hó túlcsordulás évben, `day = min(billingDayOfMonth, utolsó nap)` (§Dátumléptetés) | Implemented | `recurring-expense-math.ts:addPeriod`; spec "Jan-31 walk", "restores Feb-29 in next leap year", QUARTERLY/YEARLY | — |
| 16 | Nincs auto-roll (app-nyitás nem léptet); lejárt marad lejárt (§Dátumléptetés) | Implemented | nincs roll a `load()`-ban; `RecurringExpenseService` javadoc "server does NOT auto-roll" | — |
| 17 | Fizetve: csak élő+aktív soron; `nextBillingDate = addPeriod(tárolt)`; `billingDayOfMonth` változatlan; egy tap = egy periódus a tárolt dátumhoz; nincs undo (§Fizetve) | Implemented | `recurring-expense.repository.ts:markPaid` (guard `deleted/!active`, addPeriod a `expense.nextBillingDate`-ből); `recurring-expense-list.page.html` `@if (row.active)` | — |
| 18 | `billingDayOfMonth` szinkron: create → választott dátum napja; kézi `nextBillingDate` edit → új nap; Fizetve/frequency/összeg/név/kategória/notes/`active` → változatlan (§billingDayOfMonth szinkron) | Implemented | `recurring-expense-edit.page.ts:save` `dateChanged ? dayOfMonth(...) : original.billingDayOfMonth` | — |
| 19 | `billingDayOfMonth` lehet nagyobb a hónap hosszánál; csak a megjelenített dátum clampelve (§billingDayOfMonth szinkron) | Implemented | `addPeriod` a tárolt `billingDayOfMonth`-ot nem írja, csak `min()`-nel jeleníti | — |
| 20 | CRUD: lista, create, edit, delete, szünet/élesítés, Fizetve; duplikálás nincs (§CRUD) | Implemented | `recurring-expense-list.page.ts` + `-edit.page.ts`; nincs duplikálás gomb | — |
| 21 | Create defaultok: `frequency=MONTHLY`, `nextBillingDate=ma`, `billingDayOfMonth=`ma napja, `active=true`, `category=OTHER`, `name` auto-focus, `amountHuf` üres (§CRUD) | Implemented | `recurring-expense-edit.page.ts` form init + `save` `dateChanged` (create → original null → nap); `-edit.page.html` `[autofocus]="!isEdit"` | — |
| 22 | Törlés: megerősítés a `name`-mel → soft delete; kiesik listából/dashboardból/AYCM-ből; nincs undelete (§CRUD) | Implemented / Describes-future (undelete) | `recurring-expense-list.page.ts:confirmDelete` alert `{name}`; `RecurringExpenseService.delete` softDelete; nincs undelete út | #10 |
| 23 | Szünet: `active=false` (nincs kötelező confirm); Élesítés: `active=true`, `nextBillingDate` nem ugrik (§CRUD) | Implemented | `recurring-expense.repository.ts:setActive` (nincs date-touch); `-list.page.html` sliding option confirm nélkül | — |
| 24 | `frequency` / `amountHuf` változás nem lépteti a dátumot (§CRUD) | Implemented | `save`-ben csak `dateChanged` érinti `billingDayOfMonth`-ot; `markPaid` külön | — |
| 25 | Soft delete szerződés: sose syncelt draft → helyi hard remove + outbox purge; DELETE tombstone; már törölt DELETE → 200; lista `deleted=false` (inaktív benne); saját törölt GET → 200 + `deleted=true`; PUT törölten → 409 (§CRUD) | Implemented | `sqlite-storage-backend.ts:873` `hardRemoveLocalEntity` ág; `RecurringExpenseService.delete` idempotens + `update` `EntityDeletedException`; `RecurringExpenseIntegrationTest` `delete_isIdempotent_andOwnDeletedRowStillReturns200OnGet`, `update_returnsEntityDeleted_afterTheExpenseWasDeleted` | — |
| 26 | Fogyasztók: Pénzügyek dashboard + AYCM; Naptár **nem** producer; Értesítések nem az első kör (§Fogyasztók) | Implemented / Describes-future (értesítés) | `finance-dashboard.page.ts` import; nincs naptár-producer; nincs értesítés-típus | #12 |
| 27 | Lista szekciók: Lejárt / Ma / Később / Szüneteltetett, üres rejtve; szekción belül `nextBillingDate` asc majd `name`; PAUSED: `name` (§UI/UX Lista) | Implemented | `recurring-expense-list.page.ts:groups` (`.filter(rows.length>0)`), `sortWithinSection`; `classifyExpenseSection`; spec tesztek | — |
| 28 | Soron: Fizetve (csak aktív), név, `amountHuf`+ritmus i18n, havi ekvivalens, `nextBillingDate`; Lejárt: figyelmeztető szín + lemaradás (`ma − nextBillingDate` nap); kategória i18n (§UI/UX) | Implemented | `recurring-expense-list.page.html` (`[color]="'danger'"`, `lagDays(row)`); `recurring-expense-math.ts:dayLag`; spec "dayLag" | — |
| 29 | Fizetve a listán művelet-gomb / pipa-szerű, nem tartós checkbox (§UI/UX) | Implemented | `-list.page.html` `<ion-button fill="clear">` `checkmark-circle-outline` ikon | — |
| 30 | Szünet/törlés: `ion-item-sliding` törlés confirmmel; szünet = sliding 2. akció **vagy** szerkesztő `active` kapcsoló (ugyanaz a PUT) (§UI/UX) | Implemented | `-list.page.html` `ion-item-options` (pause + delete); `-edit.page.html` `ion-toggle formControlName="active"`; mindkettő `repository.persist` → PUT | — |
| 31 | Szűrő: kategória-chipek VAGY-unió, alap mind az 5 be; mind ki → üres lista, chipek maradnak, "nincs találat", nincs CTA; kereső `name`+`notes`; szűrő ÉS kereső; szűrt üres ≠ globális üres (globális üres: CTA) (§UI/UX) | Implemented | `-list.page.ts` `activeCategories = new Set(EXPENSE_CATEGORIES)`, `filteredRows` (`active.has` ÉS `matchesSearch(name)\|\|matchesSearch(notes)`), `isGlobalEmpty`/`isFilteredEmpty`; `-list.page.html` `@if (!isFilteredEmpty())` CTA | — |
| 32 | Create/edit mezők: név, összeg (Ft), ritmus, kategória, `nextBillingDate`, notes; edit: `active`; `name` auto-focus create-nél (§UI/UX) | Implemented | `recurring-expense-edit.page.html` (`@if (isEdit)` az `active` togglenél) | — |
| 33 | Tábla `recurring_expense` a felsorolt oszlopokkal; nincs unique a névre; CHECK `amount_huf ≥ 1`, `billing_day_of_month` 1–31, enumok (§Architektúra/Backend) | Implemented | `V25__recurring_expense.sql` | — |
| 34 | OpenAPI: `GET POST /api/recurring-expenses`, `GET PUT DELETE /api/recurring-expenses/{id}`; lista implicit `deleted=false`, inaktív benne (§Architektúra/Backend) | Implemented | `openapi/paths/recurring-expenses{,-item}.yaml`; `RecurringExpenseController`; `RecurringExpenseRepository.findByUserIdAndDeletedFalse…` (nem szűr `active`-ra) | — |
| 35 | User scope: idegen `id` → 404; saját törölt GET by id → 200 + `deleted`; DELETE idempotens (§Architektúra/Backend) | Implemented | `RecurringExpenseService.get`/`requireOwner` → `EntityNotFoundException`; `RecurringExpenseIntegrationTest` `get_returnsNotFound_whenExpenseBelongsToAnotherUser`, `delete_isIdempotent…` | — |
| 36 | Szerver **nem** auto-rollol, **nem** számol havi ekvivalenst; nincs AYCM FK e táblán (§Architektúra/Backend) | Implemented | `RecurringExpenseService` javadoc + nincs ilyen kód; `V25`-ben nincs AYCM oszlop/FK | — |
| 37 | Backend-offline: helyi store olvasás/írás; create/update/delete → outbox + kliens UUID; `addPeriod` + havi ekvivalens mindig pure kliens TS; pull `deleted=true` → kiesik; pending PUT ugyanarra az ID-ra eldobandó (§Backend-offline) | Implemented | `sqlite-storage-backend.ts:upsertRecurringExpense`/`deleteRecurringExpense` (`executeTransaction([localWriteTask, …outboxTasks])`, `method: isNew ? 'POST' : 'PUT'`); `OfflineQueueService` coalescing | — |
| 38 | Nem scope (MVP): egyszeri tranzakció, fizetési előzmény-tábla, `WEEKLY`/tetszőleges `interval`, envelope, más pénznem, naptár-producer, közelgő fizetés-értesítés, duplikálás, seed, undelete, `endDate`, banki szinkron (§Nem scope) | Describes-future | nincs ilyen kód | #9, #10, #11, #12, #15 |

---

## documentation/Subfeatures/Nettó fizetés kalkulátor.md

| # | Spec-állítás (rövid + szekció) | Verdikt | Bizonyíték (fájl:szimbólum / teszt) | Teendő |
|---|---|---|---|---|
| 1 | Egyszerűsített alkalmazotti nettó becslés a Profile `grossMonthlySalaryHuf` (+ opcionális `birthDate`) alapján (§Jelenlegi működés) | Implemented | `net-pay-calculator.ts:computeNetPay`, `NetPayInput` | rewrite |
| 2 | Nincs saját entitás; bemenet user-owned profil (§Ownership) | Implemented | `net-pay.page.ts` `ProfileRepository`-t olvas, nincs saját store | — |
| 3 | `grossMonthlySalaryHuf` kötelező a számoláshoz; üres → nettó/TB/SZJA `~`; kitöltött 0 érvényes (§Bemenet) | Implemented | `computeNetPay` `gross === null/undefined → { computable: false }`; `net-pay-calculator.spec.ts` "is not computable when gross is missing" / "filled-in 0 gross as computable" | — |
| 4 | `birthDate` opcionális; hiányzik → nincs 25 év kedvezmény (teljes SZJA), a nettó számolható ha bruttó ki van töltve (§Bemenet) | Implemented | `computeNetPay` `under25 = birthDate !== null && …`; spec "applies full SZJA when birthDate is missing" | — |
| 5 | Bruttó nem szerkeszthető itt (§Bemenet) | Implemented | `net-pay.page.html` `<ion-note>` read-only + CTA `/tabs/menu/profile` | — |
| 6 | Életkor: teljes évek, kliens TZ, `floor` period — ugyanaz mint a TDEE (§Bemenet) | Implemented | `local-date.ts:ageInYears` (javadoc: "Shared by the TDEE engine and the net-salary calculator"); `local-date.spec.ts` | — |
| 7 | Konstansok: `TB_RATE=0.185`, `SZJA_RATE=0.15`, `UNDER_25_AGE_LIMIT=25`, `UNDER_25_SZJA_EXEMPTION_CAP_HUF=715_765` (§Konstansok) | Implemented | `net-pay-calculator.ts:13–19` — pontos értékek | — |
| 8 | Képlet: `tb=round(gross×TB_RATE)`; ha `birthDate` hiányzik VAGY `age≥25` → `szja=round(SZJA_RATE×gross)`; különben `szja=round(SZJA_RATE×max(0, gross−cap))`; `net=gross−tb−szja`; tételenként `Math.round` 0.5 fel (§Képlet) | Implemented | `computeNetPay:49–62`; `net-pay-calculator.spec.ts` "rounds each item half-up independently" | — |
| 9 | `under25ExemptionApplied` = `birthDate` kitöltve **és** `age < 25` (akkor is true, ha a plafon felett van maradék SZJA) (§Képlet) | Implemented | `computeNetPay` `under25ExemptionApplied: under25`; spec "leaves residual SZJA for an under-25 above the cap, flag still true" | — |
| 10 | 25 év kedvezmény a 25. születésnapon véget ér (`age < 25`, nem NAV-hónaphatár) (§Konstansok/Képlet) | Implemented | `ageInYears(...) < UNDER_25_AGE_LIMIT`; spec "ends the allowance on the 25th birthday" | — |
| 11 | A hub **csak** a `net`-et (vagy `~`) olvassa; TB/SZJA/kedvezmény-jelzés nem a dashboardon (§Képlet) | Implemented | `finance-dashboard.page.ts:netHuf` csak `calc.net`; dashboard html nincs TB/SZJA | — |
| 12 | Fogyasztók: Pénzügyek dashboard nettó kártya, maradék = `net −` kiadás ha `net` számolható; ez a képernyő = teljes bontás, maradék nincs itt (§Fogyasztók) | Implemented | `finance-dashboard.page.ts:remainderHuf`; `net-pay.page.html`-ben nincs maradék sor | — |
| 13 | Képernyő `NetPayPage`, route `/tabs/menu/finance/net-pay` (§Architektúra/Frontend) | Implemented | `app.routes.ts:109–110` | — |
| 14 | Sorok: Bruttó (read-only / "nincs megadva"), TB, SZJA (25-alatti jelzéssel), Nettó — szám vagy `~` (§UI/UX) | Implemented | `net-pay.page.html` 4 `ion-item`; `FINANCE.NET_PAY.NOT_SET` a Bruttón, `@if (…under25ExemptionApplied)` badge | — |
| 15 | Disclaimer fix i18n szöveg ("Egyszerűsített munkavállalói becslés") (§UI/UX) | Implemented | `net-pay.page.html:62` `FINANCE.NET_PAY.DISCLAIMER` | — |
| 16 | CTA → Profile; nincs gate; üres bruttóval is nyitható (§UI/UX) | Implemented | `net-pay.page.html:65` `routerLink="/tabs/menu/profile"`; nincs guard | — |
| 17 | Nincs what-if mező, Mentés, Fizetve (§UI/UX) | Implemented | `net-pay.page.html`-ben nincs ilyen kontroll | #14 (what-if a Nem scope-ban is) |
| 18 | Konstansok egy shared modulban (mint a MET) (§Architektúra/Frontend) | Implemented | `frontend/src/app/shared/net-pay-calculator.ts` | — |
| 19 | Backend-offline: pure kliens, nincs outbox, nincs saját store; `~` csak hiányzó bruttónál (§Backend-offline) | Implemented | `computeNetPay` tiszta függvény; `net-pay.page.ts` csak `ProfileRepository`-t olvas | — |
| 20 | Nincs backend érintettség; bruttó a Profile OpenAPI-ján; nincs szerveroldali nettó (§Backend) | Implemented | nincs net-pay backend kód | — |
| 21 | Nem scope (MVP): NAV-pontos; családi / első házas / 30 alatti anya / egyéb kedvezmény; KATA/KIVA; szocho; cafeteria; 13. havi; what-if bruttó; maradék itt; OpenAPI/szerveroldali nettó (§Nem scope) | Describes-future | csak a 25-alatti SZJA-kedvezmény van implementálva | #13, #14 |
| 22 | A plafon (`715_765`) 2026-os keret; változáskor a konstans + spec frissül (§Megjegyzések) | Accepted-limitation | `net-pay-calculator.ts:8–9,18` javadoc "hand-maintained … update this file (and the spec) when the law changes" | rewrite → "Tudatos korlát" |

---

## Rollup

- **Állítások összesen: 83** — Implemented 71 / Partial 0 / Missing 0 / Describes-future 11 / Accepted-limitation 1
  - (Pénzügyek 23: Impl 20, DF 3 · Rendszeres kiadások 38: Impl 34, DF 4 · Nettó kalkulátor 22: Impl 17, DF 4, AL 1)
- **Blokkoló eltérések:** nincs. Minden `Kész` állítást kód + zöld teszt fed. Egy megjegyzésre méltó, nem-blokkoló részlet: a **web** `HttpStorageBackend.upsertRecurringExpense` mindig `POST`-ot hív (`createRecurringExpense`) update esetén is — a szerver idempotens upsert-je miatt viselkedésben azonos a spec "Fizetve/szünet/szerkesztés: PUT" előírásával; a **natív** út (`sqlite-storage-backend.ts`) helyesen `PUT`-öt tesz az outboxba. Tudatos, dokumentált minta (CLAUDE.md "POST with an existing id is idempotent upsert"). Nem igényel jegyet.
- **Draft jegyek:**
  - **#9** feat "Rendszeres kiadások: `WEEKLY` / tetszőleges billing `interval`" → `Rendszeres kiadások.md` — jelenleg csak `MONTHLY/QUARTERLY/YEARLY`; `frequency` enum + `addPeriod` fixen 1/3/12 hónap. Rögzített "Nem scope (MVP)".
  - **#10** feat "Rendszeres kiadások: undelete + `endDate` + duplikálás + seed" → `Rendszeres kiadások.md` — post-MVP CRUD-affordanciák; a soft delete jelenleg végleges, nincs `endDate` mező, nincs duplikálás gomb.
  - **#11** feat "Pénzügyek: egyszeri tranzakció + fizetési előzmény / occurrence-tábla" → `Pénzügyek.md` / `Rendszeres kiadások.md` — nincs `lastPaidAt`, nincs occurrence-tábla, nincs egyszeri (nem ismétlődő) tétel.
  - **#12** feat "Közelgő fizetés értesítés (Rendszeres kiadások → Értesítések típus)" → `Pénzügyek.md` / `Rendszeres kiadások.md` — az értesítés-típus csak hook a specben, nincs implementálva.
  - **#13** feat "Nettó kalkulátor: NAV-pontos számítás + további kedvezmények" (családi, első házas, 30 alatti anya, KATA/KIVA, szocho, cafeteria, 13. havi) → `Nettó fizetés kalkulátor.md` — jelenleg csak a 25-alatti SZJA-kedvezmény.
  - **#14** feat "Nettó kalkulátor: what-if bruttó mező" → `Nettó fizetés kalkulátor.md` — nincs képernyőn belüli what-if input; a becslés a Profile bruttóján fut.
  - **#15** feat "Pénzügyek: banki szinkron / envelope-keret / más pénznem / befektetés-számla / bér melletti bevétel" → `Pénzügyek.md` — a hub jelenleg a 3 számra + 2 gyerekre szűkített.
- **Spec-átírás vázlat:**
  - Mindhárom spec `## Business` már `### Jelenlegi működés` fejléccel indul, jelen idejű — megtartható, apró csiszolással (a homokóra-mintát a `[[Tápérték kalkulátor]]` helyett a tényleges `computeNetPay` / `~` viselkedésre pontosítva).
  - **Pénzügyek.md** `### Funkcionális leírás`: a "Nem scope (MVP)" bekezdést törölni, helyére 1 mondat + mutató a #11/#12/#15 jegyekre. A `#### Hiányjelzés` táblázat és a `#### Feature flag` szakasz jelen idejűként pontos, marad.
  - **Rendszeres kiadások.md** `### Funkcionális leírás`: a "Nem scope (MVP)" felsorolást cserélni jegy-hivatkozásokra (#9/#10/#11/#12/#15). `#### Fizetve`, `#### Dátumléptetés`, `#### billingDayOfMonth szinkron`, `#### CRUD` szakaszok szó szerint tükrözik a kódot — csak jelen időre húzni. `#### Backend-offline`: a `POST` (create) vs `PUT` (update) megkülönböztetés a natív úton él; a web idempotens `POST`-ot használ — ezt egy fél mondattal rögzíteni.
  - **Nettó fizetés kalkulátor.md** `### Funkcionális leírás`: a "Nem scope (MVP)" bekezdést jegy-hivatkozásokra cserélni (#13/#14). A `#### Konstansok` és `#### Képlet (SSOT)` blokk bit-pontos a kóddal — marad, jelen időben. `### Megjegyzések`: a "715_765 2026-os keret" mondatot **"Tudatos korlát"** címke alá emelni (kézi karbantartás, nincs NAV-API).
  - `#### Backend-offline` mindhárom specben helytálló (pure kliens számítás; kiadás-CRUD outbox + kliens UUID; hub-nak nincs outboxa) — jelen idejű megfogalmazásra húzni, `[[Backend-offline first]]` hivatkozás marad.
- **Verdikt: GREEN** — minden `Kész` állítást fed a kód és zöld teszt; a teendő kizárólag a jelen idejű átírás + a "Nem scope" keretezés jegyekre cserélése. Nincs kód-hiány, nincs RED.
