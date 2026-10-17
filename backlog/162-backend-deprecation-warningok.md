---
id: 162
type: change-request
status: backlog
title: Backend fordítási deprecation warningok (Jackson converter removal, @Nullable a generált kódban)
specs:
  - "[[Backend]]"
flag:
created: 2026-10-17
closed:
---

# 162 — Backend fordítási deprecation warningok (Jackson converter removal, @Nullable a generált kódban)

## Motiváció / probléma

`./gradlew clean build` (Spring Boot 4) javac-kimenete:

1. **`[removal]`, saját kód** — `common/JacksonConfig.java:45-46`:
   `WebMvcConfigurer.extendMessageConverters(List)` és `MappingJackson2HttpMessageConverter`
   „deprecated and marked for removal”. Egy későbbi Spring Framework verzióban fordítási hiba lesz.
2. **`[deprecation]`, teszt** — `QuantityConverterTest.java:81`: `JsonNode.fields()` deprecated.
3. **`[deprecation]` ×~100, generált kód** (csak `-Xlint:all`-lal látszik) — az
   openapi-generator `spring` kimenete `org.springframework.lang.Nullable`-t használ, ami
   Framework 7-ben deprecated (JSpecify `org.jspecify.annotations.Nullable` a csere).

## Jelenlegi működés

A `JacksonConfig` a generált modellekhez saját `ObjectMapper`-es Jackson 2 convertert tesz
a lista elejére (`FAIL_ON_UNKNOWN_PROPERTIES` kikapcsolva — outbox payload-kompatibilitás,
ld. a fájl kommentje). A build zöld, csak warningok.

## Elfogadási kritériumok

- [ ] `JacksonConfig` átállítva a Framework 7 által ajánlott converter-konfigurációra
      (`configureMessageConverters` / `HttpMessageConverters` builder, ill. Jackson 3
      converter, ha a generált modellek már kompatibilisek) — a
      `FAIL_ON_UNKNOWN_PROPERTIES=false` viselkedés megőrizve, teszttel lefedve.
- [ ] `QuantityConverterTest` a nem deprecated `JsonNode` API-ra (`properties()`) átírva.
- [ ] Generált `@Nullable`: megvizsgálni, van-e openapi-generator 7.x opció JSpecify-ra
      (kapcsolódik: [[008-openapi-generator-spring-boot-4-kimenet-ellenorzes]]); ha nincs,
      a generált forrásra a deprecation-lint tudatos elnémítása, indoklással.
- [ ] `./gradlew clean build` kimenetében nincs `warning: [removal]` és nincs
      `uses or overrides a deprecated API` note saját forrásra.

## Terv / döntési napló

Nem kód-hiba zaj a build logban (nem kell javítani): openapi-generator donate-banner,
`[openApiGenerate] Worker isolation` info, `OpenJDK … Sharing is only supported for boot
loader classes` (Mockito/byte-buddy agent a teszt-JVM-ben).

## Lezáráskor (on-done)

- Frissített specek: [[Backend]] — ha a JSON-konfiguráció leírása érintett
- `IMPLEMENTATION_STATUS.md` sor: …
- Kód: `backend/src/main/java/hu/bumler/lm2/common/JacksonConfig.java`, `QuantityConverterTest.java`, `build.gradle.kts`
