-- backlog/077 — Az `AscentAttempt.failure_point` ("hol akadt el") beolvad a `notes` mezőbe.
--
-- Sikertelen kísérletnél eddig két szabadszöveg mező volt (`failure_point` + `notes`); a UI-n
-- egyetlen többsoros jegyzet marad, ami sikernél "Jegyzet", sikertelennél "Hol akadt el? Mi ment /
-- nem ment?" prompttal jelenik meg. A megőrzendő adat: a `failure_point`-ban lévő szöveg a `notes`
-- elé/mögé fűzve.
--
-- Egyesítési szabály (mindkettő kitöltve → `notes` <newline> `failure_point`; csak az egyik →
-- az; egyik sem → marad NULL):
UPDATE ascent_attempt
SET notes = CASE
        WHEN notes IS NOT NULL AND btrim(notes) <> ''
            THEN notes || E'\n' || btrim(failure_point)
        ELSE btrim(failure_point)
    END
WHERE failure_point IS NOT NULL AND btrim(failure_point) <> '';

-- A `sync_changes` nézet csak az id / updated_at / deleted oszlopokat hivatkozza az
-- `ascent_attempt`-ből, így a DROP COLUMN nézet-újraépítés nélkül megy.
ALTER TABLE ascent_attempt DROP COLUMN failure_point;

-- documentation/Architektúra/Backend-offline first.md: a `BEFORE INSERT OR UPDATE` trigger a fenti
-- UPDATE-en tüzel, tehát az érintett sorok updated_at-je a migráció idejére áll, és a delta-pull
-- (`GET /api/sync/changes`) egyszer újratölti őket a kliensekre a `notes`-ba olvasztott szöveggel.
-- Ez szándékos: egyszeri, korlátos, konvergens (row-level last-write-wins).
