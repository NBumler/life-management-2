---
verifikalva: 2026-09-03
verifikalt_commit: 1917ba8
---

# Frontend

## Business

| | |
|---|---|
| **Státusz** | `Kész` |
| **Szülő** | [[Life Management 2.0]] |
| **Kapcsolódó** | [[Backend]], [[Fejlesztői környezet]], [[Backend-offline first]], [[Szinkronizációs központ]], [[Bejelentkezés]], [[Kaja]], [[Edzés]], [[Tennivalók]], [[Nyelv választás]], [[Dark&Light mode]], [[Mennyiség mező]], [[Szöveges keresés]], [[Névegyediség]] |

### Jelenlegi működés

_Nincs business érintettség._

### Funkcionális leírás

_Nincs business érintettség._

### UI/UX elvárások

_Nincs UI/UX érintettség._

### Megjegyzések

Architektúra jegyzet: a tartalom az `## Architektúra` alatt van. Ez a fájl az **app-shell SSOT-ja**: tab-térkép, route-térkép, feature flag registry, globális chrome, rétegzés és platform-képességek. A navigációs tabok product-döntések, de itt rögzítjük őket; a feature specek ide hivatkoznak, és nem definiálnak ettől eltérő belépőt vagy útvonalat.

### Nyitott kérdések

Nincs nyitott kérdés.

## Architektúra

### Frontend

#### Stack

- **Framework:** Ionic (Angular integráció) + Angular **standalone** komponensek, lazy-loaded route-okkal (hibrid: natív + web).
- **API kliens:** OpenAPI (Swagger) specifikációból generált TypeScript / Angular kód (modellek + service-ek) — ugyanaz a szerződés, mint a [[Backend]] Spring Boot interface-einél.
- **i18n:** ngx-translate — [[Nyelv választás]] (`hu.json`, `en.json`).
- **Téma:** [[Dark&Light mode]].
- **Natív runtime:** Capacitor.

##### Verziópolitika

A spec **nem pinel** konkrét verziót: a `package.json` az SSOT, a major frissítés nem spec-változás. A spec csak a megkötéseket rögzíti:

| Megkötés | Miért |
|---|---|
| Ionic **8+** Angular integráció | Standalone komponens támogatás |
| Angular **Signals** + standalone + OnPush | A state-modell erre épül (lásd lent) |
| Capacitor **8+** | A `@capacitor-community/sqlite` baseline-ja — [[Backend-offline first]] |

Tájékoztató pillanatkép (2026-08, nem szerződés): Angular 22, Ionic 8.8.x, Capacitor 8. Implementáció indulásakor az akkori stabil majorokat kell pinelni a `package.json`-ben.

#### Rétegzés

A négy felső szintű mappa (`pages/`, `shared/`, `core/`, `api/`) a repóban lévő `claude-hobby-starter-kit` `ionic-angular-conventions` konvencióját követi; a projekt-specifikus rétegek a `core/` alatt élnek.

