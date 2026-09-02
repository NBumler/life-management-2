---
verifikalva: 2026-09-02
verifikalt_commit: f9ca94e
---

# Dark&Light mode

## Business

| | |
|---|---|
| **Státusz** | `Kész` |
| **Szülő** | [[Life Management 2.0]] |
| **Kapcsolódó** | [[Frontend]], [[Nyelv választás]], [[Bejelentkezés]], [[Szinkronizációs központ]], [[Étkezés]], [[Backend-offline first]] |

### Jelenlegi működés

Az alkalmazás támogat dark és light témát, és **alapértelmezésben a készülék rendszertémáját követi**. A user ezt felülírhatja fix világos vagy fix sötét témára.

### Funkcionális leírás

#### Három állapot (döntés)

| Beállítás | Viselkedés |
|---|---|
| **Rendszer** (default) | A készülék `prefers-color-scheme` értékét követi, és **élőben** reagál, ha a rendszer futás közben átvált (pl. napnyugta-ütemezés az OS-ben). |
| **Világos** | Fix light téma, a rendszer beállításától függetlenül. |
| **Sötét** | Fix dark téma, a rendszer beállításától függetlenül. |

- **Tárolás:** device-local (`@capacitor/preferences`, `lm2_theme` kulcs), nem syncel más eszközre — [[Bejelentkezés]]; profil-szintű sync tervezett: `backlog/007-profil-szintu-beallitas-sync.md`.
- A váltás **azonnali**, app-újraindítás nélkül. A fix Világos / Sötét felülírja a készülék rendszertémáját (a `ThemeService` az `ion-palette-dark` osztályt állítja a gyökér elemen, és a `global.scss` a `dark.class.css` osztály-stratégiát importálja).
- Nincs saját időzített („napnyugtakor sötét") ütemezés: azt az OS adja, és a Rendszer mód átveszi.

#### Kontraszt — kötelező szabályok

A cél nem esztétikai: sötét háttéren fekete szöveg vagy gomb **tilos** (olvashatatlanság / láthatatlanság).

- Szöveg kontraszt **≥ 4.5:1**, nagy szöveg és ikon **≥ 3:1** mindkét palettában (WCAG AA szint).
- A komponensekben **nincs hardcode színérték**: minden szín téma-tokenből jön (`--ion-color-*`, `--ion-text-color`, `--ion-background-color`, saját szemantikus tokenek). Ez az egyetlen mód, hogy a témaváltás ne hagyjon ki komponenst.
- A **szemantikus állapotszínek mindkét palettában külön értéket kapnak**, nem ugyanazt a hexet: a light paletta pirosa / narancsa sötét háttéren nem elég kontrasztos. Érintett helyek: a szinkronizációs státuszjelző szürke / piros állapotai ([[Szinkronizációs központ]], [[Backend-offline first]] §16), az [[Étkezés]] progress bar sárga / zöld / narancs / piros skálája, a listák `_dirty` / `_sync_error` jelölése. Jelenleg a komponensek nagyrészt az Ionic alap-palettáira támaszkodnak, és nincs központi, `theme/variables.scss`-ben definiált per-paletta szemantikus token-készlet — tervezett: `backlog/017-dark-and-light-kozponti-szemantikus-szin-tokenek-kulon-light-dar.md`.
- **A jelentés soha nem áll csak színen** (színvakság): a sync státusz ikonnal is jelöl, a progress bar mellett szöveges állapot van („hátra" / „túllépés") — ez már az érintett specek követelménye, itt csak megerősítjük.

#### Rendszer-chrome

A téma nem áll meg a WebView szélén:

- Status bar szöveg- és háttérstílus a témához igazodik (`@capacitor/status-bar`), különben világos témán olvashatatlan az óra / ikonsáv.
- A splash / app háttérszín témánkénti definíciója (a fehér villanás elkerülésére) jelenleg **hiányzik** — tervezett: `backlog/016-dark-and-light-temankenti-splash-app-hatterszin-feher-villanas-n.md`.
- A téma beállítása az **indulási sorrend** korai lépése, még az első képernyő megjelenése előtt — [[Frontend]] (cold start).

### UI/UX elvárások

- **Belépés:** Menü → Téma (`/tabs/menu/theme`) — [[Frontend]].
- Három rádió opció: Rendszer / Világos / Sötét, i18n szövegekkel ([[Nyelv választás]]).
- A választás azonnal látszik a beállítás képernyőn is (nincs „mentés" gomb).
- **Core feature:** nincs feature flagje, nem kapcsolható ki — [[Frontend]] flag registry.

### Megjegyzések

Az Ionic sötét palettát dokumentált osztály-kapcsolóval aktiváljuk a gyökér elemen (Ionic 8: `ion-palette-dark`, `global.scss` → `dark.class.css`); a Rendszer mód ezt a `prefers-color-scheme` változásra állítja / veszi le. A `theme/variables.scss` jelenleg gyakorlatilag üres (az Ionic alap-palettákra hagyatkozunk); a saját CSS változó-készlet felvétele tervezett: `backlog/017-dark-and-light-kozponti-szemantikus-szin-tokenek-kulon-light-dar.md`.

A status bar stílust a `ThemeService.apply()` állítja (`StatusBar.setStyle`, csak natív); a háttérszín (`setBackgroundColor`) jelenleg nincs beállítva.

Kontraszt-ellenőrzés a fejlesztés része, nem külön projekt: új komponens akkor kész, ha mindkét palettában megfelel a fenti két aránynak. Automatikus kontraszt-ellenőrzés nincs.

Nincs `ThemeService` unit teszt — tervezett: `backlog/020-hianyzo-teszt-lefedettseg-themeservice-unit-teszt-admin-jelszocs.md`.

### Nyitott kérdések

Nincs nyitott kérdés.

## Architektúra

### Frontend

- `ThemeService` (root, [[Frontend]] `core/config/`): a beállítás signalja, a `prefers-color-scheme` media query figyelése, az osztály-kapcsoló és a status bar stílus beállítása.
- A preferencia betöltése az app init része (téma és nyelv együtt, hálózat nélkül).
- Nincs komponens-szintű téma logika: a komponensek CSS változókat használnak, a service csak a gyökér osztályt állítja.

#### Backend-offline

Preferencia **csak** helyi tárolás, tehát Backend-offline és Full-offline állapotban is azonnal érvényes; nincs hálózati kör és nincs outbox tétel. Nincs profil-sync ([[Bejelentkezés]] device-local tábla; tervezett: `backlog/007-profil-szintu-beallitas-sync.md`). Lásd [[Backend-offline first]].

### Backend

_Nincs backend érintettség._

### Nyitott kérdések

Nincs nyitott kérdés.
