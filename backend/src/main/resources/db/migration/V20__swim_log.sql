-- documentation/Features/Úszás napló.md — one logged swim session ("egy napló = egy edzés"), under
-- the Edzés tab. Flat, user-owned, plain CRUD (no nested aggregate, no name uniqueness). No kcal or
-- body-weight column: the aznapi activityExtraKcal contribution is a pure client calculation with the
-- canonical MET formula (documentation/Features/Tápérték kalkulátor.md). pool_length_meters /
-- lap_count / distance_meters are log/statistics only.

CREATE TABLE swim_log (
    id                 uuid PRIMARY KEY,
    user_id            uuid NOT NULL REFERENCES users (id),
    -- calendar date in the client's TZ; drives the aznapi activityExtraKcal sum. No time-of-day.
    swim_date          date NOT NULL,
    duration_minutes   integer NOT NULL CHECK (duration_minutes > 0),
    intensity          text NOT NULL CHECK (intensity IN (
                           'CASUAL', 'BREASTSTROKE', 'BACKSTROKE', 'CRAWL_FREESTYLE',
                           'OPEN_WATER', 'BUTTERFLY', 'VIGOROUS', 'MIXED')),
    -- documentation/Features/Úszás napló.md "Medence mezők együtt": either both set or both null;
    -- for OPEN_WATER both must be null. The paired-ness / OPEN_WATER rule is enforced in the service
    -- (needs the intensity value); these checks only guard the per-column domain.
    pool_length_meters integer CHECK (pool_length_meters IS NULL OR pool_length_meters > 0),
    lap_count          integer CHECK (lap_count IS NULL OR lap_count > 0),
    -- computed as pool_length_meters * lap_count when both are present; an optional manual value for
    -- OPEN_WATER; otherwise null.
    distance_meters    integer CHECK (distance_meters IS NULL OR distance_meters >= 0),
    created_at         timestamptz NOT NULL DEFAULT now(),
    updated_at         timestamptz NOT NULL DEFAULT now(),
    deleted            boolean NOT NULL DEFAULT false,
    deleted_at         timestamptz,
    CHECK ((pool_length_meters IS NULL) = (lap_count IS NULL))
);

-- documentation/Architektúra/Backend.md "Indexek": delta pull filter, scoped per user.
CREATE INDEX idx_swim_log_user_id_updated_at ON swim_log (user_id, updated_at);
-- documentation/Features/Úszás napló.md "Lista": aznapi / időrendi lookups by date.
CREATE INDEX idx_swim_log_user_id_swim_date ON swim_log (user_id, swim_date);

CREATE TRIGGER swim_log_set_updated_at
    BEFORE INSERT OR UPDATE ON swim_log
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();

-- documentation/Architektúra/Backend.md "GET /api/sync/changes": every synced table must appear
-- here, so the view is fully replaced (V4 comment: a forgotten table silently drops out of sync).
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
    SELECT 'SwimLog' AS entity_type, id, user_id, updated_at, deleted FROM swim_log;
