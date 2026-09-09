-- backlog/084 — a szektor a `climbing_session` szintről az `ascent_attempt` (kísérlet) szintre kerül.
--
-- Egy alkalom (session) gyakran több szektort is érint (pl. Rókahegyen oda-vissza sétálva), ezért a
-- szektor kísérletenként választható. A `crag` session-szintű marad (egy session = egy crag).
--
-- Egyúttal megszűnik a session-szintű `rock_type` és `aspect` felülírás: ezek a szikla / szektor /
-- út törzsadatának tulajdonságai (a szikla helyben marad, a fekvés és a kőzettípus nem
-- session-specifikus), a napló ezután a `route` → `sector` → `crag` láncból származtatja őket
-- megjelenítésre, nem tárol saját másolatot (backlog/084 döntés).
--
-- Migráció:
--   1. `ascent_attempt` kap `sector_id` (valós FK, soft link) + `sector_name` (snapshot) oszlopot;
--   2. a meglévő session-szintű szektor lekerül minden kísérletére (az eddig egy session = egy
--      szektor modell miatt ez veszteségmentes);
--   3. a `climbing_session` négy oszlopa (`sector_id`, `sector_name`, `rock_type`, `aspect`) törlődik
--      — a rájuk vonatkozó `climbing_session_aspect_check` CHECK-et a DROP COLUMN automatikusan viszi.
--
-- A `sync_changes` nézet csak az id / user_id / updated_at / deleted oszlopokat hivatkozza mindkét
-- táblából (V4 / V24 / V31 minta), így a séma-változás nézet-újraépítés nélkül megy. A `BEFORE INSERT
-- OR UPDATE` trigger a 2. lépés UPDATE-jén tüzel, tehát az érintett `ascent_attempt` sorok updated_at-je
-- a migráció idejére áll, és a delta-pull (`GET /api/sync/changes`) egyszer újratölti őket a
-- kliensekre a `sector_id` / `sector_name` mezővel. Ez szándékos: egyszeri, korlátos, konvergens.

ALTER TABLE ascent_attempt ADD COLUMN sector_id   uuid REFERENCES sector (id);
ALTER TABLE ascent_attempt ADD COLUMN sector_name text;

UPDATE ascent_attempt a
SET sector_id   = s.sector_id,
    sector_name = s.sector_name
FROM climbing_session s
WHERE a.session_id = s.id
  AND s.sector_id IS NOT NULL;

ALTER TABLE climbing_session DROP COLUMN sector_id;
ALTER TABLE climbing_session DROP COLUMN sector_name;
ALTER TABLE climbing_session DROP COLUMN rock_type;
ALTER TABLE climbing_session DROP COLUMN aspect;
