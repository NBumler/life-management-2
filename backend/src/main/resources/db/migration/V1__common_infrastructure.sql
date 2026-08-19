-- Reusable trigger function for the `updated_at` column required on every synced table
-- (documentation/Architektúra/Backend.md: "updated_at DB triggerből"). Each future entity
-- migration attaches its own BEFORE INSERT OR UPDATE trigger calling this function.
CREATE FUNCTION set_updated_at() RETURNS trigger AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Idempotency for the non-CRUD atomic endpoints (e.g. POST /api/shopping-lists/{id}/complete).
-- documentation/Architektúra/Backend.md §"Idempotencia".
CREATE TABLE idempotency_key (
    key           uuid PRIMARY KEY,
    user_id       uuid NOT NULL,
    endpoint      text NOT NULL,
    http_status   integer NOT NULL,
    response_body jsonb NOT NULL,
    created_at    timestamptz NOT NULL DEFAULT now()
);

-- Retention job (30 days) prunes by created_at.
CREATE INDEX idx_idempotency_key_created_at ON idempotency_key (created_at);

-- Singleton row holding the tombstone retention horizon used by GET /api/sync/changes
-- (410 CURSOR_TOO_OLD when `since` predates it) and the tombstone cleanup job.
-- documentation/Architektúra/Backend-offline first.md §8/§18.
CREATE TABLE sync_meta (
    id                boolean PRIMARY KEY DEFAULT true CHECK (id),
    tombstone_horizon timestamptz NOT NULL
);

INSERT INTO sync_meta (tombstone_horizon) VALUES (now() - interval '180 days');
