-- backlog/122 — élő mászó session (Start / Session vége / összegző): a session kezdő és záró
-- időpontja (NULL = utólag rögzített session), valamint beltéri bouldernél a kísérlet színsávon
-- belüli módosítója (− / semleges / +, NULL = nincs rögzítve). Mindkettő additív, nullable. A
-- "folyamatban lévő" draft soha nem kerül ide — csak a jóváhagyott session. sync_changes view érintetlen.

ALTER TABLE climbing_session
    ADD COLUMN started_at timestamptz,
    ADD COLUMN ended_at   timestamptz,
    ADD CONSTRAINT climbing_session_live_times_check CHECK (started_at IS NULL OR ended_at IS NULL OR ended_at >= started_at);

ALTER TABLE ascent_attempt
    ADD COLUMN band_modifier text CHECK (band_modifier IS NULL OR band_modifier IN ('MINUS', 'NEUTRAL', 'PLUS'));