| Réteg | Felelősség | Szabály |
|---|---|---|
| `src/app/api/` | Generált OpenAPI kliens (modellek + service-ek) | **Soha nem kézzel szerkesztett.** Csak a `SyncEngine` és a `HttpStorageBackend` hívja — page / komponens kód **nem** hívhatja közvetlenül. |
| `core/storage/` | `StorageBackend` absztrakció | Két implementáció: `SqliteStorageBackend` (natív: helyi store + outbox) és `HttpStorageBackend` (web: közvetlen hívás a generált kliensen). A választás az `offlineCapable` képesség alapján történik, egyszer, DI-ban. |
| `core/data/<entitás>.repository.ts` | `<Entity>Repository` | Tipizált homlokzat a `StorageBackend` felett; olvasás **signal**-ként; mutáció natívon egyetlen helyi tranzakcióban store + outbox — [[Backend-offline first]] §5. A gyakran renderelt, potenciálisan nagy megosztott katalógusoknál (`Food`, `Recipe`) a repo **in-memory cache-eli** az olvasást (natívon az `ngOnInit`-enkénti újraolvasás helyett); a pull utáni frissítést a `DataChangeNotifier` billenti — [[Backend-offline first]] §8. |
| `core/sync/` | `SyncEngine`, `OfflineQueueService`, `OutboxMigrator`, `DataChangeNotifier` | Drain / pull / állapotfelismerés; a generált kliens egyetlen üzleti fogyasztója. Felelősség-határ (SSOT: [[Backend-offline first]] §6): `SyncEngine` = orchestráció (drain-loop, pull-loop, kapcsolat-állapot), `OfflineQueueService` = az outbox tábla CRUD-ja (ezen keresztül éri el mind a `SyncEngine`, mind a [[Szinkronizációs központ]] UI), `OutboxMigrator` = payload-verzió migráció, `DataChangeNotifier` = dependency-mentes jelzőszolgáltatás, amit a `SyncEngine` egy legalább egy sort érintő pull végén billent, és amire a cache-elt repository-k újraolvasnak. |
| `core/session/` | `AuthSession`, auth guard, token interceptor | Token életciklus, secure storage — [[Bejelentkezés]]. |
| `core/config/` | `FeatureFlags`, `NetworkStatus`, `AppConfig`, `LanguageService`, `ThemeService` | Build / futásidejű asset + platform képességek + device-local preferenciák ([[Nyelv választás]], [[Dark&Light mode]]). |
| `pages/<oldal>/` | Képernyők; a gyerek komponensek a szülő mappájában | Lazy route; csak repositoryt és shared komponenst használ. Névkonvenció: `{név}.page.ts`, `{név}.component.ts`, `{név}.service.ts`, `{név}.guard.ts`, `{név}.repository.ts`. |
| `shared/` | Közös komponensek és pure TS utility-k | [[Mennyiség mező]] (`app-quantity-input` + közös `app-help-input`), [[Nehézségi szint skálája]] (`app-grade-input` + `shared/climbing/` parser), [[Szöveges keresés]], [[Névegyediség]], DateTime modul, `SyncStatusButton`. |

- A **repository homlokzat** miatt a feature kód nem tud a platformról: ugyanaz a hívás natívon local-first outboxot ír, weben HTTP-t hív. A web így nem külön kódág, hanem egy backend-implementáció.
- **Számítási utility-k** pure TypeScriptben, framework-függetlenül (MET-ek, BMR / TDEE, nettó bér, `nextDue`, naptár-vetítés, nehézségi index) — [[Backend-offline first]] §14, [[Tápérték kalkulátor]].

#### State management (döntés)

**Angular Signals + `providedIn: 'root'` service-ek. Nincs NgRx** (és nincs más globális store könyvtár).

- Indoklás: natívon a **helyi SQLite az igazság** ([[Backend-offline first]] §2), tehát egy globális in-memory store csak duplikálná és szinkronban tartandó másolatot csinálna. A [[Szinkronizációs központ]] listája is a helyi outbox tábla reaktív olvasása.
- Globális root service-ek: `SyncEngine`, `AuthSession`, `FeatureFlags`, `NetworkStatus` (a hálózati állapot már ma globális signal — [[Backend-offline first]] §6), `NotificationScheduler` ([[Értesítések]]).
- Feature-szintű állapot: a `<Entity>Repository` signaljai + komponens-lokális signal. Cross-feature megosztott származtatás `computed()`-tel (pl. `activityExtraKcal`).
- RxJS csak a határon (HTTP, Capacitor plugin események, debounce); a UI felé signal.
- Változás-észlelés: OnPush; a repository írás után a signal frissül, nincs kézi `detectChanges`.
- A `claude-hobby-starter-kit` `ionic-angular-conventions` skillje template-ekben `async` pipe-ot ír: ezt a Signals döntés **felváltja**. A skill többi szabálya érvényben marad (standalone komponensek, OnPush, strict TypeScript `any` nélkül, HTTP kizárólag a generált kliensen / vékony service-en át, nincs hardcode felhasználói szöveg).

