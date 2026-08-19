# Google Calendar szinkronizálása

## Business

| | |
|---|---|
| **Státusz** | `Kész` |
| **Szülő** | [[Események]] |
| **Kapcsolódó** | [[Események]], [[Új esemény hozzáadása]], [[Naptár]], [[Értesítések]], [[Frontend]], [[Backend]], [[Bejelentkezés]], [[Backend-offline first]], [[Szinkronizációs központ]] |

### Célállapot

**Egyirányú export: LM2 → Google Calendar** (döntés). A saját [[Események]] felkerülnek egy **dedikált** Google naptárba, így a telefon / gép natív naptárában és a többi eszközön is látszanak.

**Nem MVP:** az első kiadásban a feature flag `false`. A spec `Kész` = a terv elfogadott és implementálható, nem azt jelenti, hogy az első körben elkészül.

### Funkcionális leírás

#### Irány és forrás-tulajdonos (döntés)

- Az **LM2 sor a forrás**, a Google csak tükör. Google-oldali szerkesztés **nem jön vissza**, és a következő egyeztetésnél **felülíródik**. Ezt a beállító képernyőn ki kell írni, különben a user elveszett szerkesztésként éli meg.
- Nincs import, nincs kétirányú merge: az import külön feature lenne (a [[Naptár]] új producere), a kétirányú sync pedig konfliktuskezelést, ismétlődési szabály átfordítást és törlés-szemantikát kívánna mindkét irányban — ezt a [[Backend-offline first]] szándékosan kerüli (LWW, nincs mezőszintű merge).

#### Dedikált naptár (döntés)

