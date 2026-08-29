-- documentation/Features/Mászónapló.md + the four kontextus-napló subfeatures — one logged climbing
-- session with its ascent attempts and (outdoor multi-pitch only) pitch logs. Nested aggregate, three
-- levels deep like workout_session: climbing_session → ascent_attempt → pitch_log, saved/read as one
-- tree (documentation/Architektúra/Backend.md "Nested aggregate PUT"). User-owned like workout_session;
-- the two child tables carry no user_id of their own (ownership flows through session_id). No
-- server-side kcal / volume: the day's activityExtraKcal is a pure client calculation
-- (documentation/Features/Tápérték kalkulátor.md), the session stores no calculatedCalories field.
--
-- One flat table, not a polymorphic hierarchy: locationType + discipline are discriminator columns and
-- the context-specific fields (gym vs crag/sector refs, weather, rockType/aspect, safetyStyle, pitches)
-- are all nullable — which combination applies to which context is enforced client-side (szerver
-- oldalon laza, same as workout_session / workout_set_entry).

CREATE TABLE climbing_session (
    id                             uuid PRIMARY KEY,
    user_id                        uuid NOT NULL REFERENCES users (id),
    -- calendar date in the client's TZ; drives the aznapi activityExtraKcal sum. Több session / nap OK.
    session_date                   date NOT NULL,
    location_type                  text NOT NULL CHECK (location_type IN ('INDOOR', 'OUTDOOR')),
    discipline                     text NOT NULL CHECK (discipline IN ('BOULDER', 'ROPE')),
    total_session_duration_minutes integer CHECK (total_session_duration_minutes IS NULL OR total_session_duration_minutes > 0),
    pump_rating                    integer CHECK (pump_rating IS NULL OR pump_rating BETWEEN 1 AND 5),
    headspace_rating               integer CHECK (headspace_rating IS NULL OR headspace_rating BETWEEN 1 AND 5),
    notes                          text,
    climbing_partners              text[],
    -- outdoor only (documentation/Features/Mászónapló.md); the illustrative "…" in the spec table is
    -- pinned to the four named values here — a later context slice needing more is a spec-driven ALTER.
    weather_conditions             text CHECK (weather_conditions IS NULL OR weather_conditions IN ('COLD_DRY', 'HOT_HUMID', 'WINDY', 'WET')),
    -- indoor context: → gym (V22). Real FK, soft link only — gym_name is the snapshot the napló renders
    -- even after the master gym is soft-deleted (same as workout_exercise_entry.exercise_id).
    gym_id                         uuid REFERENCES gym (id),
    gym_name                       text,
    -- outdoor context: → crag / sector (V23), + snapshot names.
    crag_id                        uuid REFERENCES crag (id),
    crag_name                      text,
    sector_id                      uuid REFERENCES sector (id),
    sector_name                    text,
    -- outdoor: one rock type per session (Crag default, overridable here — no attempt-level field);
    -- aspect inherited from Sector. Free-text, matching the V23 master columns.
    rock_type                      text,
    aspect                         text,
    created_at                     timestamptz NOT NULL DEFAULT now(),
    updated_at                     timestamptz NOT NULL DEFAULT now(),
    deleted                        boolean NOT NULL DEFAULT false,
    deleted_at                     timestamptz
);

-- documentation/Architektúra/Backend.md "Indexek": delta pull filter, scoped per user.
CREATE INDEX idx_climbing_session_user_id_updated_at ON climbing_session (user_id, updated_at);
-- Mászó statisztikák (M8): aznapi / grade-piramis lookups by date window.
CREATE INDEX idx_climbing_session_user_id_session_date ON climbing_session (user_id, session_date);

CREATE TRIGGER climbing_session_set_updated_at
    BEFORE INSERT OR UPDATE ON climbing_session
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();

