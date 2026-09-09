-- backlog/088 — szektor-szintű alapértelmezett úthossz.
--
-- Egy szektorban az utak jellemzően hasonló hosszúak; a `sector.default_length_in_meters` egy
-- opcionális előtöltési érték, amit a köteles napló örököl, ha az adott `route`-on nincs saját
-- `length_in_meters`. Öröklési sorrend: 1. `Route.lengthInMeters` → 2. `Sector.defaultLengthInMeters`
-- → 3. napló kísérlet-szintű kézi felülírás (`lengthAutoFilled` provenance).
--
-- Boulder szektoroknál a mező is létezik (közös `sector` tábla), de a boulder naplónak nincs
-- hossz-fogyasztója. A `sync_changes` view csak id / user_id / updated_at / deleted oszlopokat
-- vetít a `sector`-ből, így a séma-változás nézet-újraépítés nélkül megy.

ALTER TABLE sector
    ADD COLUMN default_length_in_meters double precision
        CHECK (default_length_in_meters IS NULL OR default_length_in_meters > 0);
