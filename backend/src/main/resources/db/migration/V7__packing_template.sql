-- documentation/Subfeatures/Sablonok.md — named PackingTemplate lists of GearItem references.
-- packing_template_item carries its own user_id (denormalized from the parent) like every other
-- synced table needs for the sync_changes view filter and for cascade queries without a join.

CREATE TABLE packing_template (
    id              uuid PRIMARY KEY,
    user_id         uuid NOT NULL REFERENCES users (id),
    name            text NOT NULL,
    name_normalized text NOT NULL,
    notes           text,
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now(),
    deleted         boolean NOT NULL DEFAULT false,
    deleted_at      timestamptz
);

CREATE UNIQUE INDEX idx_packing_template_user_id_name_normalized ON packing_template (user_id, name_normalized) WHERE deleted = false;
CREATE INDEX idx_packing_template_user_id_updated_at ON packing_template (user_id, updated_at);

CREATE TRIGGER packing_template_set_updated_at
    BEFORE INSERT OR UPDATE ON packing_template
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();

CREATE TABLE packing_template_item (
    id           uuid PRIMARY KEY,
    user_id      uuid NOT NULL REFERENCES users (id),
    template_id  uuid NOT NULL REFERENCES packing_template (id),
    gear_item_id uuid NOT NULL REFERENCES gear_item (id),
    sort_order   integer NOT NULL,
    created_at   timestamptz NOT NULL DEFAULT now(),
    updated_at   timestamptz NOT NULL DEFAULT now(),
    deleted      boolean NOT NULL DEFAULT false,
    deleted_at   timestamptz
);

-- documentation/Subfeatures/Sablonok.md: "ugyanaz a gearItemId legfeljebb egyszer" a sablonon belül, élő sorokra.
CREATE UNIQUE INDEX idx_packing_template_item_template_gear ON packing_template_item (template_id, gear_item_id) WHERE deleted = false;
CREATE INDEX idx_packing_template_item_user_id_updated_at ON packing_template_item (user_id, updated_at);
CREATE INDEX idx_packing_template_item_template_id ON packing_template_item (template_id);
CREATE INDEX idx_packing_template_item_gear_item_id ON packing_template_item (gear_item_id);

CREATE TRIGGER packing_template_item_set_updated_at
    BEFORE INSERT OR UPDATE ON packing_template_item
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();

CREATE OR REPLACE VIEW sync_changes AS
    SELECT 'UserProfile' AS entity_type, id, user_id, updated_at, deleted FROM user_profile
    UNION ALL
    SELECT 'WeightHistoryEntry' AS entity_type, id, user_id, updated_at, deleted FROM weight_history_entry
    UNION ALL
    SELECT 'GearItem' AS entity_type, id, user_id, updated_at, deleted FROM gear_item
    UNION ALL
    SELECT 'PackingTemplate' AS entity_type, id, user_id, updated_at, deleted FROM packing_template
    UNION ALL
    SELECT 'PackingTemplateItem' AS entity_type, id, user_id, updated_at, deleted FROM packing_template_item;
