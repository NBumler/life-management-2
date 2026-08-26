-- documentation/Subfeatures/Recept.md — second shared/global catalog (after `food`): no user_id,
-- every authenticated user sees and can edit every live row. Unlike Food's field-set dedup, a
-- recipe's name alone IS a live-row uniqueness scope (documentation/Architektúra/Névegyediség.md),
-- so — unlike food's deliberately absent name index — a partial unique index enforces it here.

CREATE TABLE recipe (
    id              uuid PRIMARY KEY,
    name            text NOT NULL,
    name_normalized text NOT NULL,
    note            text,
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now(),
    deleted         boolean NOT NULL DEFAULT false,
    deleted_at      timestamptz
);

CREATE UNIQUE INDEX idx_recipe_name_normalized ON recipe (name_normalized) WHERE deleted = false;

-- documentation/Architektúra/Backend.md "Indexek": delta pull filter. Global table, no user_id to scope by.
CREATE INDEX idx_recipe_updated_at ON recipe (updated_at);

CREATE TRIGGER recipe_set_updated_at
    BEFORE INSERT OR UPDATE ON recipe
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();

-- documentation/Subfeatures/Recept.md — a Food reference inside a Recipe, own sync entity (mirrors
-- gear's packing_template_item "nested aggregate PUT" pattern), but no user_id: like `food`, this
-- is a shared/global table, not per-user.
CREATE TABLE recipe_ingredient (
    id              uuid PRIMARY KEY,
    recipe_id       uuid NOT NULL REFERENCES recipe (id),
    food_id         uuid NOT NULL REFERENCES food (id),
    quantity_amount numeric NOT NULL,
    quantity_unit   text NOT NULL,
    sort_order      integer NOT NULL,
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now(),
    deleted         boolean NOT NULL DEFAULT false,
    deleted_at      timestamptz
);

-- documentation/Subfeatures/Recept.md "Hozzávalók": "ugyanaz az élelmiszer kétszer... tiltott", élő sorokra.
CREATE UNIQUE INDEX idx_recipe_ingredient_recipe_food ON recipe_ingredient (recipe_id, food_id) WHERE deleted = false;
CREATE INDEX idx_recipe_ingredient_updated_at ON recipe_ingredient (updated_at);
CREATE INDEX idx_recipe_ingredient_recipe_id ON recipe_ingredient (recipe_id);

-- documentation/Subfeatures/Élelmiszerek.md "Törlés": cascade lookup when a catalog Food is deleted.
CREATE INDEX idx_recipe_ingredient_food_id ON recipe_ingredient (food_id);

CREATE TRIGGER recipe_ingredient_set_updated_at
    BEFORE INSERT OR UPDATE ON recipe_ingredient
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();

-- documentation/Architektúra/Backend.md "GET /api/sync/changes": every synced table must appear
-- here, so the view is fully replaced (V4 comment: a forgotten table silently drops out of sync).
-- Recipe/RecipeIngredient have no user_id — NULL matches every caller, same as Food (V12 comment).
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
    SELECT 'RecipeIngredient' AS entity_type, id, NULL::uuid AS user_id, updated_at, deleted FROM recipe_ingredient;
