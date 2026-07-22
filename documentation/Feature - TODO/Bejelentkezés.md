# Bejelentkezés

> **Státusz:** TODO — a specifikáció még nincs kidolgozva.

**Kapcsolódó:** [[Backend]], [[Profile]]

## Célállapot

Felhasználói autentikáció, hogy a személyes adatok biztonságosan, felhasználónként elkülönítve tárolódjanak (multi-user felkészülés).

## Nyitott kérdések

- Auth módszer (email+jelszó, OAuth, magic link, stb.)
- Session / token kezelés (JWT?)
- Offline: korábban bejelentkezett user helyi adatai elérhetőek-e token lejárat után
- Regisztráció vs meghívás / single-user indulás