#### Navigáció — tab registry

Alul **4 gomb** (Ionic tabs). A tab lista **konfigurációból** (feature-flagelt tab registry) épül, nem beégetett template-ből: az 5. gomb hozzáadása vagy a sorrend átrendezése konfigurációs változás, nem layout-újraírás.

| # | Tab | Route | Gyökér | Belépők |
|---|---|---|---|---|
| 1 | **Kaja** | `/tabs/food` | [[Étkezés]] dashboard | szegmens: Étkezés · Tárolás · Katalógus · Recept · Stat |
| 2 | **Edzés** | `/tabs/workout` | [[Edzésnapló]] | szegmens: Edzésnapló · Heti terv · Mászás · Úszás · Bicikli (+ [[Gyakorlat]] a fejlécben) |
| 3 | **Feladatok** | `/tabs/tasks` | [[Tennivalók]] hub | 4 csempe: Háztartási · Élet tervek · Naptár · Események |
| 4 | **Menü** | `/tabs/menu` | menülista | a többi feature + beállítások + Kijelentkezés |

**Szándékos kivételek** (nem hiba, ne „javítsa” senki): a [[Bevásárlás]] a **Menü** tabon van, nem a Kaján; a [[Lépésszám követés]] a **Menü** tabon, nem az Edzésen; a [[Tápérték kalkulátor]] **nem képernyő**, hanem utility.

##### Kaja és Edzés: szegmens, Feladatok: csempék

- A **Kaja** és az **Edzés** tab egy domain sok testvér-nézete → a tab gyökerén **felső szegmens** vált nézetet. Az elsőként megnyíló szegmens ingyen van (0 tap), a többi 1 tap — ez jobb, mint egy hub, ahol minden nézet 1 tap.
- A **Feladatok** hub-csempés marad: négy félig önálló feature, saját flaggel — [[Tennivalók]] (`Kész`, változatlan).
- A szegmens a tab **gyökér** oldalán él; mélyebb képernyő (részletek, szerkesztő, aktív edzés) **push**-sal nyílik, és a szegmens nem látszik rajta. Vissza a stackben a kiinduló szegmensre tér.
- Kikapcsolt flag → a szegmens eltűnik (a szegmenssáv rövidebb lesz). Ha egyetlen szegmens marad, a sáv rejtve van.
- A tab utolsó route-ját a **munkamenet** alatt az Ionic tab stack őrzi; cold start után az alapértelmezett szegmens nyílik (nincs device-local szegmens-emlékezet az első körben).

##### Route-térkép

A gyerek route-ok pontos alakja a feature specekben marad; itt a gyökerek kötelezőek.

