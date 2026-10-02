---
id: 146
type: bug
status: backlog
title: "Ismeretlen API-útvonal: 500 INTERNAL_ERROR helyett 404 NOT_FOUND"
specs:
  - "[[Backend]]"
flag:
created: 2026-10-02
closed:
---

# 146 — Ismeretlen API-útvonalra 500 jön 404 helyett

## Motiváció / probléma

A #143 utáni demóban egy elgépelt útvonal (`GET /api/climbing-sessions` a helyes
`/api/climbing/sessions` helyett) **500** `{"code":"INTERNAL_ERROR","message":"Unexpected error"}`
választ adott, a backend logban `ERROR ... GlobalExceptionHandler : Unhandled exception` +
stack trace:

```
org.springframework.web.servlet.resource.NoResourceFoundException: No static resource api/climbing-sessions for request '/api/climbing-sessions'.
```

A `GlobalExceptionHandler` catch-all `@ExceptionHandler(Exception.class)` ága elkapja a Spring
`NoResourceFoundException`-t (és várhatóan a `HttpRequestMethodNotSupportedException` /
`HttpMediaTypeNotSupportedException` / `MissingServletRequestParameterException` stb. családot is),
így ezekből 500 lesz és ERROR-szintű zaj a logban. Kliens oldalon az 5xx a sync taxonómiában
**újrapróbálandó** hiba (5× retry, majd `ERROR`), a 404 viszont nem — egy hibás URL-ű outbox elem
így feleslegesen újrapróbálkozik.

## Jelenlegi működés

[[Backend]] „Global error shape”: `{ code, message, field?, conflictingId? }` egy
`@RestControllerAdvice`-ből; a nem kezelt kivétel → 500 `INTERNAL_ERROR`.

## Elfogadási kritériumok

- [ ] Nem létező útvonal → `404` + stabil `code` (pl. `NOT_FOUND`), ERROR-szintű stack trace nélkül
      (legfeljebb DEBUG / WARN egy sor).
- [ ] A Spring MVC kliens-hibák a megfelelő 4xx-et adják ugyanabban a hibaformában: nem támogatott
      metódus → `405`, nem támogatott content-type → `415`, hiányzó kötelező query paraméter /
      típushibás path változó → `400` `VALIDATION`.
- [ ] Integrációs teszt az ismeretlen útvonalra és legalább a 405-re.
- [ ] [[Backend]] hibaforma-szakasza kiegészítve a fenti kódokkal.

## Terv / döntési napló

_Lehetőség: a handler a `ResponseEntityExceptionHandler`-ből származik (a Spring MVC kivételek
státuszát átveszi), vagy explicit `@ExceptionHandler(NoResourceFoundException.class)` és társai._

## Lezáráskor (on-done)

- Frissített specek: [[Backend]]
- `IMPLEMENTATION_STATUS.md` sor
