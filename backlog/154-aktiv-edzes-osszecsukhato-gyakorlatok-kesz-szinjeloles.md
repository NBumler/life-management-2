---
id: 154
type: change-request
status: ready
title: Active Workout — összecsukható gyakorlatok + kész / nincs kész színjelölés
specs:
  - "[[Edzésnapló]]"
flag:
created: 2026-10-17
closed:
---

# 154 — Active Workout — összecsukható gyakorlatok + kész / nincs kész színjelölés

## Motiváció / probléma

Edzés közben (főleg tervből indítva, sok gyakorlattal) az élő `active-workout` nézet egy hosszú,
végiggörgetendő lista: minden gyakorlat minden szettje mindig ki van nyitva, és ránézésre nem
látszik, melyik gyakorlattal végeztem már és melyik van még hátra. Cél: edzés közben gyorsan
tájékozódni, hogy hol tartok az edzéssel.

Két, egymástól függetlenül szállítható részfeladat:

- **A) Összecsukható gyakorlatok** — a gyakorlat-kártya fejlécére tappolva a szett-táblázat
  (és a gyakorlat alatti segédsorok) elrejthető / megjeleníthető.
- **B) Kész-állapot színjelölés** — a gyakorlat fejléce színnel jelzi, hogy kész-e:
  **zöld** = kész, **piros** = még nincs kész.

## Jelenlegi működés

[[Edzésnapló]] → `### UI/UX elvárások`: az Active Workout (`pages/workout/log/active-workout.page.*`)
gyakorlatonként egy fejlécet (név + ⋮ action sheet), „Legutóbb” sort, sablon-megjegyzést,
progresszió-javaslatot és a teljes szett-táblázatot mutatja, mindig kinyitva. A szett szintjén
van „kész” pipa (`WorkoutSetEntry.isCompleted`, a sor `completed` osztályt kap), de gyakorlat
szintű kész-állapot / összesítés nincs, és a gyakorlatok nem csukhatók össze.

## Elfogadási kritériumok

### A) Összecsukható gyakorlatok

- [ ] Az Active Workoutban a gyakorlat fejlécére (név területére) tappolva a gyakorlat törzse
      (szett-táblázat, „Legutóbb” sor, javaslat, „+ Új szett” stb.) összecsukódik / kinyílik;
      a fejlécen chevron jelzi az állapotot. A ⋮ gomb tapja továbbra is csak az action sheetet
      nyitja, nem csuk.
- [ ] Összecsukott állapotban a fejlécen látszik egy rövid összesítő (pl. „3 / 4 szett”).
- [ ] Alapértelmezés edzés indításakor: minden gyakorlat nyitva.
- [ ] Amikor egy gyakorlat **utolsó** nyitott szettjét kipipálom (a gyakorlat ezzel késszé válik),
      a gyakorlat **automatikusan összecsukódik**. Kézzel újra kinyitható; egy pipa visszavétele
      nem nyitja ki magától.
- [ ] Az összecsukott állapot a helyi piszkozattal együtt megmarad: app-újraindítás /
      „Folytatás” után ugyanazok a gyakorlatok vannak összecsukva.
- [ ] Az összecsukott állapot tisztán kliensoldali UI-állapot: nem kerül a `WorkoutSession`
      payloadba, nincs OpenAPI / Flyway / outbox-változás.
- [ ] ~360 px szélességen (Galaxy A55) a fejléc nem tördel két sorba a chevron / összesítő miatt.

### B) Kész / nincs kész színjelölés

- [ ] Egy gyakorlat **kész**, ha legalább egy szettje van és **minden** szettje kipipált
      (`isCompleted = true`); egyébként **nincs kész**.
- [ ] Kész gyakorlat fejléce zöld, nem kész gyakorlaté piros jelölést kap (pl. bal oldali
      színsáv / fejléc-háttér); **szett nélküli** gyakorlat **szürke** (semleges). A színek a téma
      (light / dark) tokenjeiből jönnek, mindkét témában olvashatóan.
- [ ] Az utolsó szett kipipálásakor / egy pipa visszavételekor a szín azonnal vált (signal-alapú
      computed, OnPush).
- [ ] A szín mellett nem csak színnel kódolt jel is van (pl. ✓ ikon a kész gyakorlaton), hogy
      színtévesztőknek is egyértelmű legyen.
- [ ] Unit teszt a kész-állapot számításra (üres szettlista → szürke, részben kész → piros,
      mind kész → zöld) és az automatikus összecsukásra.

## Terv / döntési napló

- A két részfeladat külön commitban szállítható; B nem függ A-tól, de A összesítője
  („3 / 4 szett”) ugyanabból a computed-ből jöhet.
- Csak az élő Active Workout nézetet érinti; az utólagos form és a sablon-szerkesztő nem
  (ott nincs `isCompleted` pipa) — ha kell, külön jegy.
- Döntések (2026-10-17, scoping):
  - Az utolsó szett kipipálása után a gyakorlat **automatikusan összecsukódik**.
  - Szett nélküli gyakorlat **szürke** (nem piros) — se nem kész, se nem hátralévő munka.
  - Az összecsukott állapot a **piszkozattal együtt megmarad** („Folytatás” után is). Display-only
    draft-mezőként tárolandó (mint a `planNotes` / `repsTarget`), a session payloadjába nem kerül.
- Backend-offline: tisztán kliensoldali megjelenítés, a helyi draftból számol — Backend-offline
  és Full-offline is ugyanígy működik ([[Backend-offline first]]).

## Lezáráskor (on-done)

- Frissített specek: [[Edzésnapló]] — `### UI/UX elvárások`: összecsukható gyakorlatok +
  kész-színjelölés az Active Workoutban
- `IMPLEMENTATION_STATUS.md` sor: <dátum> — <mit>
- Kód: `frontend/src/app/pages/workout/log/active-workout.page.*`
