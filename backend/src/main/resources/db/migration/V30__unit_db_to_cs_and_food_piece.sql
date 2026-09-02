-- backlog/063 — Mértékegység: »darab« (db) → »csomag« (cs) átnevezés + katalógus darab-definíció.
--
-- 1. A `db` quantity-egység mindenütt `cs`-re nevezve. A katalógus fogalmilag csomagokat tárol
--    (ár Ft/csomag, "1 csomag nettó tartalma"), így a `db` félrevezető volt. A `darab` mint
--    kontextuális egység a feature C. fázisában tér vissza, a Food darab-definíción keresztül.
-- 2. A `food` megkapja az opcionális darab-definíció mezőpárt (`piece_amount` + `piece_unit`).
--    Mindkettő NULL → "1 darab = 1 csomag". A mezőket a C. fázis alkalmazás-kódja köti be;
--    itt csak az oszlop jön létre (NULL-ként, így az ADD COLUMN nem bumpolja az updated_at-et).
--
-- documentation/Architektúra/Backend-offline first.md: a `BEFORE INSERT OR UPDATE` trigger a lenti
-- UPDATE-eken tüzel, tehát az érintett sorok updated_at-je a migráció idejére áll, és a delta-pull
-- (`GET /api/sync/changes`) egyszer újratölti őket a kliensekre. Ez szándékos: egyszeri, korlátos,
-- tartalmilag no-op merge (a kliens a saját lokális SQLite-migrációjában már `cs`-re állította),
-- és megőrzi a "szerver-állapot == delta-stream" invariánst külön special-case nélkül.

UPDATE food                SET net_unit      = 'cs' WHERE net_unit      = 'db';
UPDATE recipe_ingredient   SET quantity_unit = 'cs' WHERE quantity_unit = 'db';
UPDATE meal_item           SET quantity_unit = 'cs' WHERE quantity_unit = 'db';
UPDATE stored_food         SET quantity_unit = 'cs' WHERE quantity_unit = 'db';
UPDATE shopping_list_item  SET quantity_unit = 'cs' WHERE quantity_unit = 'db';

-- Darab-definíció: "1 darab = piece_amount piece_unit". piece_unit lehet `cs` (a csomag hányada,
-- pl. 1/6) vagy SI (`g`/`dkg`/`kg`/`ml`/`cl`/`dl`/`l`); a `db` tiltott (körkörös lenne) — ezt az
-- alkalmazás-réteg validálja, nem CHECK constraint. Vagy mindkettő ki van töltve, vagy egyik sem.
ALTER TABLE food ADD COLUMN piece_amount numeric;
ALTER TABLE food ADD COLUMN piece_unit   text;
