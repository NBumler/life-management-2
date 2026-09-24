---
id: 122
type: feature
status: done
title: Mászás — élő session (Start / Befejezés), tartós értesítés, gyors-rögzítő felület és összegző képernyő
specs:
  - "[[Mászónapló]]"
  - "[[Indoor boulder napló]]"
  - "[[Indoor köteles napló]]"
  - "[[Outdoor boulder napló]]"
  - "[[Outdoor köteles napló]]"
  - "[[Értesítések]]"
flag:
created: 2026-09-24
closed: 2026-09-24
---

# 122 — Mászás — élő session (Start / Befejezés), tartós értesítés, gyors-rögzítő felület és összegző képernyő

## Motiváció / probléma

Mászásnál számít a session teljes ideje is (kalória, statisztika), és session közben nehézkes a
teljes szerkesztő formon kísérleteket felvinni. Kell egy „Start session" → élő felület →
„Session vége" → összegző/jóváhagyó képernyő folyamat:

1. **Start session** gomb. Indításkor telefonon (natív) tartós értesítés jelenik meg az értesítési
   sávban, hogy session van folyamatban (böngészőben nincs értesítés).
2. **Élő session felület** az appban. Ez app-újraindulás / app-kill után is visszanavigálható
   (az értesítésre koppintva és az appon belülről is).
3. **Beltéri boulder** élő sessionnél a termet kell megadni, és a teremhez tartozó színsávok
   soronként jelennek meg **három gombbal: `−`, semleges, `+`**. Egy koppintás = egy megmászott
   út rögzítve az adott színnel/variációval. Így session közben csak nyomkodni kell.
4. A rögzített kísérletek kézzel is javíthatók / törölhetők (félrenyomás).
5. **Session vége** gomb → **összegző képernyő**, ahol minden adat szerkeszthető (pl. egy kísérlet
   mégsem sikerült, vagy a befejezési időpont javítása, mert később jutott eszembe leállítani).
   Jóváhagyás után mentődik a session.

## Jelenlegi működés

- A session-szerkesztők utólagos rögzítésre épülnek: `date` + `totalSessionDurationMinutes`
  (percben, kézzel); nincs kezdő / záró időpont ([[Mászónapló]], `ClimbingSession.yaml`).
- [[Mászónapló]]: az „aktív session" kliens-lokális draft, csak memóriában él — app-kill után
  elveszik; a perzisztálás a `backlog/021-climbing-folyamatban-levo-session-draft-perzisztalasa-app-kill-t.md`
  jegyben van tervezve.
- Indoor boulder kísérletnél a színsáv egy `ion-select` a kártyán; a `GymColorBand.variant`
  (`PLUS | MINUS | NEUTRAL`) a **sáv** tulajdonsága az admin oldalon, nem a kísérleté — a kísérlet
  nem tudja rögzíteni, hogy a sávon belül könnyebb (−) vagy nehezebb (+) volt.