| Route | Képernyő | Spec |
|---|---|---|
| `/login` | Login (tabokon **kívül**) | [[Bejelentkezés]] |
| `/tabs/food/meals` | Étkezés dashboard (Kaja default) | [[Étkezés]] |
| `/tabs/food/storage` | Készlet | [[Élelmiszer tárolás]] |
| `/tabs/food/foods` | Élelmiszer katalógus | [[Élelmiszerek]] |
| `/tabs/food/recipes` | Receptek | [[Recept]] |
| `/tabs/food/stats` | Kaja statisztika | [[Kaja statisztika]] |
| `/tabs/workout/log` | Edzésnapló (Edzés default) | [[Edzésnapló]] |
| `/tabs/workout/weekly-plan` | Heti terv | [[Heti terv]] |
| `/tabs/workout/climbing` | Mászónapló hub (4 csempe + admin) | [[Mászónapló]] |
| `/tabs/workout/swimming` | Úszás napló | [[Úszás napló]] |
| `/tabs/workout/cycling` | Biciklizés napló | [[Biciklizés napló]] |
| `/tabs/workout/exercises` | Gyakorlat törzsadat (fejléc belépő) | [[Gyakorlat]] |
| `/tabs/tasks/household` · `/life-plans` · `/calendar` · `/events` | Feladatok hub gyerekei | [[Háztartási feladatok]], [[Élet tervek]], [[Naptár]], [[Események]] |
| `/tabs/tasks/events/google` | Google export beállítás (Események fejléc belépő) | [[Google Calendar szinkronizálása]] |
| `/tabs/menu/shopping` | Bevásárlás | [[Bevásárlás]] |
| `/tabs/menu/profile` | Profile | [[Profile]] |
| `/tabs/menu/steps` | Lépésszám | [[Lépésszám követés]] |
| `/tabs/menu/notifications` | Értesítés kapcsolók | [[Értesítések]] |
| `/tabs/menu/finance` | Pénzügyek hub | [[Pénzügyek]] |
| `/tabs/menu/gear` | GearCheck hub | [[GearCheck]] |
| `/tabs/menu/aycm` | AYCM hub | [[AYCM tracker]] |
| `/tabs/menu/language` | Nyelv | [[Nyelv választás]] |
| `/tabs/menu/theme` | Téma | [[Dark&Light mode]] |
| `/tabs/menu/sync` | Szinkronizációs központ | [[Szinkronizációs központ]] |

- **Kijelentkezés** a Menü lista akciója (megerősítéssel), nem route — [[Bejelentkezés]].
- A [[Szinkronizációs központ]] korábbi `/tabs/dashboard/sync` útvonala **elavult**: nincs Dashboard tab, a képernyő a Menü alatt él.

##### Login utáni default tab

**Kaja → Étkezés dashboard** (`/tabs/food/meals`). Ha a `tab.kaja` flag ki van kapcsolva, a registry **első engedélyezett** tabja nyílik (a Menü mindig létezik, tehát mindig van hová lépni). Nincs „utolsó használt tab" emlékezet az első körben.

#### Globális chrome (státuszbár)

A [[Backend-offline first]] §16 globális állapotjelzője **app-shell chrome minden tabon**, nem egyetlen Dashboard sávja:

- `SyncStatusButton` shared komponens **minden tab-gyökér** `ion-toolbar` `end` slotjában. Állapotok és jelölés: [[Backend-offline first]] §16 (nincs jelzés / forgó / offline ikon / óra + darabszám / **piros** hibaszám).
- Tap → `/tabs/menu/sync`. Ugyanide visz a listákban a `_sync_error` sor tapja — [[Szinkronizációs központ]].
- Amíg van `ERROR` tétel, a jelzés **nem tüntethető el** és nem takarható ki.
- Weben (nincs outbox) a komponens csak kapcsolat-állapotot mutat, sor-darabszámot nem, és nem navigál a sync képernyőre.
- Nincs blokkoló modális offline figyelmeztetés, és nincs globális FAB.

#### Feature flag-ek

##### Mechanizmus (döntés)

- **Build-time ship config**, nem in-app user-toggle: `src/assets/config/features.json` build asset (Full-offline is elérhető — [[Backend-offline first]] §15), tipizált `FeatureFlags` root service olvassa **szinkronban**, az app init első lépéseként.
- A config a **teljes** kulcslistát tartalmazza; hiányzó vagy ismeretlen kulcs fejlesztői hiba: dev buildben hangos hiba, prod buildben a kulcs `false`.
- Kikapcsolt feature esetén nem csak a UI rejtett: a route **guard** blokkol (deep link → default tab), a feature seedje, ütemezője ([[Értesítések]]) és háttérfeladata sem indul. A `featureFlagGuard(flag)` a **route-fa tetején** ül (a `finance` / `aycm` minta): nem csak a tab-gyökereken, hanem a saját flaggel bíró menü-al-oldalakon (`/tabs/menu/shopping` → `menu.bevasarlas`, `/tabs/menu/gear` → `menu.gearcheck`) és a Feladatok hub gyerekfáin (`/tabs/tasks/{life-plans,events,calendar}` → `feladatok.{eletTervek,esemenyek,naptar}`) is; a `household` al-route-nak nincs saját flagje, azt a `tab.feladatok` fedi.
- A delta pull **nem** szűr flag szerint (`types` nélkül): a letiltott feature adata lehúzódhat a helyi store-ba, csak nincs hozzá UI. Így a flag visszakapcsolása nem igényel full re-pullt.
- Az [[Értesítések]] típus-kapcsolói **nem** feature flag-ek: device-local user beállítások, és a forrás-feature flagje fedi őket (forrás ki → a típus nem jelenik meg és nem ütemez).

