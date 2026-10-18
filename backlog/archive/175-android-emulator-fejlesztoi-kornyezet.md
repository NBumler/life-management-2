---
id: 175
type: feature
status: done
title: Android emulátoros tesztkörnyezet a fejlesztői gépen
specs:
  - "[[Fejlesztői környezet]]"
flag:
created: 2026-10-19
closed: 2026-10-19
---

# 175 — Android emulátoros tesztkörnyezet a fejlesztői gépen

## Motiváció / probléma

A natív (Android) tesztelés eddig kizárólag valódi telefonon futott, vezeték nélküli hibakereséssel +
`adb`-vel (`scripts/install-android.ps1`). Ehhez kell a telefon, ugyanaz a Wi-Fi, párosítás, tűzfal.
Legyen egy bármikor elérhető, a gépen futó „rendes Android” út is: emulátor, amire ugyanaz a debug APK
egy paranccsal felmegy, és ami a gépen futó backendet látja — telefon nélkül, akár agent-munkamenetből is
(képernyőkép `adb`-vel).

## Jelenlegi működés

- [[Fejlesztői környezet]] „Android telepítés a házi hálózaton” csak fizikai eszközt ír le (Wi-Fi / USB /
  wireless debugging, ill. `-Deliver`).
- `install-android.ps1` minden `adb devices` eszközt egyformán kezel: ha a telefon és egy emulátor is
  csatlakozik, „több eszköz” hibával leáll; emulátort nem indít; az `apiBaseUrl`-t a gép LAN IP-jére írja.
- A gépen adott: Android Studio SDK (`%LOCALAPPDATA%\Android\Sdk`), emulator 37.x, WHPX gyorsítás
  (Hyper-V), egy `Medium_Phone_API_35` AVD (Android 15, `google_apis_playstore` x86_64). `cmdline-tools`
  (avdmanager/sdkmanager) nincs telepítve.

## Elfogadási kritériumok

- [x] Egy paranccsal elindítható az emulátor, és a szkript megvárja a teljes bootot.
- [x] `install-android.ps1 -Emulator` buildel, (ha kell) elindítja az emulátort, és arra telepít; az
      `apiBaseUrl` = `http://10.0.2.2:8080/api` (az emulátor hoszt-loopback aliasa) — tűzfalszabály nem kell.
- [x] Ha telefon és emulátor is csatlakozik, a szkript egyértelműen választ: `-Emulator` → emulátor,
      enélkül → a fizikai eszköz.
- [x] Az app az emulátoron eléri a lokális backendet (`GET /api/health` 200; a login-kérés a backendtől
      kapott 401-et — „Incorrect username or password”).
- [x] [[Fejlesztői környezet]] dokumentálja: indítás, telepítés, offline állapotok előállítása
      emulátoron (repülőgép mód `adb`-vel), GPS szimuláció, WebView debug, képernyőkép.

## Terv / döntési napló

- Hoszt elérése: `10.0.2.2` (az emulátor beépített aliasa a gép `127.0.0.1`-ére) — nincs LAN IP, nincs
  tűzfal, nem függ a Wi-Fitől. A CORS ugyanaz, mint telefonon (`androidScheme: 'http'` debugban).
- AVD (felhasználói döntés): **saját projekt-AVD** `LM2_Phone`, a meglévő `Medium_Phone_API_35`
  érintetlen. 1080×2340 @ 480 dpi = 360 dp széles nézet (a fejlesztői telefonhoz igazítva), Android 15.
- `avdmanager` nincs → az AVD-t a szkript kézzel írja (`<név>.ini` + `<név>.avd/config.ini`, a meglévő
  Android Studio AVD config mintájára); a többit az emulátor első indításkor generálja. Ellenőrizve:
  `wm size` 1080x2340, `wm density` 480, Android 15.
- Az emulátor a build előtt `-NoWait`-tel indul, így a boot a builddel párhuzamos; a telepítés előtt a
  szkript kivárja a `sys.boot_completed`-et.
- Az SDK-feloldás kiemelve `scripts/android-sdk.ps1`-be (két szkript használja).
- Ellenőrzött `adb` parancsok: `cmd connectivity airplane-mode enable/disable` (a hoszt eléréshatatlan
  lesz, majd visszajön), `emu geo fix`, `exec-out screencap`.

## Lezáráskor (on-done)

- Frissített specek: [[Fejlesztői környezet]] — új „Android emulátor a fejlesztői gépen” szakasz
  (szkriptek, AVD, `10.0.2.2`, eszközválasztás, `adb` parancstábla); Backend-offline táblában az
  emulátoros repülőgép mód.
- `IMPLEMENTATION_STATUS.md` sor: 2026-10-19 — Android emulátoros tesztkörnyezet (#175)
- Kód: `scripts/android-emulator.ps1` (új), `scripts/android-sdk.ps1` (új),
  `scripts/install-android.ps1` (`-Emulator` / `-Avd`, emulátor-serialok kiszűrése), `CLAUDE.md`
