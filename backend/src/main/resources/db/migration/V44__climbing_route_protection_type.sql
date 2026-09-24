-- backlog/118 — a kültéri kötélút biztosítási típusa (az út állandó jellemzője, nem a kísérleté):
-- BOLTED (nittelt / sport), TRAD, CLEAN, TOPROPE (csak felső biztosítással mászható). Opcionális;
-- a meglévő utak NULL-lal maradnak ("nincs megadva"). A napló út-választáskor ebből tölti elő a
-- kísérlet safetyStyle-ját (kliensoldalon). sync_changes view érintetlen.

ALTER TABLE route
    ADD COLUMN protection_type text
        CHECK (protection_type IS NULL OR protection_type IN ('BOLTED', 'TRAD', 'CLEAN', 'TOPROPE'));
