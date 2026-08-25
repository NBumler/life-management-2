# Implementáció státusz

Ez a fájl a **kódban ténylegesen megvalósított** állapotot követi, elkülönítve a
`documentation/` vault "Státusz" mezőjétől — az utóbbi a **spec** készültségét jelzi
(jelenleg minden spec `Kész`), nem azt, hogy van-e hozzá kód. Ez a fájl a hiányzó
darab: mit implementáltunk *eddig*, mit nem, és melyik spec változott *a
megvalósítás után* (→ újra-ellenőrizendő).

Nem spec — nem kell `#### Backend-offline` szekció, nem a `documentation/` vault
része, ezért `IMPLEMENTATION_STATUS.md` néven a repo gyökerében él.

## Karbantartási szabály (fontos!)

Minden sorhoz tartozik egy **"Spec commit"** oszlop: annak a commitnak a rövid
hash-e, ami *utoljára érintette* az adott spec fájlt **akkor, amikor a sort
`Kész`-re állítottuk**. Ha egy `Kész` feature specje később módosul (pl. UX
finomítás, új mező, viselkedés-változás), a spec fájl commit hash-e elmozdul a
rögzítetthez képest.

**Frissítéskor / auditáláskor:**

```bash
git log -1 --format="%h %ad" --date=short -- "documentation/Features/<Feature>.md"
```

Ha a kapott hash **eltér** a táblázatban rögzítettől → a sor **nem tekinthető
Kész-nek többé**, tedd át "Ellenőrizendő" állapotba, nézd meg a spec diffjét
(`git log -p <régi hash>..HEAD -- <fájl>`), és csak akkor tedd vissza `Kész`-nek,
ha a kód még mindig lefedi az új specet (vagy frissítetted a kódot, és rögzítetted
az új hash-t).

Ha implementálsz egy új feature-t: vedd fel a sort, `Kész`-re állítva, a
**friss** spec commit hash-sel.

## Architektúra SSOT-k (nem feature, de a fenti mechanika ide is vonatkozik)

| Doksi | Spec commit | Infra állapot |
|---|---|---|
| [Backend-offline first](documentation/Architektúra/Backend-offline%20first.md) | `d1950b4` (2026-08-19) | Kész — outbox, sync engine, storage backend megvalósítva |
| [Backend](documentation/Architektúra/Backend.md) | `d1950b4` (2026-08-19) | Kész — OpenAPI spec-first pipeline, Flyway, hibaszerződés áll |
| [Frontend](documentation/Architektúra/Frontend.md) | `d1950b4` (2026-08-19) | Kész — layering, signals, tab registry, feature flags áll |

## Kész feature-k

| Feature / Subfeature | Spec commit | Backend | Frontend | Megjegyzés |
|---|---|---|---|---|
| [Bejelentkezés](documentation/Features/Bejelentkezés.md) | `7763ca0` (2026-08-19) | `auth/` (JWT, refresh token, admin API) | `pages/login/` | |
| [Profile](documentation/Features/Profile.md) | `d1950b4` (2026-08-19) | `profile/` (Profile + WeightHistory) | `pages/menu/profile/` | Súlytörténet is kész |
| [Szinkronizációs központ](documentation/Features/Szinkronizációs%20központ.md) | `b16939c` (2026-08-25) | — (kliens-oldali infra) | `core/sync/`, `pages/menu/sync/` | Legutóbb "Sync fix" commit — spec + kód együtt frissült |
| [Dark&Light mode](documentation/Features/Dark&Light%20mode.md) | `4562923` (2026-08-19) | — | `pages/menu/theme/`, `core/config/theme.service.ts` | |
| [Nyelv választás](documentation/Features/Nyelv%20választás.md) | `4562923` (2026-08-19) | — | `pages/menu/language/`, `core/config/language.service.ts` | |
| [GearCheck](documentation/Features/GearCheck.md) | `a5c281b` (2026-08-14) | `gear/` (GearItem, PackingTemplate(+Item), PackingSession(+Item)) | `pages/menu/gear/` (items/templates/sessions) | |
| ↳ [Eszközök](documentation/Subfeatures/Eszközök.md) | `56923be` (2026-08-19) | `GearItem*` | `gear/items/` | |
| ↳ [Sablonok](documentation/Subfeatures/Sablonok.md) | `dc3a5d9` (2026-08-20) | `PackingTemplate*` | `gear/templates/` | Post-create redirect+highlight UX |
| ↳ [Pakolás](documentation/Subfeatures/Pakolás.md) | `dc3a5d9` (2026-08-20) | `PackingSession*` | `gear/sessions/` | Cél nélküli session-elnevezés fallback |

## Részleges feature-k

