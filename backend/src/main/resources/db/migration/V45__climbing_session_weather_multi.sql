-- backlog/119 — a mászó session időjárása többértékű lesz: egy session alatt változhatnak a
-- körülmények (meleg volt, aztán lehűlt; száraz volt, aztán eleredt), ezért bármely kombináció —
-- egymásnak ellentmondó címkék is — egyszerre rögzíthető. Az összevont skalár értékek (COLD_DRY,
-- HOT_HUMID) atomi címkékre bomlanak: HOT, MILD, COLD, DRY, HUMID, WINDY, RAIN, WET_ROCK, SUNNY, SHADE.
-- Üres tömb = nincs megadva. Meglévő adatok: COLD_DRY → {COLD,DRY}, HOT_HUMID → {HOT,HUMID},
-- WINDY → {WINDY}, WET → {RAIN} (döntés: az eső, nem a vizes szikla), NULL → {}.
-- sync_changes view érintetlen (csak id / user_id / updated_at / deleted oszlopokat vetít).

ALTER TABLE climbing_session DROP CONSTRAINT climbing_session_weather_conditions_check;

ALTER TABLE climbing_session
    ALTER COLUMN weather_conditions TYPE text[] USING (
        CASE weather_conditions
            WHEN 'COLD_DRY' THEN ARRAY['COLD', 'DRY']
            WHEN 'HOT_HUMID' THEN ARRAY['HOT', 'HUMID']
            WHEN 'WINDY' THEN ARRAY['WINDY']
            WHEN 'WET' THEN ARRAY['RAIN']
            ELSE ARRAY[]::text[]
        END
    );

ALTER TABLE climbing_session ALTER COLUMN weather_conditions SET DEFAULT ARRAY[]::text[];
ALTER TABLE climbing_session ALTER COLUMN weather_conditions SET NOT NULL;

ALTER TABLE climbing_session
    ADD CONSTRAINT climbing_session_weather_conditions_check CHECK (
        weather_conditions <@ ARRAY['HOT', 'MILD', 'COLD', 'DRY', 'HUMID', 'WINDY', 'RAIN', 'WET_ROCK', 'SUNNY', 'SHADE']::text[]
    );
