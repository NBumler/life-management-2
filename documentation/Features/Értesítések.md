# Értesítések

## Business

| | |
|---|---|
| **Státusz** | `Váz` |
| **Szülő** | [[Life Management 2.0]] |
| **Kapcsolódó** | [[Élelmiszer tárolás]], [[Rendszeres kiadások]], [[Tennivalók]], [[Események]], [[Lépésszám követés]], [[Kalóriakalkulátor]] |

### Célállapot

Telefonos (push / lokális) értesítések küldése fontos eseményekről / küszöbökről.

### Funkcionális leírás

Értesítés, ha:

- [[Élelmiszer tárolás]] alapján egy élelmiszer meg fog romlani
- [[Rendszeres kiadások]] következő fizetése közeledik
- [[Tennivalók]] időpontja közeledik
- [[Események]] időpontja közeledik
- Az adott napon a [[Lépésszám követés]] alapján 20 órakor kevesebb mint 2000 lépés történt
- Egymást követő 5 napon át minden nap a kalória céltól több mint 750 kcal-lal eltérés van

### UI/UX elvárások

_Nincs UI/UX érintettség._

### Megjegyzések

_Nincs megjegyzés._

### Nyitott kérdések

- Értesítés beállítások / kikapcsolás feature-önként
- Lead time (hány órával / nappal előtte)

## Architektúra

### Frontend

Lokális / push értesítések (Capacitor) — plugin TBD ([[Frontend]] nyitott kérdések).

### Backend

_Nincs backend érintettség._ (ha szerveroldali push kell, később; jelenleg kliensoldali triggerelés feltételezett)

### Nyitott kérdések

- Lokális vs remote push döntés
