---
verifikalva:
verifikalt_commit:
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

- **Tárolás:** device-local (`@capacitor/preferences`), nem syncel más eszközre az első körben — [[Bejelentkezés]].
- A váltás **azonnali**, app-újraindítás nélkül.
- Nincs saját időzített („napnyugtakor sötét") ütemezés: azt az OS adja, és a Rendszer mód átveszi.

#### Kontraszt — kötelező szabályok

A cél nem esztétikai: sötét háttéren fekete szöveg vagy gomb **tilos** (olvashatatlanság / láthatatlanság).

- Szöveg kontraszt **≥ 4.5:1**, nagy szöveg és ikon **≥ 3:1** mindkét palettában (WCAG AA szint).
- A komponensekben **nincs hardcode színérték**: minden szín téma-tokenből jön (`--ion-color-*`, `--ion-text-color`, `--ion-background-color`, saját szemantikus tokenek). Ez az egyetlen mód, hogy a témaváltás ne hagyjon ki komponenst.
- A **szemantikus állapotszínek mindkét palettában külön értéket kapnak**, nem ugyanazt a hexet: a light paletta pirosa / narancsa sötét háttéren nem elég kontrasztos. Érintett helyek: a szinkronizációs státuszjelző szürke / piros állapotai ([[Szinkronizációs központ]], [[Backend-offline first]] §16), az [[Étkezés]] progress bar sárga / zöld / narancs / piros skálája, a listák `_dirty` / `_sync_error` jelölése.
- **A jelentés soha nem áll csak színen** (színvakság): a sync státusz ikonnal is jelöl, a progress bar mellett szöveges állapot van („hátra" / „túllépés") — ez már az érintett specek követelménye, itt csak megerősítjük.

#### Rendszer-chrome

A téma nem áll meg a WebView szélén:

- Status bar szöveg- és háttérstílus a témához igazodik (`@capacitor/status-bar`), különben világos témán olvashatatlan az óra / ikonsáv.
- A splash / app háttérszín is témánként definiált, hogy induláskor ne legyen fehér villanás.
- A téma beállítása az **indulási sorrend** korai lépése, még az első képernyő megjelenése előtt — [[Frontend]] (cold start).

### UI/UX elvárások

- **Belépés:** Menü → Téma (`/tabs/menu/theme`) — [[Frontend]].
- Három rádió opció: Rendszer / Világos / Sötét, i18n szövegekkel ([[Nyelv választás]]).
- A választás azonnal látszik a beállítás képernyőn is (nincs „mentés" gomb).
- **Core feature:** nincs feature flagje, nem kapcsolható ki — [[Frontend]] flag registry.

### Megjegyzések

Az Ionic sötét palettát dokumentált osztály-kapcsolóval aktiváljuk a gyökér elemen (Ionic 8: `ion-palette-dark`); a Rendszer mód ezt a `prefers-color-scheme` változásra állítja / veszi le. A konkrét CSS változó-készlet a `theme/variables.scss`-ben él.

Kontraszt-ellenőrzés a fejlesztés része, nem külön projekt: új komponens akkor kész, ha mindkét palettában megfelel a fenti két aránynak.

### Nyitott kérdések

Nincs nyitott kérdés.

## Architektúra

### Frontend

- `ThemeService` (root, [[Frontend]] `core/config/`): a beállítás signalja, a `prefers-color-scheme` media query figyelése, az osztály-kapcsoló és a status bar stílus beállítása.
- A preferencia betöltése az app init része (téma és nyelv együtt, hálózat nélkül).
- Nincs komponens-szintű téma logika: a komponensek CSS változókat használnak, a service csak a gyökér osztályt állítja.

#### Backend-offline

Preferencia **csak** helyi tárolás, tehát Backend-offline és Full-offline állapotban is azonnal érvényes; nincs hálózati kör és nincs outbox tétel. Nincs profil-sync az első körben ([[Bejelentkezés]] device-local tábla). Lásd [[Backend-offline first]].

### Backend

_Nincs backend érintettség._

### Nyitott kérdések

Nincs nyitott kérdés.
