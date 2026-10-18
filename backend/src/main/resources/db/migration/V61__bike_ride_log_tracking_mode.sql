-- backlog/150 — bike live GPS tracker: a bike_ride_log row now records how it was captured
-- (trackingMode) and, for a LIVE/ESTIMATED session, its wall-clock start (startedAt). A pre-#150
-- row has neither — defaults to MANUAL with no startedAt, matching the manual date + durationMinutes
-- entry it already was.

ALTER TABLE bike_ride_log
    ADD COLUMN tracking_mode text NOT NULL DEFAULT 'MANUAL'
        CHECK (tracking_mode IN ('MANUAL', 'LIVE', 'ESTIMATED')),
    ADD COLUMN started_at timestamptz;