- `@capacitor/local-notifications` be van kötve ([[Értesítések]]), de tartós („ongoing")
  értesítést még nem használ az app.

## Elfogadási kritériumok

**Indítás és állapot**
- [x] „Start session" gomb a mászó hubon / kontextus-listákon (mind a 4 kontextus); a mai
      utólagos rögzítés megmarad.
- [x] Egyszerre legfeljebb 1 folyamatban lévő mászó session; ha van, a hub feltűnő „Folyamatban:
      <kontextus>, <eltelt idő>" sávot mutat, ami az élő felületre visz.
- [x] A folyamatban lévő session állapota (kontextus, kezdés időpontja, terem/szikla, rögzített
      kísérletek) minden változáskor **perzisztálva** van a helyi tárban → app-kill / újraindítás
      után helyreáll. (Ez lefedi és kiváltja a #21-et; ennek lezárásakor #21 is lezárható.)
- [x] Web buildben is működik (böngésző-oldali perzisztálással), csak értesítés nélkül — elágazás
      képesség szerint, nem platform-stringre.

**Értesítés (natív)**
- [x] Indításkor tartós, el nem húzható értesítés (Android `ongoing`), benne a kontextus és a
      kezdés ideje; koppintásra az élő felület nyílik (deep link).
- [x] Befejezéskor / elvetéskor az értesítés eltűnik. Értesítési engedély hiányában az élő session
      ettől még működik.

**Élő felület**
- [x] Beltéri boulder: terem választása kötelező a gyors-rögzítés előtt; a terem élő színsávjai
      nehézség szerint rendezve, soronként `−` / sáv / `+` gomb (a sáv színével). Koppintás →
      új sikeres kísérlet rögzítve az adott sávval és módosítóval; rövid visszajelzés (haptika +
      darabszám a soron).
- [x] Új kísérlet-mező: `bandModifier` (`MINUS | NEUTRAL | PLUS`, nullable); az
      `absoluteDifficultyIndex` ebből számolódik: `MINUS →` a sáv `absoluteDifficultyIndexLower`-je,
      `NEUTRAL →` a mai `colorBandMidIndex`, `PLUS →` a sáv `absoluteDifficultyIndexUpper`-je.
- [x] A többi kontextusban (indoor rope, outdoor boulder/rope) az élő felület a meglévő
      kísérlet-felvevő UI-t használja, gyorsan elérhető „Új kísérlet" gombbal.
- [x] A rögzített kísérletek listája az élő felületen látható; bármelyik szerkeszthető / törölhető.
- [x] Eltelt idő kijelzése.

**Befejezés és összegző**
- [x] „Session vége" → összegző képernyő: kezdő és záró időpont szerkeszthető (a záró alapértéke a
      gomb megnyomásának ideje), a session minden mezője és minden kísérlet szerkeszthető.
- [x] Jóváhagyás → a session a meglévő nested mentéssel (helyi tár + outbox) íródik; a
      `totalSessionDurationMinutes` a (záró − kezdő) különbségből számolódik.
- [x] Elvetés opció megerősítéssel (a draft törlődik, semmi nem mentődik).
- [x] Javaslat: új nullable mezők a `ClimbingSession`-ön: `startedAt`, `endedAt` (`timestamptz`),
      hogy az időpontok utólag is láthatók / szerkeszthetők legyenek; Flyway + `SCHEMA_Vn` +
      OpenAPI + outbox-verzió bump + migrációs lépés.

**Általános**
- [x] Teljesen offline is működik ([[Backend-offline first]]): a folyamatban lévő draft soha nem
      kerül outboxba, csak a jóváhagyott session.
- [x] Zöld lint + test:ci + build + backend test + verify:outbox.

## Terv / döntési napló

- Érdemes szeletekre bontani: (a) perzisztált draft + Start / Befejezés + összegző (kiváltja #21),
  (b) tartós értesítés + deep link, (c) beltéri boulder gyors-rögzítő rács + `bandModifier`.
- **Döntés (2026-09-24):** a `−` / `+` a sáv alsó / felső index-határát rögzíti (semleges = a
  mai közép). Az admin oldali sáv-`variant` ettől független, változatlan marad.
- **Döntés (2026-09-24):** a gyors-rögzítő koppintás mindig **sikeres** mászást rögzít;
  sikertelenre az élő listán / az összegzőn kézzel átbillenthető. A stílus (flash / redpoint)
  üresen marad.
- Nyitott: tartós értesítéshez elég-e a `@capacitor/local-notifications` `ongoing` opciója, vagy
  foreground service kell (Android 14+ korlátozások) — spike a (b) szelet elején.
- **Döntés (implementáció, 2026-09-24):** `ongoing: true` + `autoCancel: false` local notification, foreground
  service nélkül — az élő session állapota nem a futó folyamatban, hanem a perzisztált draftban él, így a
  folyamat leállítása sem veszít adatot; Android 14+ bizonyos esetekben engedi az ongoing értesítés
  elhúzását, ez elfogadott (a hub-sáv és a lista ugyanúgy visszavezet).
- **Döntés:** az élő felület nem négy új oldal, hanem a meglévő 4 szerkesztő `<ctx>/live` útvonalon
  (közös `ClimbingLiveController`), az összegző ugyanennek az oldalnak a módja — így „minden szerkeszthető"
  magától teljesül. Autosave: 1 mp + oldal-elrejtéskor + gyors-koppintás után azonnal.
- Telefonos ellenőrzés (értesítés, deep link) a következő telepítéskor; weben végigjátszva.

## Lezáráskor (on-done)

- Frissített specek: [[Mászónapló]], [[Indoor boulder napló]], [[Indoor köteles napló]], [[Outdoor boulder napló]], [[Outdoor köteles napló]], [[Értesítések]]
- `IMPLEMENTATION_STATUS.md` sor: 2026-09-24 — #122 (+ #21 lezárva, kiváltva)
- Kód: `V48__climbing_live_session.sql`, `climbing/ClimbingSession*` + `AscentAttempt*` (backend), `SCHEMA_V45`, `core/data/climbing-live-session.service.ts`, `pages/workout/climbing/naplo/climbing-live-{controller,bar}.*`, `climbing-live-banner.component.ts`, a 4 `*-session-edit.page.*`, `shared/climbing/climbing-grade-matrix.ts` (`bandModifierIndex`)
