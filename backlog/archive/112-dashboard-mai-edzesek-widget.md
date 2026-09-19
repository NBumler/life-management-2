---
id: 112
type: feature
status: done
title: Dashboard — mai edzések widget (lépés, mászás, edzésnapló, úszás, bicikli) + extra kalória
specs:
  - "[[Kezdőlap]]"
flag:
created: 2026-09-19
closed: 2026-09-20
---

# 112 — Dashboard — mai edzések widget (lépés, mászás, edzésnapló, úszás, bicikli) + extra kalória

## Motiváció / probléma

A [[Kezdőlap]] jelenlegi `HOME_WIDGETS` verme csak a gyorsgombokat és a „Mai étkezés állása"
widgetet tartalmazza (bevitt/cél kalória + makrók). A mai nap alatt rögzített **edzések**
(lépésszám, mászás, edzésnapló/workout session, úszás, bicikli) sehol nem látszanak a
Kezdőlapon — a usernek be kell mennie az egyes feature-ökbe, hogy lássa, mit csinált ma.

## Jelenlegi működés

`core/data/today-nutrition.service.ts` már betölti mind az 5 aktivitás-repository-t
(`WorkoutSession`, `SwimLog`, `BikeRideLog`, `ClimbingSession`, `DailyStepLog`) és ezekből
számol egy összesített aznapi extra-kalória számot, amit a TDEE-be told be a „Mai étkezés
állása" widget hátterében — de ez a bontás sosem jelenik meg önálló UI-ként, csak a nutrition
számításba olvad bele ([[Kezdőlap]] „Megjegyzések / Tudatos korlát").

## Elfogadási kritériumok

- [x] Új `HOME_WIDGETS` bejegyzés (pl. `today-workouts`), a megfelelő tab-flag(ek) mögé rejtve
      (edzésnaplónál `edzes.*`, lépésszámnál a lépés-flag, stb. — üres/letiltott feature-höz
      tartozó sor nem jelenik meg, ugyanúgy, mint a „Mai étkezés állása" widgetnél).
- [x] A widget soronként listázza a mai (helyi naptári nap) aktivitásokat: lépésszám, mászás
      (session-önkényes bontás, nem kísérlet-szintű), edzésnapló (workout session), úszás,
      bicikli — legalább típus + rövid összegző adat (pl. időtartam/táv/lépésszám) soronként.
- [x] Minden sor mellett/alatt megjelenik az adott aktivitáshoz tartozó extra kalória.
- [x] A widget alján/tetején egy összesített „mai extra kalória" szám is látszik (az 5 aktivitás
      együtt) — ugyanabból a `computeTdee`/`activity-kcal` számításból, mint amit a „Mai étkezés
      állása" widget már használ, hogy a két szám sose térjen el.
- [x] Ha egy adott napra nincs semmilyen edzés, a widget vagy nem renderel (a quick-actions
      widget mintája), vagy egy „ma még nem volt edzés" üres állapotot mutat — döntsd el
      scoping közben, melyik illik jobban a többi widgethez.
- [x] Zöld lint + test:ci + build.

## Terv / döntési napló

Önálló widget lett (`today-workouts`), nem a nutrition widget bővítése — jobban illeszkedik a
config-vezérelt widget-verem mintájához és nem duplikálja a nutrition widget felelősségét.

Sor-szintű flag-elés (`HOME_TODAY_WORKOUT_ROWS`, a `HOME_QUICK_ACTIONS` mintájára), nem egyetlen
widget-szintű flag — a widget-regisztry bejegyzés maga `flag: null` (mindig „be"), a tényleges
láthatóságot az 5 sor saját flagje dönti el. Ez azért fontos, mert a lépésszám (`menu.lepesszam`)
független a `tab.edzes`-től: ha valaki csak a lépésszámot használja edzésnapló nélkül, a sora
akkor is megjelenne, ha a widget teljes egészében `tab.edzes` mögé lenne rejtve.

Az „egy adott napra nincs edzés" kérdésre a **kevert** választ adtuk: ha a userhez **egyik**
sor flagje sincs bekapcsolva, a widget egyáltalán nem renderel (mint a quick-actions); ha
legalább egy flag be van kapcsolva de nincs mai adat, egy „Ma még nem volt edzés" üres állapot
jelenik meg (mint a nutrition widget `!computable` ágán a profil-link) — ez informatívabb, mint a
néma eltűnés egy olyan usernek, akinek egyébként van edzés-funkciója.

Soronkénti „rövid összegző adat" egyszerűsítve lett: lépésnél a tényleges lépésszám jelenik meg
(`{{count}} lépés`), a másik négy aktivitásnál (edzésnapló/mászás/úszás/bicikli) egy generikus
„{{count}} alkalom" a mai élő log-sorok száma — nem időtartam/táv/egyéb aktivitás-specifikus
mérőszám, mert azok mezőnként eltérő alakúak lennének (workout: perc, bicikli: km, úszás: méter),
és a widget célja gyors áttekintés, nem részletes napló. Ha ez később kevésnek bizonyul, külön
jegyben bővíthető aktivitásonkénti mérőszámmal.

## Lezáráskor (on-done)

- Frissített specek: [[Kezdőlap]] — új „Mai edzések" widget a widget-táblázatban, a "Tudatos
  korlát" bővítve, Frontend architektúra rész kiegészítve; `verifikalt_commit` bump
- `IMPLEMENTATION_STATUS.md` sor: 2026-09-20 — #112 dashboard "Mai edzések" widget (lépés/edzésnapló/mászás/úszás/bicikli + extra kalória)
- Kód: `frontend/src/app/core/data/today-workouts.service.ts` (+ `.spec.ts`),
  `frontend/src/app/pages/home/widgets/today-workouts-widget.component.{ts,html,scss,spec.ts}`,
  `frontend/src/app/core/config/home-widget-registry.ts` (`HOME_TODAY_WORKOUT_ROWS` +
  `today-workouts` widget bejegyzés), `frontend/src/app/pages/home/home.page.{ts,html,spec.ts}`,
  `frontend/src/app/core/config/icons.ts` (`bicycle-outline`, `water-outline`); nincs
  outbox/backend hatás (kizárólag helyi repository-kból olvas)
