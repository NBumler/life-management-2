-- documentation/Subfeatures/Gyakorlat.md — the Edzés törzs's first table: a user-owned exercise
-- master catalog ("mit csinálhatsz?"). Edzésnapló session entries will reference exerciseId and
-- snapshot name/category/kind, so a rename or soft delete here never rewrites past sessions.
-- name_normalized is application-written (documentation/Architektúra/Backend.md "Névnormalizálás":
-- Postgres lower() is collation-dependent and would drift from the client's Unicode normalization).

CREATE TABLE exercise_catalog (
    id                        uuid PRIMARY KEY,
    user_id                   uuid NOT NULL REFERENCES users (id),
    name                      text NOT NULL,
    name_normalized           text NOT NULL,
    category                  text NOT NULL CHECK (category IN (
                                  'CHEST', 'BACK', 'LEGS', 'SHOULDERS', 'ARMS', 'CORE', 'FOREARM_FINGERS', 'FULL_BODY')),
    kind                      text NOT NULL CHECK (kind IN (
                                  'WEIGHTED_REPS', 'BODYWEIGHT_REPS', 'ISOMETRIC_TIME', 'HANGBOARD_PINCH', 'CARDIO_TIME_DIST')),
    default_rest_time_seconds integer CHECK (default_rest_time_seconds IS NULL OR default_rest_time_seconds > 0),
    is_favorite               boolean NOT NULL DEFAULT false,
    equipment                 text,
    created_at                timestamptz NOT NULL DEFAULT now(),
    updated_at                timestamptz NOT NULL DEFAULT now(),
    deleted                   boolean NOT NULL DEFAULT false,
    deleted_at                timestamptz
);

-- documentation/Architektúra/Névegyediség.md: unique per user, live rows only ("Törölt név újra felvehető").
CREATE UNIQUE INDEX idx_exercise_catalog_user_id_name_normalized
    ON exercise_catalog (user_id, name_normalized) WHERE deleted = false;

-- documentation/Architektúra/Backend.md "Indexek": delta pull filter, scoped per user.
CREATE INDEX idx_exercise_catalog_user_id_updated_at ON exercise_catalog (user_id, updated_at);

CREATE TRIGGER exercise_catalog_set_updated_at
    BEFORE INSERT OR UPDATE ON exercise_catalog
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
    SELECT 'Exercise' AS entity_type, id, user_id, updated_at, deleted FROM exercise_catalog;
