---
id: 129
type: bug
status: backlog
title: "[PRIO] Új színsáv (GymColorBand) létrehozása nem működik Androidon"
specs:
  - "[[Indoor boulder admin]]"
  - "[[Indoor boulder napló]]"
  - "[[Backend-offline first]]"
flag:
created: 2026-09-25
closed:
---

# 129 — [PRIO] Új színsáv (GymColorBand) létrehozása nem működik Androidon

## Motiváció / probléma

**Prioritásos.** Felhasználói bejelentés (Android natív build, 2026-09-25): egy teremhez nem
lehet új színsáv elemet felvenni. Színsáv nélkül az indoor boulder napló gyors-rögzítője
([[Indoor boulder napló]]) nem használható, ami **offline sem működik**, pedig a
[[Backend-offline first]] szerint a teljes admin + napló folyamatnak hálózat nélkül is mennie
kell.

**Tünet (a user emlékezete szerint): a Mentés gombra nyomva semmi sem történik** — nincs
navigáció, nincs hibaüzenet, a form nyitva marad. Ez a lenti 1. (csendes validációs no-op) és 4.
(nem kezelt kivétel) hipotézissel egyezik.

Nem ismert, hogy konzisztensen vagy csak néha jön elő, és az sem, hogy csak UI-hiba-e (pl.
a mentés létrejön, csak a lista nem frissül), vagy a lokális írás sem történik meg. Lehet
köze a #128-hoz (szerkesztés nem marad meg, köztük a színsáv nehézsége), de lehet független is.

## Jelenlegi működés

- Útvonal: `/tabs/workout/climbing/admin/gyms/:gymId/bands/new` →
  `pages/workout/climbing/admin/gym-color-band-edit.page.ts`. A `gymId`-t a
  `route.snapshot.parent` paramMap-jéből veszi. A lista a `gym-edit.page.html`-ben csak akkor
  látszik, ha a teremnek már van `gymId`-je (mentett terem).
- `save()` **csendben visszatér**, ha a form invalid vagy bármelyik grade határ nem `VALID`
  (`form.markAllAsTouched()` után). Hibaüzenet **csak a hex mezőre** van (formátum /
  ütközés). Név- és grade-hibára nincs látható visszajelzés, a gomb „nem csinál semmit”.
- `GymColorBandRepository.save` → egyedi hex ellenőrzés (kanonikus alakon, a terem élő sávjai
  között) → `storage.upsertGymColorBand` (SQLite + outbox) → a `items` signal frissül → vissza
  a terem oldalra, ahol a `bands` computed a `forGym(gymId)`-ből számol.
- Nem várt kivétel (pl. SQLite / outbox hiba) esetén a `save()` továbbdobja, és nincs
  felhasználói visszajelzés.

## Hipotézisek (kivizsgálandó, nem igazolt)

1. **Csendes validációs no-op.** A grade parser `BOULDER` skálán nem ismeri fel a beírt
   értéket (pl. formátum, „/"-tartomány, szóköz, V vs Font), vagy a név üres. A `save()` ilyenkor
   szó nélkül kilép, ami a user szemszögéből pont „nem tudok létrehozni”.
2. **`gymId` üres vagy rossz.** Ionic navigációnál a `route.snapshot.parent` nem a `:gymId`
   szintre mutat, a sáv `gymId: ''`-vel mentődik, és a terem listájában soha nem jelenik meg
   (a hex-ütközés ellenőrzés is rossz halmazon fut).
3. **A lista nem frissül.** A terem oldal Ionic stack-ben újrahasznosított példány, a sáv
   létrejön, de a `bands` nem látszik (vö. #128 cache-hipotézis).
4. **Lokális írás / outbox hiba** (pl. hiányzó oszlop a `SCHEMA_Vn`-ben, FK a még nem szinkronizált
   `gym`-re, `dependsOn` hiánya egy offline létrehozott teremnél) → nem kezelt kivétel.
5. **A natív színválasztó** (`input[type=color]`, `backlog/115`) Android WebView-ben nem
   frissíti a hex mezőt, így a hex üres/invalid marad (de ekkor látszania kellene a hex
   hibaüzenetnek, ha a mező touched).

## Elfogadási kritériumok

- [ ] Reprodukció és gyökérok dokumentálva a `## Terv / döntési napló`-ban (Android, ONLINE és
      FULL_OFFLINE állapot, meglévő szinkronizált terem és offline most létrehozott terem is).
- [ ] Új színsáv létrehozható Androidon ONLINE, BACKEND_OFFLINE és FULL_OFFLINE állapotban.
      Mentés után azonnal megjelenik a terem sávlistájában, app újraindítás után is ott van,
      és a következő drain után a szerveren is létrejön.
- [ ] Offline most létrehozott teremhez is lehet sávot felvenni: az outbox `dependsOn`
      láncolja a terem POST-jára.
- [ ] A `save()` **soha nem csendes**: minden invalid mezőnél (név, alsó/felső grade, hex,
      fordított tartomány ha releváns) látható, lefordított hibaüzenet jelenik meg; nem várt
      hibánál is van visszajelzés (toast), nem csak konzol.
- [ ] A létrehozott sáv azonnal kiválasztható az [[Indoor boulder napló]] gyors-rögzítő rácsán.
- [ ] Regressziós spec a talált gyökérokra + a csendes-validáció visszajelzésre.

## Terv / döntési napló

_Első lépés: debug build, `chrome://inspect` konzol + `gym_color_band` / `outbox_item` tábla
tartalma a mentés előtt és után; ellenőrizni, milyen `gymId`-vel jön létre a sor (ha létrejön)._

## Lezáráskor (on-done)

- Frissített specek: [[…]] — melyik szakasz, egy sor mit változott
- `IMPLEMENTATION_STATUS.md` sor: <dátum> — <mit>
- Kód: <fő package-ek / fájlok>
