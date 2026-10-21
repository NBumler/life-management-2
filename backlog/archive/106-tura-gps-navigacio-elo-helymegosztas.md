---
id: 106
type: feature
status: done
title: Túra — élő GPS-navigáció, track-felvétel, élő helymegosztás
specs:
  - "[[Biciklizés napló]]"
flag:
created: 2026-09-13
closed: 2026-10-21
---

# 106 — Túra — élő GPS-navigáció, track-felvétel, élő helymegosztás

## Motiváció / probléma

Túrázás közben a felhasználó valós idejű GPS-pozíciót, útvonal-rögzítést, és — biztonsági okból —
esetleg élő helymegosztást/vészjelzést szeretne. A "GPS-es live offline túrázás" a felhasználó
egyik konkrét panasza a versenytársakkal szemben (gyakran fizetős, pl. Wikiloc Premium élő
tracking, Természetjáró BuddyBeacon).

## Jelenlegi működés

Nincs — ez egy vadonatúj feature. A `073-climbing-crag-gps-terkep-nezet-placeholder.md` ticket már
felvetette a Capacitor geolocation plugin használatát egy más kontextusban (crag GPS-koordináta) —
érdemes onnan mintát/tanulságot átvenni GPS input UX terén.

## Elfogadási kritériumok

- [x] Az alábbi döntési checklista véglegesítve.
- [x] Backend-offline szempont tisztázva: élő navigáció **FULL_OFFLINE**-ban (nincs internet, csak
      helyi GPS-jel) is működnie kell — ez a feature lényege, nem opcionális él.

## Terv / döntési napló

**Döntés (2026-09-13, felhasználóval egyeztetve):**

- [x] Élő pozíció megjelenítés a térképen — **kell**.
- [x] Track-felvétel (GPX-log a megtett útról) — **kell**.
- [x] Turn-by-turn / hangalapú navigáció a tervezett útvonal mentén — **kell**.
- [x] Letérés-figyelmeztetés — **kell**.
- [x] SOS/vészhívás jelenlegi GPS-pozícióval — **kell**.
- [ ] Élő helymegosztás ismerősökkel/vészhelyzeti kontakttal — **nem kell** (explicit kizárva;
      indoklás: online-függő funkció lenne egy egyébként offline-first feature-ben, és a SOS-hívás
      már lefedi a biztonsági alapigényt)
- [ ] Akkumulátor-kímélő GPS-mintavételezési mód hosszú túrákhoz — nem került döntésre, implementációs
      részletkérdésnek tekintjük, nem külön feature-döntésnek.

### Közös alap a biciklivel (2026-10-02)

A GPS-követés alaprétege (`core/geo/`: `LocationTrackingService`, `tracking-config.ts`,
`track-buffer`, `geo-math.ts`, DEM-alapú `elevation.service`) és a plugin-választás a
[[150-biciklizes-elo-gps-tracker]] jegyben készül (0–2. fázis), **teljesen eszközön, backend
nélkül**. Ez a jegy ugyanerre épül, nem implementál saját GPS-réteget. Az itt nyitva hagyott
„akkumulátor-kímélő mintavételezési mód” ott dől el (`ECO_INTERVAL_SECONDS`; az ECO mód csak akkor
marad, ha a plugin valóban spórol vele).

### Nyitott kérdés

- SOS-hívás natív telefonhívás-e (egyszerű `tel:` link a mentők számára + GPS-koordináta), vagy
  valamilyen backend-integráció (pl. automatikus SMS/email egy vészhelyzeti kontaktnak)?
- `@capacitor/local-notifications` már használatban van más feature-höz — újrafelhasználható-e
  letérés-figyelmeztetéshez?
- Turn-by-turn hangalapú navigáció FULL_OFFLINE-ban is működnie kell (a `105-...` offline
  útvonalszámítás tickettel közös alapra épül) — implementációkor egyeztetendő.

### Implementációs terv (2026-10-21)