-- documentation/Features/Mászónapló.md "Entitás — AscentAttempt": one logged attempt on a problem /
-- route. deleted is ONLY for the parent session's cascade soft-delete and the nested-PUT tree diff
-- (an attempt dropped from the incoming attempts[] is set deleted = true server-side, not flagged by
-- the client). The colorBand / route / boulderProblem refs are real nullable FKs but soft links —
-- the *_name / color_* / grade_range snapshot columns are what the napló renders.
CREATE TABLE ascent_attempt (
    id                        uuid PRIMARY KEY,
    session_id                uuid NOT NULL REFERENCES climbing_session (id),
    is_success                boolean NOT NULL,
    -- raw grade text the user typed; the napló parses it, the server stores it verbatim.
    user_raw_input            text,
    -- resolved matrix index (documentation/Subfeatures/Nehézségi szint skálája (konverziós mátrix).md);
    -- the client computes it, the server never recomputes.
    absolute_difficulty_index integer,
    ascent_style              text CHECK (ascent_style IS NULL OR ascent_style IN ('ONSIGHT', 'FLASH', 'REDPOINT')),
    -- rope only (indoor hides TRAD client-side); null for boulder.
    safety_style              text CHECK (safety_style IS NULL OR safety_style IN ('TOPROPE', 'LEAD', 'TRAD')),
    failure_point             text,
    -- próbák száma az adott mászáson / úton, kontextustól függetlenül; stats only, NOT the duration fallback.
    attempt_count             integer CHECK (attempt_count IS NULL OR attempt_count >= 1),
    color_band_id             uuid REFERENCES gym_color_band (id),
    color_name                text,
    hex_color                 text,
    grade_range               text,
    indoor_route_id           uuid REFERENCES indoor_route (id),
    route_id                  uuid REFERENCES route (id),
    boulder_problem_id        uuid REFERENCES boulder_problem (id),
    route_name                text,
    -- rope: attempt length; default from route / gym wall height, resolved client-side.
    length_in_meters          double precision CHECK (length_in_meters IS NULL OR length_in_meters > 0),
    notes                     text,
    order_index               integer NOT NULL,
    created_at                timestamptz NOT NULL DEFAULT now(),
    updated_at                timestamptz NOT NULL DEFAULT now(),
    deleted                   boolean NOT NULL DEFAULT false,
    deleted_at                timestamptz
);

CREATE INDEX idx_ascent_attempt_session_id ON ascent_attempt (session_id);
CREATE INDEX idx_ascent_attempt_updated_at ON ascent_attempt (updated_at);

CREATE TRIGGER ascent_attempt_set_updated_at
    BEFORE INSERT OR UPDATE ON ascent_attempt
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();

-- documentation/Subfeatures/Outdoor köteles napló.md "PitchLog": optional per-pitch breakdown for an
-- outdoor multi-pitch attempt. is_lead = false marks a following climber (aktív MET ×0.8 a
-- kalóriában). Own sync entity, cascade soft only — never a standalone REST resource.
CREATE TABLE pitch_log (
    id                        uuid PRIMARY KEY,
    attempt_id                uuid NOT NULL REFERENCES ascent_attempt (id),
    pitch_number              integer NOT NULL CHECK (pitch_number >= 1),
    is_lead                   boolean NOT NULL,
    raw_grade                 text,
    absolute_difficulty_index integer,
    length_in_meters          double precision CHECK (length_in_meters IS NULL OR length_in_meters > 0),
    order_index               integer NOT NULL,
    created_at                timestamptz NOT NULL DEFAULT now(),
    updated_at                timestamptz NOT NULL DEFAULT now(),
    deleted                   boolean NOT NULL DEFAULT false,
    deleted_at                timestamptz
);

CREATE INDEX idx_pitch_log_attempt_id ON pitch_log (attempt_id);
CREATE INDEX idx_pitch_log_updated_at ON pitch_log (updated_at);

CREATE TRIGGER pitch_log_set_updated_at
    BEFORE INSERT OR UPDATE ON pitch_log
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();

