# `backlog/` — feladatrendszer

A jövőbeli munka és **minden ismert hiányosság** gyűjtője. Ez játssza azt a szerepet,
amit korábban a `documentation/` vault „célállapot” része: a `documentation/` innentől
a **jelenlegi, implementált állapot** SSOT-ja, a `backlog/` pedig az, ami még nincs meg.

- Jegy-formátum: [`TICKET-TEMPLATE.md`](TICKET-TEMPLATE.md)
- Agent skill: `.cursor/skills/task-ticket/SKILL.md`
- Spec-oldali szabálykönyv: `.cursor/skills/documentation-spec/SKILL.md` + `documentation/SPEC-TEMPLATE.md`

## Mappaszerkezet

```
backlog/
  TICKET-TEMPLATE.md   a kötelező jegy-sablon (a documentation/SPEC-TEMPLATE.md párja)
  README.md            ez a fájl
  NNN-slug.md          aktív jegyek (lapos lista, státusz a frontmatterben)
  archive/             lezárt jegyek (status: done | dropped)
  audit/               a documentation ↔ implementáció audit munkafájljai
```

Lapos lista, nem státusz-almappák: a jegy státusza a frontmatterben van, nem a
helyében. Az egyetlen tényleges fájlmozgatás a lezáráskor `archive/`-ba.

## Mi kerül ide jegyként

1. **Új feature** — a specben még nincs implementált állapotként.
2. **Change request** — meglévő, implementált viselkedés szándékolt megváltoztatása.
3. **Bug** — az implementáció eltér attól, amit a spec jelenlegi állapotként leír.
4. **Minden audit-találat** — amikor a `documentation/` ↔ implementáció auditja
   (`audit/`) `Missing` / `Partial` / jövőbe-mutató spec-állítást talál, ahhoz külön
   jegy készül. A `backlog/` az egyetlen hely, ahol hiányosság rögzül.

## Új jegy létrehozása

1. Nézd meg a legnagyobb meglévő `NNN`-et (`backlog/` + `backlog/archive/`), a
   következő szám lesz az új jegyé.
2. Másold a [`TICKET-TEMPLATE.md`](TICKET-TEMPLATE.md) sablon-blokkját egy új
   `backlog/NNN-slug.md` fájlba.
3. Töltsd ki a frontmattert (`id` = `NNN` szám nélküli nullázással, `type`, `status`,
   `title`, `specs`, `created`).
4. Legalább a `## Motiváció / probléma` és `## Jelenlegi működés` legyen érdemi.

## Állapot-életciklus

`backlog → deferred | ready | dropped`
`deferred → ready | backlog | dropped`
`ready → in-progress | backlog | dropped`
`in-progress → blocked | done | ready`
`blocked → in-progress | dropped`

`done` / `dropped` terminális → a fájl `backlog/archive/`-ba.

## Lezárás — jegy → spec migráció

Amikor egy jegy elkészül, az eredménye visszakerül a `documentation/`-ba:

1. Kód a `master`-en, zöld teszt / lint / build.
2. Minden `specs:` bejegyzésre: a `### Jelenlegi működés` (+ szükség szerint
   `### Funkcionális leírás` / `### UI/UX elvárások`) átírása jelen időben, hogyan
   működik most.
3. `#### Backend-offline` frissítése, ha a változás érintette a mutációkat / outboxot /
   külső API-t / offline fallbacket.
4. A jegy által megoldott „Nem scope” bullet törlése a specből; részleges megoldásnál
   szűkítsd és mutass egy követő jegyre.
5. A spec frontmatterében: `verifikalva:` = ma, `verifikalt_commit:` =
   `git rev-parse --short HEAD`.
6. `git mv backlog/NNN-slug.md backlog/archive/`; a frontmatterben `status: done`
   (vagy `dropped`), `closed:` kitöltve; a `## Lezáráskor` blokk kitöltve.
7. Egy sor az `IMPLEMENTATION_STATUS.md` `## Lezárt jegyek (restructure után)` szakasz
   tetejére: `- <dátum> — <cím> (#<id>) — érintett: [[...]]; kód: <package-ek>`.
8. A spec-szerkesztés + a jegymozgatás + a status-sor **egy commitban** — így a spec
   git-hash-e és a rögzített `verifikalt_commit` egyezik.

## Staleness-ellenőrzés

Minden `documentation/` spec frontmatterében ott a `verifikalt_commit`. Ha a specet
azóta érintő utolsó commit ettől eltér, a spec **re-verifikálandó**:

```bash
test "$(git log -1 --format=%h -- "$spec")" != "$(sed -n 's/^verifikalt_commit: //p' "$spec")"
```