##### Core — nem kapcsolható ki az első körben

| Terület | Miért |
|---|---|
| [[Bejelentkezés]] (login, auth guard, Kijelentkezés) | Nélküle nincs user és nincs sync-scope |
| [[Nyelv választás]] | Minden szöveg ezen megy át |
| [[Dark&Light mode]] | Az app alap-megjelenése |
| [[Profile]] | A testsúly / célok minden MET- és TDEE-számítás bemenete ([[Tápérték kalkulátor]]); kikapcsolva mindenhol `~` lenne |
| **Menü** tab | Az utolsó mentsvár: minden más tab kikapcsolható |
| [[Szinkronizációs központ]] | **Nincs saját flagje**; az `offlineCapable` platform-képesség dönt a láthatóságáról |
| Shared szerződések ([[Mennyiség mező]], [[Szöveges keresés]], [[Névegyediség]], [[Tápérték kalkulátor]]) | Nem képernyők, hanem közös komponens / utility |

Az `offlineCapable` **nem** feature flag, hanem platform-képesség (natív = `true`, web = `false`) — [[Backend-offline first]] §1.

##### Flag registry

| Kulcs | Mit fed | SSOT |
|---|---|---|
| `tab.kaja` | Kaja tab + Étkezés, Tárolás, Katalógus szegmens (a tab magja) | [[Kaja]] |
| `kaja.recept` | Recept szegmens + `RECIPE` étkezés-tételtípus | [[Recept]] |
| `kaja.statisztika` | Stat szegmens | [[Kaja statisztika]] |
| `tab.edzes` | Edzés tab + Edzésnapló + Gyakorlat törzsadat | [[Edzés]] |
| `edzes.hetiTerv` | Heti terv szegmens (az Edzésnapló önállóan is működik) | [[Heti terv]] |
| `edzes.maszonaplo` | Mászás szegmens + hub + admin + 4 kontextus | [[Mászónapló]] |
| `edzes.uszas` | Úszás szegmens | [[Úszás napló]] |
| `edzes.bicikli` | Bicikli szegmens | [[Biciklizés napló]] |
| `tab.feladatok` | Feladatok tab + Háztartási csempe | [[Tennivalók]] |
| `feladatok.eletTervek` | Élet tervek csempe | [[Élet tervek]] |
| `feladatok.naptar` | Naptár csempe | [[Naptár]] |
| `feladatok.esemenyek` | Események csempe + naptár `EVENT` chip | [[Események]] |
| `feladatok.googleExport` | Események fejléc → Google export + egyeztető kör (**első körben `false`**) | [[Google Calendar szinkronizálása]] |
| `menu.bevasarlas` | Menü → Bevásárlás | [[Bevásárlás]] |
| `menu.lepesszam` | Menü → Lépésszám (+ TDEE lépéság) | [[Lépésszám követés]] |
| `menu.ertesitesek` | Menü → Értesítések + ütemező | [[Értesítések]] |
| `menu.penzugyek` | Menü → Pénzügyek + mindkét gyerek | [[Pénzügyek]] |
| `menu.aycm` | Menü → AYCM + három gyerek | [[AYCM tracker]] |
| `menu.gearcheck` | Menü → GearCheck + három gyerek | [[GearCheck]] |

