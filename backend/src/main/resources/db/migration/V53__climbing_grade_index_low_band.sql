-- backlog/155 — French / Font 3–5 take an optional sub-letter (5A, 4b …), and the Font 3–5 band is
-- re-aligned to the V-Scale (documentation/Subfeatures/Nehézségi szint skálája (konverziós mátrix).md):
-- Font bare 3 / 4 / 5 move from 10 / 12 / 14 to 5 / 8 / 12. The index is client-computed and stored
-- verbatim, so this one-off data migration brings the already stored values in line with the new
-- client matrix. Every UPDATE fires the set_updated_at trigger, so the rows reach devices through
-- the normal delta pull. Only exact single-label grades are touched (no `/` ranges were stored).

-- 1) Font colour bands with a bare 3 / 4 / 5 bound, plus the indoor boulder attempts whose index is
--    still the band-derived snapshot (bandModifierIndex: MINUS → lower, PLUS → upper, else floored
--    mid). An attempt whose snapshot no longer matches its band (band edited later) is left alone.
WITH changed AS (
    SELECT id,
           absolute_difficulty_index_lower AS old_lower,
           absolute_difficulty_index_upper AS old_upper,
           CASE grade_lower WHEN '3' THEN 5 WHEN '4' THEN 8 WHEN '5' THEN 12
                ELSE absolute_difficulty_index_lower END AS new_lower,
           CASE grade_upper WHEN '3' THEN 5 WHEN '4' THEN 8 WHEN '5' THEN 12
                ELSE absolute_difficulty_index_upper END AS new_upper
    FROM gym_color_band
    WHERE grade_lower IN ('3', '4', '5') OR grade_upper IN ('3', '4', '5')
),
attempts AS (
    UPDATE ascent_attempt a
    SET absolute_difficulty_index = CASE a.band_modifier
            WHEN 'MINUS' THEN c.new_lower
            WHEN 'PLUS' THEN c.new_upper
            ELSE (c.new_lower + c.new_upper) / 2 END
    FROM changed c
    WHERE a.color_band_id = c.id
      AND a.absolute_difficulty_index = CASE a.band_modifier
            WHEN 'MINUS' THEN c.old_lower
            WHEN 'PLUS' THEN c.old_upper
            ELSE (c.old_lower + c.old_upper) / 2 END
    RETURNING a.id
)
UPDATE gym_color_band b
SET absolute_difficulty_index_lower = c.new_lower,
    absolute_difficulty_index_upper = c.new_upper
FROM changed c
WHERE b.id = c.id;

-- 2) Boulder indoor routes and typed boulder attempts with a bare Font 3 / 4 / 5 grade.
UPDATE indoor_route
SET absolute_difficulty_index = CASE grade WHEN '3' THEN 5 WHEN '4' THEN 8 ELSE 12 END
WHERE discipline = 'BOULDER' AND grade IN ('3', '4', '5');

UPDATE ascent_attempt a
SET absolute_difficulty_index = CASE a.user_raw_input WHEN '3' THEN 5 WHEN '4' THEN 8 ELSE 12 END
FROM climbing_session s
WHERE s.id = a.session_id
  AND s.discipline = 'BOULDER'
  AND a.color_band_id IS NULL
  AND a.user_raw_input IN ('3', '4', '5')
  AND a.absolute_difficulty_index = CASE a.user_raw_input WHEN '3' THEN 10 WHEN '4' THEN 12 ELSE 14 END;

-- 3) Backfill: rope attempts saved with a French sub-letter grade the old matrix did not know
--    (3a … 4c+, 5a+ / 5b+ / 5c+) have a NULL index; give them the new matrix value.
WITH french (label, idx) AS (
    VALUES ('3a', 1), ('3a+', 1), ('3b', 2), ('3b+', 3), ('3c', 3), ('3c+', 4),
           ('4a', 5), ('4a+', 5), ('4b', 6), ('4b+', 7), ('4c', 8), ('4c+', 8),
           ('5a+', 10), ('5b+', 11), ('5c+', 13)
)
UPDATE ascent_attempt a
SET absolute_difficulty_index = f.idx
FROM climbing_session s, french f
WHERE s.id = a.session_id
  AND s.discipline = 'ROPE'
  AND a.absolute_difficulty_index IS NULL
  AND lower(trim(a.user_raw_input)) = f.label;

UPDATE pitch_log p
SET absolute_difficulty_index = f.idx
FROM (VALUES ('3a', 1), ('3a+', 1), ('3b', 2), ('3b+', 3), ('3c', 3), ('3c+', 4),
             ('4a', 5), ('4a+', 5), ('4b', 6), ('4b+', 7), ('4c', 8), ('4c+', 8),
             ('5a+', 10), ('5b+', 11), ('5c+', 13)) AS f (label, idx)
WHERE p.absolute_difficulty_index IS NULL
  AND lower(trim(p.raw_grade)) = f.label;
