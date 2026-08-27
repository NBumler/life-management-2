-- documentation/Subfeatures/Bevásárlólista írás.md — per-user active shopping list. Same shape as
-- meal/meal_item: ShoppingList IS user-owned (mirrors packing_template/meal); its polymorphic
-- ShoppingListItem child carries no user_id of its own (mirrors meal_item's shape) even though its
-- parent is per-user, not global. `status`/`completed_at` exist now for the whole Bevásárlás
-- cluster's schema but are not yet mutated by this slice — only the future "teljesítve" endpoint
-- transitions a list to ARCHIVED.

CREATE TABLE shopping_list (
    id            uuid PRIMARY KEY,
    user_id       uuid NOT NULL,
    name          text,
    status        text NOT NULL DEFAULT 'ACTIVE',
    completed_at  timestamptz,
    created_at    timestamptz NOT NULL DEFAULT now(),
    updated_at    timestamptz NOT NULL DEFAULT now(),
    deleted       boolean NOT NULL DEFAULT false,
    deleted_at    timestamptz
);

-- documentation/Architektúra/Backend.md "Indexek": delta pull filter, scoped per user.
CREATE INDEX idx_shopping_list_user_id_updated_at ON shopping_list (user_id, updated_at);

CREATE TRIGGER shopping_list_set_updated_at
    BEFORE INSERT OR UPDATE ON shopping_list
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();

-- documentation/Subfeatures/Bevásárlólista írás.md "Tétel hozzáadása": one flat polymorphic table
-- for the two source types (FOOD / NON_FOOD) rather than two tables — the per-type columns are a
-- nullable superset, same shape as meal_item's table.
CREATE TABLE shopping_list_item (
    id                 uuid PRIMARY KEY,
    shopping_list_id   uuid NOT NULL REFERENCES shopping_list (id),
    type               text NOT NULL,
    food_id            uuid REFERENCES food (id),
    name               text,
    note               text,
    quantity_amount    numeric,
    quantity_unit      text,
    checked            boolean NOT NULL DEFAULT false,
    sort_order         integer NOT NULL,
    created_at         timestamptz NOT NULL DEFAULT now(),
    updated_at         timestamptz NOT NULL DEFAULT now(),
    deleted            boolean NOT NULL DEFAULT false,
    deleted_at         timestamptz
);

CREATE INDEX idx_shopping_list_item_shopping_list_id ON shopping_list_item (shopping_list_id);
CREATE INDEX idx_shopping_list_item_updated_at ON shopping_list_item (updated_at);

-- documentation/Subfeatures/Élelmiszerek.md: cascade lookup when the referenced Food is deleted
-- (see FoodService.delete / ShoppingListItemCascade).
CREATE INDEX idx_shopping_list_item_food_id ON shopping_list_item (food_id);

CREATE TRIGGER shopping_list_item_set_updated_at
    BEFORE INSERT OR UPDATE ON shopping_list_item
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();

-- documentation/Architektúra/Backend.md "GET /api/sync/changes": every synced table must appear
-- here, so the view is fully replaced (V4 comment: a forgotten table silently drops out of sync).
-- shopping_list_item has no user_id column of its own — like meal_item, its parent ShoppingList IS
-- per-user, so this arm joins to shopping_list to project the real owner.
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
    SELECT 'ShoppingListItem' AS entity_type, sli.id, sl.user_id, sli.updated_at, sli.deleted FROM shopping_list_item sli JOIN shopping_list sl ON sli.shopping_list_id = sl.id;
