-- backlog/156 — the colour band's own `variant` (PLUS / MINUS / NEUTRAL) is dropped: nothing ever read
-- it, and the in-band position is recorded per attempt by `ascent_attempt.band_modifier` (backlog/122).
-- No data to carry over. The local SQLite keeps the column as a dead field (see local-database.service.ts).
ALTER TABLE gym_color_band DROP COLUMN variant;