Ami nincs a táblában, annak nincs flagje: a [[Élelmiszerek]], [[Élelmiszer tárolás]], [[Étkezés]], [[Edzésnapló]], [[Gyakorlat]], [[Háztartási feladatok]] a szülő tab flagjén osztozik (a katalógus és a napló a tab értelme; külön kapcsolóval csak üres tab maradna).

##### Függőségek

A `features.json` build-időben bundle-ölt asset, a `FeatureFlags` root service szinkron olvassa; a kulcs- és függőség-validáció **load-time dev-hiba** (a `feature-flags.service.ts` komment ezt kimondja), nem szó szerinti fordítási hiba.

| Ha be van kapcsolva | Akkor kötelező | Miért |
|---|---|---|
| `kaja.*` | `tab.kaja` | Nincs hol megjeleníteni |
| `edzes.*` | `tab.edzes` | Ugyanaz |
| `feladatok.*` | `tab.feladatok` | [[Tennivalók]]: tab ki → egyik csempe sem látszik |
| `menu.bevasarlas` | `tab.kaja` | A teljesítés `StoredFood`-ot ír a készletbe — [[Bevásárlás teljesítve]], [[Élelmiszer tárolás]] |
| `feladatok.googleExport` | `feladatok.esemenyek` | Csak eseményeket exportál; forrás nélkül nincs mit feltölteni — [[Google Calendar szinkronizálása]] |

Szándékosan **független** párok: `menu.aycm` ↔ `menu.penzugyek` (Pénzügyek ki → az AYCM megtérülés `~`, nincs saját összeg — [[AYCM tracker]]); `edzes.hetiTerv` ↔ Edzésnapló (a napló ad-hoc módban is teljes).

##### Tab-flag kikapcsolva

A tab **eltűnik** a bar-ról, és a bar annyi gombos, ahány engedélyezett tab van (Ionic **1–5** gombot elbír; a Menü nem kapcsolható ki, tehát a gyakorlati minimum 1, ha mindhárom másik tab flag ki van kapcsolva) — nincs üres tab, és nincs „letiltott" szürke gomb. A Menü mindig ott van, tehát a bar sosem üres. A letiltott tab route-jai guardolva vannak: deep link → default tab.

#### Indulási sorrend (cold start)

Az induláson **nincs blokkoló hálózati hívás** — [[Backend-offline first]] §2/7.

1. `FeatureFlags` betöltés (build asset, szinkron) + `offlineCapable` meghatározás.
2. Device-local beállítások: nyelv ([[Nyelv választás]]) és téma ([[Dark&Light mode]]).
3. Session olvasás secure storage-ból ([[Bejelentkezés]]); nincs session → `/login`.
4. Natívon: user-DB nyitása (`lm2_<userId>.db`) + séma-upgrade, majd seed ellenőrzés ([[Gyakorlat]]).
5. Default tab renderelése **kizárólag** a helyi store-ból.
6. Csak ezután, nem blokkolóan: elérhetőség-próba → `SyncEngine` drain, majd pull ([[Backend-offline first]] §6/§8), Health Connect mai sync ([[Lépésszám átszinkronizálása a Samsung Health-ből]]), értesítés-újraütemezés ([[Értesítések]]).

#### Capacitor pluginok