-- documentation/Architektúra/Backend.md "GET /api/sync/changes": every synced table must appear here,
-- so the view is fully replaced (V4 comment: a forgotten table silently drops out of sync). The two
-- climbing child tables have no user_id — each arm joins back up to climbing_session for the owner.
CREATE OR REPLACE VIEW sync_changes AS
    SELECT 'UserProfile' AS entity_type, id, user_id, updated_at, deleted FROM user_profile
    UNION ALL
    SELECT 'WeightHistoryEntry' AS entity_type, id, user_id, updated_at, deleted FROM weight_history_entry
    UNION ALL
    SELECT 'GearItem' AS entity_type, id, user_id, updated_at, deleted FROM gear_item
    UNION ALL
    SELECT 'PackingTemplate' AS entity_type, id, user_id, updated_at, deleted FROM packing_template
    UNION ALL
    SELECT 'PackingTemplateItem' AS entity_type, id, user_id, updated_at, deleted FROM packing_template_item
    UNION ALL
    SELECT 'PackingSession' AS entity_type, id, user_id, updated_at, deleted FROM packing_session
    UNION ALL
    SELECT 'PackingSessionItem' AS entity_type, id, user_id, updated_at, deleted FROM packing_session_item
    UNION ALL
    SELECT 'LifePlan' AS entity_type, id, user_id, updated_at, deleted FROM life_plan
    UNION ALL
    SELECT 'HouseholdRoom' AS entity_type, id, user_id, updated_at, deleted FROM household_room
    UNION ALL
    SELECT 'HouseholdTask' AS entity_type, id, user_id, updated_at, deleted FROM household_task
    UNION ALL
    SELECT 'CalendarEvent' AS entity_type, id, user_id, updated_at, deleted FROM calendar_event
    UNION ALL
    SELECT 'Food' AS entity_type, id, NULL::uuid AS user_id, updated_at, deleted FROM food
    UNION ALL
    SELECT 'StoredFood' AS entity_type, id, user_id, updated_at, deleted FROM stored_food
    UNION ALL
    SELECT 'Recipe' AS entity_type, id, NULL::uuid AS user_id, updated_at, deleted FROM recipe
    UNION ALL
    SELECT 'RecipeIngredient' AS entity_type, id, NULL::uuid AS user_id, updated_at, deleted FROM recipe_ingredient
    UNION ALL
    SELECT 'Meal' AS entity_type, id, user_id, updated_at, deleted FROM meal
    UNION ALL
    SELECT 'MealItem' AS entity_type, mi.id, m.user_id, mi.updated_at, mi.deleted FROM meal_item mi JOIN meal m ON mi.meal_id = m.id
    UNION ALL
    SELECT 'ShoppingList' AS entity_type, id, user_id, updated_at, deleted FROM shopping_list
    UNION ALL
    SELECT 'ShoppingListItem' AS entity_type, sli.id, sl.user_id, sli.updated_at, sli.deleted FROM shopping_list_item sli JOIN shopping_list sl ON sli.shopping_list_id = sl.id
    UNION ALL
    SELECT 'Exercise' AS entity_type, id, user_id, updated_at, deleted FROM exercise_catalog
    UNION ALL
    SELECT 'WorkoutSession' AS entity_type, id, user_id, updated_at, deleted FROM workout_session
    UNION ALL
    SELECT 'WorkoutExerciseEntry' AS entity_type, wee.id, ws.user_id, wee.updated_at, wee.deleted
        FROM workout_exercise_entry wee JOIN workout_session ws ON wee.session_id = ws.id
    UNION ALL
    SELECT 'WorkoutSetEntry' AS entity_type, wse.id, ws.user_id, wse.updated_at, wse.deleted
        FROM workout_set_entry wse
        JOIN workout_exercise_entry wee ON wse.exercise_entry_id = wee.id
        JOIN workout_session ws ON wee.session_id = ws.id
    UNION ALL
    SELECT 'WorkoutPlan' AS entity_type, id, user_id, updated_at, deleted FROM workout_plan
    UNION ALL
    SELECT 'WorkoutPlanExercise' AS entity_type, wpe.id, wp.user_id, wpe.updated_at, wpe.deleted
        FROM workout_plan_exercise wpe JOIN workout_plan wp ON wpe.plan_id = wp.id
    UNION ALL
    SELECT 'WorkoutPlanSet' AS entity_type, wps.id, wp.user_id, wps.updated_at, wps.deleted
        FROM workout_plan_set wps
        JOIN workout_plan_exercise wpe ON wps.plan_exercise_id = wpe.id
        JOIN workout_plan wp ON wpe.plan_id = wp.id
    UNION ALL
    SELECT 'WeeklyPlan' AS entity_type, id, user_id, updated_at, deleted FROM weekly_plan
    UNION ALL
    SELECT 'WeeklyPlanSlot' AS entity_type, wps.id, wp.user_id, wps.updated_at, wps.deleted
        FROM weekly_plan_slot wps JOIN weekly_plan wp ON wps.weekly_plan_id = wp.id
    UNION ALL
    SELECT 'SwimLog' AS entity_type, id, user_id, updated_at, deleted FROM swim_log
    UNION ALL
    SELECT 'BikeRideLog' AS entity_type, id, user_id, updated_at, deleted FROM bike_ride_log
    UNION ALL
    SELECT 'Gym' AS entity_type, id, user_id, updated_at, deleted FROM gym
    UNION ALL
    SELECT 'GymColorBand' AS entity_type, id, user_id, updated_at, deleted FROM gym_color_band
    UNION ALL
    SELECT 'IndoorRoute' AS entity_type, id, user_id, updated_at, deleted FROM indoor_route
    UNION ALL
    SELECT 'Crag' AS entity_type, id, user_id, updated_at, deleted FROM crag
    UNION ALL
    SELECT 'Sector' AS entity_type, id, user_id, updated_at, deleted FROM sector
    UNION ALL
    SELECT 'Route' AS entity_type, id, user_id, updated_at, deleted FROM route
    UNION ALL
    SELECT 'BoulderProblem' AS entity_type, id, user_id, updated_at, deleted FROM boulder_problem
    UNION ALL
    SELECT 'ClimbingSession' AS entity_type, id, user_id, updated_at, deleted FROM climbing_session
    UNION ALL
    SELECT 'AscentAttempt' AS entity_type, aa.id, cs.user_id, aa.updated_at, aa.deleted
        FROM ascent_attempt aa JOIN climbing_session cs ON aa.session_id = cs.id
    UNION ALL
    SELECT 'PitchLog' AS entity_type, pl.id, cs.user_id, pl.updated_at, pl.deleted
        FROM pitch_log pl
        JOIN ascent_attempt aa ON pl.attempt_id = aa.id
        JOIN climbing_session cs ON aa.session_id = cs.id;
