-- documentation/Subfeatures/Pakolás.md — active packing sessions started from one or more
-- PackingTemplate rows. Unlike Sablonok, item mutations here are NOT a nested full-tree replace:
-- documentation/Architektúra/Backend-offline first.md's own Frontend section lists "item status /
-- sortOrder / add item" as separate outbox operations (status taps happen far more often than a
-- template edit ever would), so packing_session_item gets its own standalone CRUD-ish endpoints —
-- only session *creation* (session + its initial deduped item set) is a nested atomic write.

CREATE TABLE packing_session (
    id                 uuid PRIMARY KEY,
    user_id            uuid NOT NULL REFERENCES users (id),
    destination        text,
    -- documentation/Architektúra/Backend.md: native Postgres array over JSON — a plain list of ids,
    -- no need for JSON's arbitrary structure, and it maps cleanly via Hibernate's SqlTypes.ARRAY.
    source_template_ids uuid[] NOT NULL DEFAULT '{}',
    created_at         timestamptz NOT NULL DEFAULT now(),
    updated_at         timestamptz NOT NULL DEFAULT now(),
    deleted            boolean NOT NULL DEFAULT false,
    deleted_at         timestamptz
);

CREATE INDEX idx_packing_session_user_id_updated_at ON packing_session (user_id, updated_at);

CREATE TRIGGER packing_session_set_updated_at
    BEFORE INSERT OR UPDATE ON packing_session
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();

CREATE TABLE packing_session_item (
    id         uuid PRIMARY KEY,
    user_id    uuid NOT NULL REFERENCES users (id),
    session_id uuid NOT NULL REFERENCES packing_session (id),
    gear_item_id uuid NOT NULL REFERENCES gear_item (id),
    status     varchar(24) NOT NULL DEFAULT 'NOT_PACKED' CHECK (status IN (
        'NOT_PACKED', 'KNOWN_LOCATION', 'PREPARED', 'WEAR_ON_DEPARTURE', 'BUY_ON_THE_WAY', 'PACKED', 'NOT_NEEDED'
    )),
    sort_order integer NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    deleted    boolean NOT NULL DEFAULT false,
    deleted_at timestamptz
);

-- documentation/Subfeatures/Pakolás.md: "ugyanaz a gearItemId legfeljebb egyszer" a sessionön belül, élő sorokra.
CREATE UNIQUE INDEX idx_packing_session_item_session_gear ON packing_session_item (session_id, gear_item_id) WHERE deleted = false;
CREATE INDEX idx_packing_session_item_user_id_updated_at ON packing_session_item (user_id, updated_at);
CREATE INDEX idx_packing_session_item_session_id ON packing_session_item (session_id);
CREATE INDEX idx_packing_session_item_gear_item_id ON packing_session_item (gear_item_id);

CREATE TRIGGER packing_session_item_set_updated_at
    BEFORE INSERT OR UPDATE ON packing_session_item
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
    SELECT 'PackingTemplateItem' AS entity_type, id, user_id, updated_at, deleted FROM packing_template_item
    UNION ALL
    SELECT 'PackingSession' AS entity_type, id, user_id, updated_at, deleted FROM packing_session
    UNION ALL
    SELECT 'PackingSessionItem' AS entity_type, id, user_id, updated_at, deleted FROM packing_session_item;