Az app **saját, másodlagos** Google naptárt hoz létre (javasolt név: „Life Management"), és **kizárólag** abba ír. A user elsődleges naptárába nem írunk.

Miért: a felhasználó saját bejegyzései nem keverednek az app adataival, a naptár a Google-ban egy kattintással elrejthető vagy törölhető, és a jogosultság a lehető legszűkebb — az app csak az **általa létrehozott** naptárra kér hozzáférést.

#### Mit exportálunk

| Exportált | Nem exportált |
|---|---|
| [[Események]] `CalendarEvent` sorok (`deleted = false`) | [[Háztartási feladatok]] esedékességek, [[Élet tervek]] határidők, edzés / mászás naplók, [[AYCM tracker]] check-inek |

Egy `CalendarEvent` **sorozat = egy** Google esemény ismétlődési szabállyal; nem az előfordulásokat töltjük fel egyenként. Így a Google-ban is egy sorozat szerkeszthető / elrejthető, és nincs horizon-korlát.

A naplók és esedékességek kihagyása szándékos: naptár-zaj lenne, a háztartási feladat `nextDue`-ja pedig pipálásra ugrik, tehát folyamatos újraírást igényelne.

#### Mezőleképezés

| LM2 ([[Események]]) | Google esemény |
|---|---|
| `title` | `summary` |
| `location` | `location` |
| `notes` | `description` |
| `allDay = true` | `start.date` = `date`, `end.date` = `date + 1 nap` (a Google végdátuma **exkluzív**) |
| `allDay = false` | `start.dateTime` / `end.dateTime` a `date` + `startTime` / `endTime`, `timeZone` = az eszköz **IANA** zónája |
| `frequency` + `interval` | `RRULE:FREQ=DAILY\|WEEKLY\|YEARLY;INTERVAL=n` (`WEEKLY`-nél explicit `BYDAY` a `date` napjából), `UNTIL` / `COUNT` nélkül |
| `frequency = null` | nincs `RRULE` |
| — | `reminders`: `useDefault = false`, üres lista |

- **Emlékeztető kikapcsolva (döntés):** különben a Google is értesítene a saját [[Értesítések]] `EVENT_OCCURRENCE` mellett, és a user duplán kapná. Az értesítés egyetlen forrása az app marad.
- **Időzóna:** az [[Események]] falóra-szemantikájú (nincs TZ-mező), a Google API viszont zónát kér. Az export az exportáló eszköz aktuális zónáját küldi. Ha a user zónát vált, az LM2 továbbra is 15:00-t mutat, a korábban feltöltött Google esemény viszont a régi zónához van kötve — ezért a zóna **része a lenti hash-nek**, és a következő egyeztetés újraírja.
- **Feb. 29.:** az `YEARLY` szabály a Google / RFC 5545 szerint is csak szökőévben ad előfordulást, ami megegyezik az [[Események]] szabályával (nem-szökőévben kihagyva) — nincs mit külön kezelni.
- Többnapos / éjfélen átnyúló esemény nincs ([[Események]] `endTime > startTime`, ugyanaz a nap), tehát nincs átnyúló eset.

#### Determinisztikus Google esemény-ID (döntés)

A Google esemény `id`-ja az LM2 esemény UUID-jából **számított** (a 16 bájt base32hex kódolása — a Google `id` formátuma ezt engedi), nem tárolt.

Miért: így a feltöltés **idempotens**. Ha ugyanaz az esemény két eszközről is felkerül, ugyanaz az ID keletkezik → nem lesz duplikátum; a „már létezik" válasz frissítésre fordul. Ugyanez teszi biztonságossá a megszakadt egyeztetés újrafutását.

#### Egyeztetés (reconciler, nem outbox)

Az export **nem** az entitás-outboxon megy ([[Backend-offline first]] §12–13: az outbox a saját backend mutációié). Külön, állapot-egyeztető kör fut:

1. Kiváltó: app indulás / előtérbe jövés, esemény-mutáció (rövid késleltetéssel összevonva), valamint kézi „Exportálás most".
2. Minden élő esemény aktuális tartalmából **hash** készül (a fenti mezők + időzóna). Ha a device-local export-állapot hash-e ettől eltér vagy nincs, a rekord feltöltésre kerül (létrehozás vagy frissítés), majd az új hash mentődik.
3. **Törlés:** a soft-deletelt esemény Google párja törlődik, és az export-állapot sora eltűnik.
4. **Orphan-söprés:** ha egy export-állapot sorhoz nincs élő helyi esemény (pl. a tombstone már lejárt a retention miatt, vagy az eszköz hosszan offline volt), a Google esemény akkor is törlődik. Enélkül maradna szemét a naptárban.

Az egyeztetés **idempotens és megszakítható**: nincs „félig kész" állapot, a következő futás onnan folytatja, ahol a hash-ek nem stimmelnek.

#### Összekapcsolás és leválasztás

- **Összekapcsolás:** Google bejelentkezés a kliensről (OAuth, authorization code + PKCE), utána a dedikált naptár létrehozása (vagy a korábban létrehozott megtalálása), majd az első teljes egyeztetés — ez az összes élő eseményt felviszi.
- **Kizárólag online művelet:** az OAuth kör `FULL_OFFLINE` állapotban nem indítható, a gomb `disabled` + magyarázat ([[Backend-offline first]] §16).
- **Leválasztás:** token visszavonás + a device-local export-állapot törlése. Kérdés a usernek: **a létrehozott Google naptár törlődjön-e** (megerősítéssel), vagy maradjon meg archívumként. Az LM2 adatait a leválasztás nem érinti.
- **Natív-only:** web buildben a feature nem jelenik meg ([[Frontend]] platform-képességmátrix).

#### Hibák és korlátok

- A hibák **nem** a [[Szinkronizációs központ]]ba mennek — az a saját backend outboxának a képernyője. Az export saját státuszsort kap a beállító képernyőn: utolsó sikeres egyeztetés ideje, hátralévő tételek, hibaüzenet és „Exportálás most".
- Minden külső hívásra timeout (8 s, [[Backend-offline first]] §13); a fő flow nem blokkol rajta.
- Kvóta / rate limit hibára növekvő várakozás, és a kör a következő kiváltónál újrapróbál. Az export **soha nem blokkolja** az esemény mentését: a helyi tranzakció maga a siker.
- Visszavont vagy lejárt hozzáférés: a beállító képernyő „újra összekapcsolás szükséges" állapotot mutat, az egyeztetés leáll (nem próbálkozik végtelenül).

### UI/UX elvárások

- **Belépés:** [[Események]] lista fejléc → Google export (`/tabs/tasks/events/google`) — [[Frontend]].
- A képernyő tartalma: összekapcsolás / leválasztás, a cél naptár neve, az egyirányúság kiírása („a Google-ban végzett szerkesztés elveszik"), státuszsor, „Exportálás most", és a jelzés, hogy az exportált események **nem** adnak Google emlékeztetőt (az értesítés az appból jön).
- **Feature flag:** saját flag, függ az [[Események]] flagtől — [[Frontend]] flag registry. Kikapcsolva a fejléc belépő rejtve, és az egyeztetés nem fut.

### Megjegyzések

Az export tudatosan **nem** érinti a saját backendet: nincs új entitásmező, nincs OpenAPI és nincs migráció. Az export-állapot device-local tábla, mert az összekapcsolás is eszközszintű.

Két eszköz ugyanazzal a Google fiókkal összekapcsolva ugyanoda, ugyanazokkal az ID-kkal ír — konvergens, nincs duplikátum. Külön Google fiókokkal mindkettő a saját naptárába exportál, ami szintén helyes viselkedés.

Későbbi kör lehet: import (a Google mint új [[Naptár]] producer) és a naplók / esedékességek exportja. Egyik sem igényli a mostani terv átírását, mert az export-állapot és a determinisztikus ID az esemény-entitástól függetlenül él.

### Nyitott kérdések

Nincs nyitott kérdés.

## Architektúra

### Frontend

- Google OAuth **a kliensről**, a saját backend nem proxyz ([[Backend]], [[Backend-offline first]] §13). Authorization code + PKCE; client secret nincs (installed app).
- A **refresh token** platform secure storage-ban, a [[Bejelentkezés]] szerinti tárolóban, külön kulcstérben; az app-frissítés után is megmarad. A token soha nem kerül az outboxba és nem megy fel a saját szerverre.
- **Minimális scope:** csak az app által létrehozott naptárak kezelése (Google `calendar.app.created` jellegű, szűk scope) — a konkrét scope-sztring és a Capacitor OAuth csomag implementációkor véglegesítendő, a követelmény (legszűkebb jogosultság, natív authorization code + PKCE) kötött.
- `GoogleCalendarExportService` (root): összekapcsolás-állapot signal, egyeztető kör, hash-számítás, determinisztikus ID leképezés. A ritmus → `RRULE` és az `allDay` → exkluzív végdátum átfordítás **pure TS**, tehát unit-tesztelhető.
- Device-local tábla az export-állapotnak (`eventId`, `hash`, `syncedAt`) + a naptár azonosítója és az összekapcsolt fiók a preferenciákban.
- A Google kliens **nem** a generált OpenAPI kliens (az a saját backendé); külön, szűk HTTP réteg.

#### Backend-offline

| Állapot | Export |
|---|---|
| `ONLINE` | megy |
| `BACKEND_OFFLINE` | **megy** — külső API, internet van ([[Backend-offline first]] §13) |
| `FULL_OFFLINE` | vár; az OAuth indítás `disabled`, az egyeztetés a következő kiváltónál fut |

Az események helyi létrehozása / szerkesztése / törlése offline is a szokott módon megy ([[Események]]); az export ettől független, késleltetett kör. Ha egy esemény offline többször módosul, csak a **végállapot** kerül fel (hash-alapú egyeztetés, nem műveletnapló).

### Backend

_Nincs backend érintettség._ Az exportált események a saját backenden változatlanul a `calendar_event` sorok ([[Események]]); nincs Google-specifikus mező, tábla vagy végpont.

### Nyitott kérdések

Nincs nyitott kérdés.