| Feature / Subfeature | Spec commit | Backend | Frontend | Megjegyzés |
|---|---|---|---|---|
| [Tennivalók](documentation/Features/Tennivalók.md) | `d1950b4` (2026-08-19) | — | — | Hub (4 csempe) + routing-összekötés még nincs; csak 1/4 subfeature kész (lásd alatta) |
| ↳ [Élet tervek](documentation/Subfeatures/Élet%20tervek.md) | `2b44ec6` (2026-08-19) | `hu.bumler.lm2.tasks` (`LifePlan*`) | `pages/tasks/life-plans/`, `core/data/life-plan.repository.ts` | Route ideiglenesen közvetlenül a tabs alatt (`/tabs/tasks/life-plans`), a hub nélkül |
| ↳ Háztartási feladatok, Naptár, Események | — | — | — | Lásd "Nincs elkezdve" |

## Nincs elkezdve

Nincs backend package, nincs frontend page/repository ezekhez — teljes egészében
hátravan. Sorrend a specek mérete / függőségei alapján (lásd "Következő javasolt
feature" lent), nem prioritás.

| Feature | Subfeature-ök | Fő függőségek |
|---|---|---|
| [Tennivalók](documentation/Features/Tennivalók.md) (3/4 hátra) | [Háztartási feladatok](documentation/Subfeatures/Háztartási%20feladatok.md), [Naptár](documentation/Features/Naptár.md), [Események](documentation/Features/Események.md) — Élet tervek már kész, lásd fent | Háztartási: Naptár-producer + Értesítések (utóbbi kimarad ebben a körben). Naptár: aggregátor (Háztartási + Események). |
| [Kaja](documentation/Features/Kaja.md) | Élelmiszerek, Élelmiszer hozzáadása (+manuális/clipboard/vonalkód), Étkezés (+3 forrás), Recept, Élelmiszer tárolás, Kaja statisztika | Profile (TDEE-hez, kész), Tápérték kalkulátor (architektúra doksi) |
| [Edzés](documentation/Features/Edzés.md) | Edzésnapló, Gyakorlat, Heti terv, Biciklizés napló, Úszás napló, Mászónapló (+ 12 Indoor/Outdoor boulder/köteles al-spec) | Profile (kész) — a Mászónapló ág önmagában a legnagyobb subtree a projektben |
| [Bevásárlás](documentation/Features/Bevásárlás.md) | Bevásárlólista írás, Bevásárlás teljesítve, Bevásárlás előzmény | Élelmiszerek (Kaja alatt) |
| [Pénzügyek](documentation/Features/Pénzügyek.md) | Nettó fizetés kalkulátor, Rendszeres kiadások | Nincs |
| [AYCM tracker](documentation/Features/AYCM%20tracker.md) | AYCM Check-In, AYCM elfogadóhely hozzáadása, AYCM Statisztikák | Nincs |
| [Lépésszám követés](documentation/Features/Lépésszám%20követés.md) | Kézzel bevitel, Samsung Health szinkron | Samsung Health natív integráció |
| [Értesítések](documentation/Features/Értesítések.md) | — | Több más feature helyi notification-hookjait szolgálja ki (Háztartási feladatok, Élet tervek stb.) |

## Következő javasolt lépés: **Tennivalók → Háztartási feladatok**

Az Élet tervek (2026-08-25) elkészült a tervezett vertikális szelet szerint:
backend (`hu.bumler.lm2.tasks.LifePlan*` — entitás, OpenAPI, Flyway migráció,
sync data loader), frontend (`LifePlanRepository`, lista + szerkesztő oldal a
`/tabs/tasks/life-plans` route-on), teljes offline-sync bekötés (outbox entity
type, local-rows, sync-engine ágak), és tesztek mindkét oldalon — lásd a
"Részleges feature-k" táblázatot. A `tabs/tasks` gyökér ideiglenesen a
life-plans listára redirectel, amíg a hub (5. lépés) el nem készül.

**Tervezett sorrend innen** (a jóváhagyott terv szerint):

1. ~~Élet tervek~~ — kész.
2. **Háztartási feladatok** (`HouseholdRoom` + `HouseholdTask`, cascade delete,
   naptár-producer algoritmus). Az Értesítések (`HOUSEHOLD_TASK_DUE`) ebben a
   körben explicit kimarad — külön menetben jön.
3. Események (`CalendarEvent`, recurrence-vetítés).
4. Naptár (csak frontend, aggregátor: Háztartási feladatok + Események).
5. Hub (`tennivalok-hub.page.ts`, 4 csempe) + a `tabs/tasks` routing véglegesítése.

Google Calendar export és a teljes Értesítések feature (6 típus) továbbra sem
cél ebben a menetben — lásd a plan fájl "Nem cél ebben a körben" szakaszát.
