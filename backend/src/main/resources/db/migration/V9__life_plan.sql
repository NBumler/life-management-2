-- documentation/Subfeatures/Élet tervek.md — user-owned long-term life goal. No name uniqueness
-- (multiple identical titles allowed), no occurrence/milestone table, not a Naptár producer.

CREATE TABLE life_plan (
    id           uuid PRIMARY KEY,
    user_id      uuid NOT NULL REFERENCES users (id),
    title        text NOT NULL,
    notes        text,
    status       varchar(16) NOT NULL DEFAULT 'PLANNED' CHECK (status IN ('PLANNED', 'IN_PROGRESS', 'DONE')),
    target_date  date,
    completed_at timestamptz,
    created_at   timestamptz NOT NULL DEFAULT now(),
    updated_at   timestamptz NOT NULL DEFAULT now(),
    deleted      boolean NOT NULL DEFAULT false,
    deleted_at   timestamptz,
    -- documentation/Architektúra/Backend.md: the client owns the completedAt side effect of a status
    -- change; this check only guards the invariant, it doesn't compute anything.
    CHECK ((status = 'DONE') = (completed_at IS NOT NULL))
);

-- documentation/Architektúra/Backend.md "Indexek": delta pull filter.
CREATE INDEX idx_life_plan_user_id_updated_at ON life_plan (user_id, updated_at);

CREATE TRIGGER life_plan_set_updated_at
    BEFORE INSERT OR UPDATE ON life_plan
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
    SELECT 'LifePlan' AS entity_type, id, user_id, updated_at, deleted FROM life_plan;
