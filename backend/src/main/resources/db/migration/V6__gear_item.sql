-- documentation/Subfeatures/Eszközök.md — GearCheck's first entity: user-owned gear catalog.
-- name_normalized is application-written (not a DB generated column — documentation/Architektúra/Backend.md
-- "Névnormalizálás" explains why: Postgres lower() is collation-dependent and would drift from the
-- client's Unicode normalization).

CREATE TABLE gear_item (
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

-- documentation/Architektúra/Névegyediség.md: unique per user, live rows only.
CREATE UNIQUE INDEX idx_gear_item_user_id_name_normalized ON gear_item (user_id, name_normalized) WHERE deleted = false;

-- documentation/Architektúra/Backend.md "Indexek": delta pull filter.
CREATE INDEX idx_gear_item_user_id_updated_at ON gear_item (user_id, updated_at);

CREATE TRIGGER gear_item_set_updated_at
    BEFORE INSERT OR UPDATE ON gear_item
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();

-- documentation/Architektúra/Backend.md "GET /api/sync/changes": every synced table must appear
-- here, so the view is fully replaced (V4 comment: a forgotten table silently drops out of sync).
CREATE OR REPLACE VIEW sync_changes AS
    SELECT 'UserProfile' AS entity_type, id, user_id, updated_at, deleted FROM user_profile
    UNION ALL
    SELECT 'WeightHistoryEntry' AS entity_type, id, user_id, updated_at, deleted FROM weight_history_entry
    UNION ALL
    SELECT 'GearItem' AS entity_type, id, user_id, updated_at, deleted FROM gear_item;