Az alap kész: `LocationTrackingService` (Pontos GPS, fix-szűrés, engedélykérés, #229), `TrackBufferService`,
`geo-math`, DEM-alapú `ElevationService`, a Túra oldal kék pontja (#215). A navigáció ezekre épül, saját
GPS-réteg nélkül, **teljesen eszközön** (FULL_OFFLINE-ban is: a GPS-jel, a mentett útvonal és a DEM helyi;
backend csak a mentett felvétel szinkronjához kell). ECO mód nincs (a plugin nem tud ritkábban ébreszteni,
#150 / #153), így az „akkumulátor-kímélő mód” kérdés lezárva: Pontos mintavétel, 5 m-es távszűrő.

Négy szelet, mindegyik után zöld kapu, commit, megállás:

1. **Navigációs logika, UI nélkül** (`core/geo/`, tiszta TS, unit tesztek):
   - `route-progress.ts`: a fix vetítése a tervezett vonalra (táv a vonal mentén, oldaltávolság), az
     előrehaladás csak egy ablakon belül keres (oda-vissza / hurok útvonalon nem ugrik át a másik ágra),
     hátralévő táv, ↑ és Naismith-idő a mentett magasságprofilból, célba érés.
   - Letérés hiszterézissel: `OFF_ROUTE_ENTER_METERS` felett két egymást követő fixnél letért,
     `OFF_ROUTE_EXIT_METERS` alatt újra az úton (nem villog a határon).
   - `turn-instructions.ts`: kanyarok a vonal geometriájából (Douglas–Peucker egyszerűsítés, irányváltás
     szöge → enyhén / élesen balra / jobbra), egymáshoz közeli kanyarok összevonása; ha az útvonal mentén
     ismertek a turistaút-elágazások, csak elágazásban jelez (a szerpentin nem „kanyar”).
   - Bemondás-ütemező: kanyar előtt `TURN_ANNOUNCE_FAR_METERS` és `TURN_ANNOUNCE_NEAR_METERS`, mindegyik
     egyszer; letérés és visszatérés egyszer.
2. **Navigációs munkamenet** (`core/data/hike-navigation.service.ts`, a bicikli élő edzés mintájára):
   start (tervezett útvonallal vagy anélkül, szabad felvétel) / szünet / folytatás / befejezés / elvetés,
   Preferences-draft + `TrackBufferService` (`hike`), app-kill utáni folytatás. Egyszerre egy GPS-munkamenet:
   futó bicikli élő edzés mellett a navigáció nem indul (magyarázattal), és fordítva. Letéréskor
   rezgés + helyi értesítés (a meglévő `LocalNotificationsGateway`, így képernyőzár alatt is szól), és
   hangbemondás egy `SpeechGateway`-en át.
3. **Felület a Túra oldalon:** „Navigáció indítása” a mentett útvonal kártyáján, „Túra felvétele” a „…”
   menüben; lebegő navigációs panel (következő kanyar nyíllal és távval, hátralévő táv / idő, eltelt idő,
   letérés-sáv, Szünet / Befejezés); élő pozíció iránnyal, a felvett nyomvonal rétege, követő kamera
   (kézi mozgatásra elenged, „Vissza a helyzetemhez” gomb). Befejezéskor összegző: a felvétel mentése
   `HikeRoute`-ként az Útvonalaim közé (név előtöltve, metrika az eszközön, mint a rajzolt útvonalnál),
   vagy elvetés. Emulátoron szimulált nyomvonallal (`adb emu geo fix` sorozat) végigpróbálva, hu + en.
4. **SOS:** a navigációs panelen és a „…” menüben: az aktuális koordináta (tizedes és fok-perc-másodperc),
   pontosság és a fix kora, „112 hívása” (`tel:112`, a mobilhálózat internet nélkül is hív). Jegyzárás.

Döntések (az alapértelmezés a javaslat; a 2. szelet előtt rákérdezek):

| # | Kérdés | Javaslat |
|---|---|---|
| D1 | Hangbemondás: új natív függőség (`@capacitor-community/text-to-speech`, az Android beépített TTS-e, offline is) vagy hang nélkül (rezgés + értesítés) | Plugin; ha nincs hang-motor, csendben rezgés + értesítés |
| D2 | SOS: `tel:112` + koordináta-kijelzés, vagy SMS / e-mail vészhelyzeti kontaktnak | `tel:112` + koordináta, backend nélkül |
| D3 | A felvett nyomvonal mentése: sima `HikeRoute` (nincs séma-változás) vagy új mezők (felvétel ideje, valós időtartam; Flyway + outbox-emelés) | Sima `HikeRoute`; a különválasztás külön jegy, ha kell |
| D4 | GPX-export | Külön jegy (megosztó plugin kell hozzá) |
| D5 | Szabad felvétel tervezett útvonal nélkül | Igen (olcsó, ugyanaz a munkamenet) |

- **2026-10-21 — döntések:** a user mind az öt javaslatot elfogadta („Mehet”): D1 plugin
  (`@capacitor-community/text-to-speech` 8.0.2, MIT, Capacitor 8), D2 `tel:112` + koordináta, D3 sima
  `HikeRoute`, D4 GPX-export külön jegy, D5 szabad felvétel is.
- **1. szelet (`a3e3438`):** `core/geo/route-progress.ts`, `turn-instructions.ts`, `route-navigation.ts`,
  `navigation-config.ts` — tiszta függvények, unit tesztekkel.
- **2. szelet:** `core/data/hike-navigation.service.ts` (navigáció / szabad felvétel, szünet, befejezés,
  mentés `HikeRoute`-ként a munkamenet UUID-jával, app-kill utáni folytatás; a már elhangzott bemondások a
  draftban, így újraindítás után sem ismétlődnek), `core/speech/` (bemondás az app nyelvén; hang-motor vagy
  hang nélkül csendben), `core/geo/gps-session-lock.ts` (a bicikli élő edzés és a túra-navigáció draftja
  egymást zárja ki, „GPS foglalt” üzenettel). Letéréskor erős rezgés + helyi értesítés (visszatéréskor
  eltűnik), kanyarnál rezgés, célba éréskor rezgés. A felvett vonal 3 m-es tűréssel egyszerűsítve mentődik.
  (`255294e`)
- **3. szelet:** `pages/menu/tura/hike-navigation-panel.component.*` (következő kanyar forgatott nyíllal és
  távval, letérés-sáv, megérkezés, gyenge jel, idő / megtett / hátra, Szünet / Folytatás / Befejezés
  megerősítéssel; befejezés után összegző a név előtöltésével — „<tervezett név> – <dátum>” vagy
  „Túra – <dátum>” —, Mentés / Elvetés megerősítéssel), `hike-navigation-layers.ts` (a tervezett vonal,
  és narancs felvett nyomvonal — nem MTSZ-szín, a jelmagyarázatba is bekerült); a helyzet a meglévő kék pont.
  Belépés: a mentett útvonal kártyáján „Navigáció indítása”, a „…” menüben „Túra felvétele” (csak natívon,
  és ha nem fut már túra). Követő kamera a panel fölötti szabad részre igazítva; kézi mozgatásra elenged,
  „Követés” gomb hozza vissza. A kanyarszűrés a betöltött turistautakat kapja az útvonal körül.
  Emulátoron (`adb emu geo fix` sorozat, „Teszt Pilis kor”, 2,0 km): hu-ban „140 méter múlva fordulj
  jobbra” → „Most fordulj jobbra” → letérés (piros sáv, bemondás, értesítés „Kb. 60 m-re…”) → „Újra az
  útvonalon vagy” → „Megérkeztél a célhoz”, Befejezés → összegző → Mentés: a felvétel az Útvonalaim közé
  került a kitérővel együtt. en-ben szabad felvétel: Pause (értesítés „Hike paused”), Resume, Finish,
  Discard. A szüneteltetési értesítés címe „Túra szüneteltetve” lett (szabad felvételnél is igaz).
  (`d0df463`)
- **4. szelet — SOS:** `core/geo/coordinate-format.ts` (tizedes fok 5 jeggyel, nyelvfüggetlenül; fok-perc-
  másodperc a nyelv égtájaival: É/D/K/Ny, N/S/E/W) és `pages/menu/tura/hike-sos.component.*` félmagas lapon:
  koordináta mindkét alakban (kijelölhető), pontosság, a pont kora (másodperc / perc, élőben nő), „112 hívása”
  (`tel:112` → a tárcsázó nyílik meg a számmal; híváshoz a felhasználó nyom). Belépés: a navigációs panel
  „SOS” gombja és a „…” menü „Vészhelyzet (SOS)” pontja (mindig, navigáció nélkül is). Futó GPS-munkamenet
  (túra, élő bicikli) alatt annak utolsó pontja, élőben frissülve; különben egyszeri helymeghatározás
  „Helyzet frissítése” gombbal, elutasított engedélynél magyarázat — a 112 ilyenkor is hívható. Backend,
  internet és új függőség nélkül. Emulátoron: en — menüből, „Finding your position…” → „47.67851, 18.87889 /
  47°40′42.6″ N, 18°52′44.0″ E, Accuracy: ±5 m · 20 seconds ago”, a kor percre váltott; „Call 112” a
  tárcsázót nyitotta „112”-vel (hívás nem indult), visszatérve a lap megmaradt. hu — futó felvétel közben a
  panel SOS gombjával: „Tizedes fok / Fok, perc, másodperc … É, … K, Pontosság: ±5 m · 3 másodperce”,
  frissítés gomb nélkül; utána Befejezés → Elvetés.
- A nyitott kérdések lezárva: SOS = `tel:112` + koordináta (D2); a letérés a meglévő
  `LocalNotificationsGateway`-t használja (2. szelet); a turn-by-turn a mentett útvonal geometriájából és a
  betöltött turistautakból számol, eszközön (1. és 3. szelet), FULL_OFFLINE is.
- A GPX-export külön jegy: [[235-tura-gpx-export]] (D4).

Spec: a #102 szabálya szerint a Túra feature spec a család végén készül; a [[Biciklizés napló]] spec a
közös GPS-réteg leírásánál kap egy sort (egyszerre egy GPS-munkamenet).

## Lezáráskor (on-done)

- Frissített specek: [[Biciklizés napló]] — „Élő edzés”: egyszerre egy GPS-munkamenet (a túra-navigáció
  mellett nem indul, „GPS foglalt”), a 2. szeletben. A Túra feature spec a #102 szabálya szerint a család
  végén készül, ez a jegy addig a viselkedés leírása.
- `IMPLEMENTATION_STATUS.md` sor: 2026-10-21 — Túra: élő GPS-navigáció, track-felvétel, hangos turn-by-turn,
  letérés-figyelmeztetés, SOS (#106)
- Kód: `core/geo/` (`route-progress`, `turn-instructions`, `route-navigation`, `navigation-config`,
  `gps-session-lock`, `coordinate-format`), `core/data/hike-navigation.service.ts`, `core/speech/`,
  `pages/menu/tura/` (`hike-navigation-panel`, `hike-navigation-layers`, `hike-sos`); új natív függőség:
  `@capacitor-community/text-to-speech`.
