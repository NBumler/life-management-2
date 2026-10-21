---
id: 109
type: feature
status: in-progress
title: Túra — időjárás-előrejelzés és térkép-overlay
specs: []
flag:
created: 2026-09-13
closed:
---

# 109 — Túra — időjárás-előrejelzés és térkép-overlay

## Motiváció / probléma

Túrázás tervezésekor és közben az időjárás-előrejelzés kulcsfontosságú. A Természetjáró app alap
időjárás-előrejelzést ingyenesen ad, de a térkép-overlay réteget (valós idejű időjárás vizuálisan a
térképen) Pro+ mögé teszi.

## Jelenlegi működés

A `gear` modulban már van egy időjárás-kereső popup a pakolás úticéljához (lásd
`86-...idojaras-keresés` — `#86 — időjárás-keresés felugró böngészőben a pakolás úticéljára`) — ez
újrafelhasználható mintaként/komponensként szolgálhat ehhez a tickethez, de önmagában nem a
túraútvonal-tervező része.

## Elfogadási kritériumok

- [x] Az alábbi döntési checklista véglegesítve.
- [x] Tisztázva, hogy a `gear` modul meglévő időjárás-integrációja (API, komponens) mennyiben
      reuse-olható itt. — Nem: a #86 nem API, csak egy Google-keresés URL (`gear/sessions/weather-search.ts`).
- [x] Előrejelzés-kliens + eszközön tárolt utolsó ismert előrejelzés + riasztási szabályok
      (`core/weather/`), unit tesztekkel. (1. szelet)
- [x] Az útvonal-kártyán (mentett útvonal, ajánlott túra, piszkozat) „Időjárás” szakasz a kezdőpontra:
      napi összegző a következő napokra, órás sáv, forrás-megjelölés (Open-Meteo, CC BY 4.0); offline az
      utolsó ismert előrejelzés a korával, ha nincs ilyen, egy rövid magyarázat. (2. szelet)
      Többnapos útnál napi helyválasztó („1. nap kezdete”, „2. nap kezdete” …).
- [ ] Navigáció indításakor, ha a becsült túraidőn belül kedvezőtlen idő várható, figyelmeztető ablak
      („Indulás így is” / „Mégse”); adat nélkül nem blokkol. Emulátoron hu + en 360 dp. (3. szelet)

## Terv / döntési napló

**Döntés (2026-09-13, felhasználóval egyeztetve):**

- [x] Alap időjárás-előrejelzés egy kiválasztott területre/útvonalra — **kell**.
- [ ] Térkép-overlay réteg (valós idejű időjárási adat vizuálisan a térképen) — **nem kell**
      (kikerül a scope-ból; a legtöbb versenytárs is emiatt teszi fizetőssé, nálunk sem elsődleges
      prioritás).
- [x] Túraindulás előtti figyelmeztetés kedvezőtlen időjárás esetén — **kell**.

### Nyitott kérdés (megválaszolva, 2026-10-21)

- Melyik időjárás-API-t használja a `gear` modul jelenlegi implementációja, és van-e rajta olyan
  korlátozás (rate limit, licenc), ami miatt nem skálázható egy gyakrabban hívott túra-riasztáshoz?
  → A `gear` modul nem hív API-t (#86: Google-keresés link). A túra az **Open-Meteo forecast** API-t
  hívja közvetlenül a kliensből (kulcs nélkül, nem kereskedelmi használatra ingyenes, napi ~10 000 hívás;
  az adat CC BY 4.0 → forrás-megjelölés a UI-on). Ugyanaz a szolgáltató, mint a magasság-API
  (Backend-offline first §13); nincs backend-proxy. Egy hely előrejelzése 1 órán át frissnek számít, így
  a hívásszám elhanyagolható.

### Terv (2026-10-21)

1. **Mag (UI nélkül):** `core/weather/weather-forecast.ts` (típusok, Open-Meteo `unixtime` válasz
   feldolgozása, WMO-kód → állapot-csoport), `open-meteo-forecast.service.ts` (8 s timeout, 7 nap, órás +
   napi sorok), `weather-forecast.service.ts` (eszköz-lokális utolsó ismert előrejelzés `Preferences`-ben,
   ~5 km-es rácsra kerekítve, 8 hely; 1 óráig friss; hiba esetén az utolsó ismert `stale` jelöléssel),
   `weather-warnings.ts` (riasztási szabályok egy időablakra).
2. **Kártya:** „Időjárás” szakasz az útvonal-kártyán, a kezdőpont előrejelzésével.
3. **Indulás előtti figyelmeztetés** + lezárás.

Riasztási küszöbök (konstansok, `weather-warnings.ts`): zivatar (WMO 95–99), hó, ≥ 4 mm/h csapadék,
≥ 60 % csapadék-esély (ha nincs már zivatar / erős eső), ≥ 50 km/h széllökés, ≥ 32 °C vagy ≤ −10 °C
hőérzet, napnyugta a becsült befejezés előtt (sötétedés). Ismeretlen érték soha nem riaszt.

## Napló

- 2026-10-21 — 1. szelet: `core/weather/` mag + 17 unit teszt (feldolgozás, ismeretlen ≠ 0, hibás
  válasz, WMO-csoportok, küszöbök, időablak, sötétedés, lefedettség, cache: friss / lejárt / force /
  offline stale / közös kérés / 8 hely / sérült tár).

## Lezáráskor (on-done)

- Frissített specek: _(új spec-fájl, ha ekkor még nincs)_
- `IMPLEMENTATION_STATUS.md` sor: <dátum> — <mit>
- Kód: a `gear` modul időjárás-integrációjának újrafelhasználása/kiterjesztése
- 2026-10-21 — döntések (felhasználó: „Mehet”): az előrejelzés helye a kezdőpont, többnapos útnál a napok
  kezdőpontjai; a kártyán „Időjárás” szakasz; a figyelmeztetés a „Navigáció indítása” gombnál a becsült
  túraidőre (szabad felvételnél az első helyzetre, a következő 3 órára); a küszöbök maradnak.
- 2026-10-21 — 2. szelet: `route-weather.component` (napi sor, a kiválasztott nap összegzője
  napkeltével/napnyugtával, órás sáv 05–22 óra között, frissítés gomb az utolsó ismert előrejelzésnél,
  forrás-megjelölés), `weather-text.ts`, 7 új ikon, `TURA.WEATHER.*` hu + en. Emulátoron (360 dp):
  - hu, BACKEND_OFFLINE (a backend nem futott): „Időjárás” – Ma / Cs 22. / … napi sor, „Borult · csapadék
    1,4 mm · széllökés 32 km/h · napkelte 07:11, napnyugta 17:45”, órás sáv, forrás. A magyar napcímke
    az `Intl` szerint „22., Cs” lett → javítva „Cs 22.”-re.
  - en, FULL_OFFLINE (repülőgép mód): a már letöltött helyre az eszközön tárolt előrejelzés („Today / Thu 22 …”,
    a csütörtökre koppintva „Rain · precipitation 14.9 mm · gusts 67 km/h …” és 05:00-tól órás sáv);
    a Teszt188 kétnapos útnál „Start of day 1 / Start of day 2” és a „No forecast: …” magyarázat.
