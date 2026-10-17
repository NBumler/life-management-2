---
id: 161
type: change-request
status: ready
title: Android build — Groovy space-assignment deprecation (Gradle 10) az app/build.gradle-ben
specs:
  - "[[Fejlesztői környezet]]"
flag:
created: 2026-10-17
closed:
---

# 161 — Android build — Groovy space-assignment deprecation (Gradle 10) az app/build.gradle-ben

## Motiváció / probléma

`./gradlew assembleDebug --warning-mode all` (az `install-android.ps1` által futtatott build):

```
Build file '…\frontend\android\app\build.gradle': line 30
Properties should be assigned using the 'propName = value' syntax. … This is scheduled to be
removed in Gradle 10.0. Use assignment ('coreLibraryDesugaringEnabled = <value>') instead.
```

Gradle 10-re frissítéskor ez buildhiba lesz.

## Jelenlegi működés

`frontend/android/app/build.gradle:30` — `coreLibraryDesugaringEnabled true` (saját,
a Health Connect miatt hozzáadott sor). A fájl többi `propName value` sora (`applicationId`,
`versionCode`, `minifyEnabled` …) a Capacitor-sablonból jön; ezekre a Gradle ma nem jelez,
de ugyanaz a szintaxis.

## Elfogadási kritériumok

- [ ] `coreLibraryDesugaringEnabled = true`; a fájl többi property-beállítása is `=`
      szintaxisra hozva, ahol a DSL engedi.
- [ ] `assembleDebug --warning-mode all` nem jelez deprecation-t az `app/build.gradle`-re.
- [ ] Debug APK telepíthető, Health Connect lépésolvasás működik (desugaring él).

## Terv / döntési napló

Tudatosan **nem** része a jegynek (nem saját kód; `cap sync` / npm-frissítés felülírná):

- `WARNING: Using flatDir should be avoided` ×2 — Capacitor-sablon (`app/build.gradle`
  `repositories.flatDir` + a generált `capacitor-cordova-android-plugins/build.gradle`).
- Plugin-fordítási warningok a `node_modules` alól: `@capacitor/filesystem`
  (`downloadFile` deprecated, Kotlin type mismatch), `@capacitor-mlkit/barcode-scanning`
  (deprecated API), `@capacitor-community/sqlite` / `capacitor-android` (unchecked) —
  upstream, plugin-frissítéskor tűnhetnek el.

## Lezáráskor (on-done)

- Frissített specek: — (nincs viselkedésváltozás)
- `IMPLEMENTATION_STATUS.md` sor: …
- Kód: `frontend/android/app/build.gradle`
