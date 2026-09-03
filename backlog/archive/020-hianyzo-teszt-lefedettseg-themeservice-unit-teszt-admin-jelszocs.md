---
id: 20
type: chore
status: done
title: Hianyzo teszt-lefedettseg: ThemeService unit teszt + admin-jelszocsere token-revoke teszt
specs:
  - "[[Dark&Light mode]]"
  - "[[Bejelentkezés]]"
flag:
created: 2026-09-02
closed: 2026-09-03
---

# 20 — Hianyzo teszt-lefedettseg: ThemeService unit teszt + admin-jelszocsere token-revoke teszt

## Motiváció / probléma

Nincs theme.service.spec.ts core statusz mellett; AdminUserService.setPassword revokalja az osszes refresh tokent, de nincs ra teszt. (A LanguageService fallback-tesztje a 2c09d70 commitban elkeszult.)

Forrás: dokumentáció ↔ implementáció audit (2026-09-02), lásd `backlog/audit/`.

## Jelenlegi működés

**`theme.service.spec.ts`** (8 eset): `init()` alap / tárolt explicit mód visszaállítása / korrupt tárolt
érték ignorálása; `setMode` explicit dark ill. light felülírja az eszköz-témát és perzisztál; a
`system` mód követi a `prefers-color-scheme`-et és **élőben** reagál a media query `change`
eseményére. A media-match állapotot a `ThemeService` egy `systemDark` signalban tükrözi, így az
`isDark` computed a rendszer futás közbeni váltására is újraszámol.

**`AuthAndProfileFlowTests.adminPasswordChange_revokesEverySession_thenNewPasswordWorks`**:
két eszközről bejelentkezve, `PUT /api/admin/users/{username}/password` után **mindkét** eszköz
refresh tokene `401`-et kap a `refresh`-en, a régi jelszós login is `401`, az új jelszóval a login
sikeres.

## Elfogadási kritériumok

- [x] Az érintett spec(ek) `### Jelenlegi működés` szakasza a leszállított viselkedést írja le.
      ([[Dark&Light mode]] — `Megjegyzések`-ből törölt „nincs unit teszt" mondat, Architektúra →
      Frontend a `systemDark` mechanizmussal + teszt-hivatkozással; [[Bejelentkezés]] — Admin curl
      jelszócsere szakasz a teszt-hivatkozással.)
- [x] Ha „Nem scope” blokkból jött: n/a — teszt-lefedettségi audit-találat.

## Terv / döntési napló

- **A ThemeService-teszt valódi hibát fedett fel.** A `Dark&Light mode.md` explicit „**élőben** reagál"-t
  ír `system` módra, de az `isDark` computed csak a `mode()` signalra frissült; a `media.matches`
  untracked property, így a media `change` handler `apply()`-ja a memoizált (elavult) `isDark()`-ot
  látta → nem váltott témát. **Fix:** `private readonly systemDark = signal(this.media.matches)`, az
  `isDark` ezt olvassa, a `change` listener frissíti. A javítás a #020-ba került (a felhasználó
  jóváhagyásával), külön bug-jegy nélkül — egyszavas, a fedő teszttel együtt.
- **Admin jelszócsere: integrációs teszt** a unit helyett — a `AuthAndProfileFlowTests` már ott
  teszteli a refresh-rotációt és a logout-revoke-ot; a „minden eszköz kiesik" property MockMvc +
  valódi Postgres úton bizonyítható a legjobban, két külön login-nal.

## Lezáráskor (on-done)

- Frissített specek: [[Dark&Light mode]] (Megjegyzések, Architektúra → Frontend), [[Bejelentkezés]] (Admin curl — jelszó csere)
- `IMPLEMENTATION_STATUS.md` sor: 2026-09-03 — #020 ThemeService unit teszt (+ system-mód élő-reakció fix) + admin-jelszócsere token-revoke teszt
- Kód: `frontend` `core/config/theme.service.ts` (+ `theme.service.spec.ts`); `backend` `auth/AuthAndProfileFlowTests` (új teszt)