| Plugin / bridge | Mire | Spec |
|---|---|---|
| `@capacitor-community/sqlite` | Helyi store + outbox, verziózott séma-upgrade | [[Backend-offline first]] §3 |
| `@capacitor/network` | Internet-jelzés a `NetworkStatus`-hoz | [[Backend-offline first]] §6 |
| `@capacitor/app` | Resume / pause életciklus → drain, pull, mai lépés-sync | [[Backend-offline first]] §6, [[Lépésszám követés]] |
| `@capacitor-mlkit/barcode-scanning` | Vonalkód kamera (eszközön belüli, Full-offline is megy) | [[Vonalkódos élelmiszer beolvasás]] |
| `@capacitor/local-notifications` | 09:00 / 20:00 / esemény `startTime` ütemezés | [[Értesítések]] |
| **Saját háttér-plugin** (`core/notifications/background-reminders.plugin.ts` + natív `AlarmManager` / `WorkManager` `ReminderWorker`) | 09:00 / 20:00 háttérfeladat (tegnapi lépésszám stash + `STEPS_LOW` esti értékelés) — a `@capacitor/background-runner` **nem** került be | [[Lépésszám átszinkronizálása a Samsung Health-ből]], [[Értesítések]] |
| **Saját Health Connect plugin** (`core/health/health-connect.plugin.ts` + `HealthConnectStepsPlugin.kt`, `androidx.health.connect:connect-client`) | Android lépésszám olvasás | [[Lépésszám átszinkronizálása a Samsung Health-ből]] |
| `@aparajita/capacitor-secure-storage` | Access + refresh token; app-frissítés után is megmarad | [[Bejelentkezés]] |
| `@capacitor/preferences` | Device-local beállítások: nyelv, téma, értesítés típus-kapcsolók | [[Bejelentkezés]] device-local tábla |

Platform-kényelmi pluginok (splash screen, status bar, keyboard) szükség szerint; nem spec-döntés.

#### Kötelező elvek

- Minden feature a fenti **flag registry** szerint kapcsolható; ami nincs benne, az core.
- Platformfüggő input kontrollok (web vs mobil kényelem).
- Egyértelmű fókuszmező: ha a user egyértelműen gépelni fog, az input legyen auto-focus.
- Közös mennyiség input: [[Mennyiség mező]]. Közös szöveges keresés: [[Szöveges keresés]]. Közös névegyediség / duplikáció-összehasonlítás: [[Névegyediség]] (figyelem: **más** normalizálás, mint a keresésé — az egyediségnél az ékezet **különbözik**).
- A feature kód a **repositoryból** olvas és ír; a generált klienst közvetlenül nem hívja.
- Nincs hardcode felhasználói szöveg: minden i18n kulcson megy át.
- Dátum / időzóna logika a közös, tesztelt DateTime modulon keresztül ([[Étkezés]] időzóna-szabályai).

#### Platform-képességmátrix

| Képesség | Natív | Web |
|---|---|---|
| Helyi SQLite store + outbox (`offlineCapable`) | ✔ | ✘ |
| Local-first írás, offline mentés | ✔ | ✘ (közvetlen HTTP; hibánál a form állapota megmarad) |
| [[Szinkronizációs központ]] képernyő + sor-szintű sync jelölés | ✔ | ✘ |
| Vonalkód kamera | ✔ | ✘ |
| Health Connect lépés-sync + 08:00 háttérfeladat | ✔ (Android) | ✘ |
| Lokális értesítések | ✔ | ✘ |
| Google Calendar export (OAuth + egyeztető kör) | ✔ | ✘ — [[Google Calendar szinkronizálása]] |
| Online CRUD, keresés, i18n, téma, minden pure TS számítás | ✔ | ✔ |
| Token tárolás | Platform secure storage | Secure web storage / httpOnly cookie — [[Bejelentkezés]] |

##### Web hatókör (döntés)

Az **első kiadás kiadott targetje a natív build**; a web nem QA-zott, nem publikált platform. Ugyanakkor a web **nem hal el**: a `StorageBackend` két implementációja miatt a web build fordul és fejlesztés közben használható (gyors iteráció emulátor nélkül), a feature kód pedig platformfüggetlen marad. Ez a döntés arról szól, mit ígérünk és mit tesztelünk — nem arról, hogy a webet kivágjuk a kódból. A web offline támogatása továbbra sem scope ([[Backend-offline first]] §17).

#### OpenAPI / kódgenerálás

