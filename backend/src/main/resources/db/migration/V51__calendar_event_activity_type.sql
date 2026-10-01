-- backlog/143 — tervezett mászás: a CalendarEvent opcionális típust kap (egyelőre csak CLIMBING;
-- NULL = általános esemény). A Heti terv terhelés / figyelmeztetés / rotáció előre is számol vele.
-- Additív, nullable; a meglévő sorok migráció nélkül érvényesek. sync_changes view érintetlen.

ALTER TABLE calendar_event
    ADD COLUMN activity_type text CHECK (activity_type IS NULL OR activity_type IN ('CLIMBING'));