- A backend felé menő HTTP hívások és DTO-k **nem** kézzel íródnak: az OpenAPI spec-ből generálódnak. Változás → OpenAPI frissítés → újragenerálás.
- **Spec:** `backend/src/main/resources/openapi.yaml` (kézzel írt SSOT — [[Backend]]). **Kimeneti mappa:** `frontend/src/app/api/` — verziókövetve (hogy `npm ci && ng build` JVM nélkül is fusson), de **soha nem kézzel szerkesztve**.
- **Generálás:** `npm run gen:api` (openapi-generator `typescript-angular` profil). A CI újragenerál és eltérésnél hibázik, tehát elavult kliens nem maradhat a repóban — [[Backend]].
- A generált kódot csak a `SyncEngine` (drain visszajátszás + `GET /api/sync/changes` pull) és a `HttpStorageBackend` használja.
- **API base URL:** weben relatív `/api` (dev proxy / reverse proxy), natívon a futásidejű `assets/config/app-config.json` `apiBaseUrl` mezője — a telepítő szkript ezt írja át ([[Fejlesztői környezet]]).

#### Backend-offline

SSOT: [[Backend-offline first]]. Az itteni pontok csak a frontend architektúrába illesztést rögzítik.

- **Platform-hatókör:** az offline működés (SQLite + outbox + pull) **natív** platformon van; a **web build online-only**. Képesség-flag: `offlineCapable` — a feature kód erre ágazik, nem platform-stringre; gyakorlatilag a `StorageBackend` implementáció választása.
- **Lokális tárolás:** SQLite a `@capacitor-community/sqlite` pluginnal, userenként külön DB fájl; a UI **kizárólag** a helyi store-ból olvas. Séma-migráció a plugin beépített, verziózott upgrade-mechanizmusával; nincs ORM az első körben (a típusok a repository rétegben élnek).
- **Rétegzés (döntés):** a mutációk **repository rétegen** mennek (`<Entity>Repository`), ami natívon egy helyi tranzakcióban ír a store-ba és az outboxba — **nem** HTTP interceptoron, mert local-first írás esetén a user-akció pillanatában nincs HTTP hívás. A generált OpenAPI klienst a `SyncEngine` használja.
- **Állapot mint signal:** a kapcsolat-állapot (`ONLINE` / `BACKEND_OFFLINE` / `FULL_OFFLINE` / `UNKNOWN`), a várakozó és a hibás tételek száma globális signal; ebből renderel a `SyncStatusButton` minden tabon és a [[Szinkronizációs központ]].
- **Feature flag és offline:** a flag config **build asset**, tehát Full-offline állapotban is elérhető; a flagek kiértékeléséhez soha nincs hálózat.
- **Külső API-k** (pl. Open Food Facts, Health Connect) **közvetlenül a kliensről** hívódnak, nem a [[Backend]] proxyján át.
- Kritikus számítási konstansok (pl. MET értékek) pure TypeScript utility-ként a frontenden is; így offline is teljes értékű a számítás (lásd [[Tápérték kalkulátor]]).
- **`~` / homokóra** kizárólag „nem számolható, mert hiányzik bemenet" jelentésben; a hálózati állapotot a globális indikátor és a [[Szinkronizációs központ]] jelzi.

### Backend

_Nincs backend érintettség._ (szerveroldali szerződés: [[Backend]]; sync végpontok: [[Backend-offline first]])

### Nyitott kérdések

Nincs nyitott kérdés. (A Health Connect bridge saját Capacitor plugin lett; a secure storage az `@aparajita/capacitor-secure-storage` — lásd a Capacitor plugin táblát.)

Lezárva: state management (Signals + root service-ek), tab → feature hozzárendelés, feature flag mechanizmus és registry, sync képernyő útvonala (`/tabs/menu/sync`), Capacitor plugin lista, generált kliens illesztése (repository réteg, nem interceptor), generált kód kimeneti mappája.
