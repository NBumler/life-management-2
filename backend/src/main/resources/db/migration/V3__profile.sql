-- documentation/Features/Profile.md. Both tables carry the common synced-table columns
-- (documentation/Architektúra/Backend.md "Séma és migráció"): client-supplied uuid id,
-- created_at/updated_at (trigger-maintained), soft delete, user_id ownership.

CREATE TABLE user_profile (
    id                        uuid PRIMARY KEY,
    user_id                   uuid NOT NULL REFERENCES users (id),
    birth_date                date,
    sex                       varchar(16) CHECK (sex IN ('MALE', 'FEMALE')),
    height_cm                 numeric(5, 2) CHECK (height_cm BETWEEN 100 AND 250),
    current_weight_kg         numeric(5, 1) CHECK (current_weight_kg BETWEEN 30 AND 300),
    goal                      varchar(16) CHECK (goal IN ('FAT_LOSS', 'MAINTENANCE', 'WEIGHT_GAIN')),
    kg_per_week               numeric(3, 2) CHECK (kg_per_week BETWEEN 0.1 AND 1.5),
    gross_monthly_salary_huf  bigint CHECK (gross_monthly_salary_huf >= 0),
    created_at                timestamptz NOT NULL DEFAULT now(),
    updated_at                timestamptz NOT NULL DEFAULT now(),
    deleted                   boolean NOT NULL DEFAULT false,
    deleted_at                timestamptz
);

-- 1:1 per user (documentation/Architektúra/Backend-offline first.md §9: deterministic UUID v5
-- from "UserProfile:<userId>" also guarantees this on the client side).
CREATE UNIQUE INDEX idx_user_profile_user_id ON user_profile (user_id);

CREATE TRIGGER user_profile_set_updated_at
    BEFORE INSERT OR UPDATE ON user_profile
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();

CREATE TABLE weight_history_entry (
    id           uuid PRIMARY KEY,
    user_id      uuid NOT NULL REFERENCES users (id),
    recorded_at  timestamptz NOT NULL,
    weight_kg    numeric(5, 1) NOT NULL CHECK (weight_kg BETWEEN 30 AND 300),
    created_at   timestamptz NOT NULL DEFAULT now(),
    updated_at   timestamptz NOT NULL DEFAULT now(),
    deleted      boolean NOT NULL DEFAULT false,
    deleted_at   timestamptz
);

-- Delta pull filter (documentation/Architektúra/Backend.md "Indexek").
CREATE INDEX idx_weight_history_entry_user_id_updated_at ON weight_history_entry (user_id, updated_at);

CREATE TRIGGER weight_history_entry_set_updated_at
    BEFORE INSERT OR UPDATE ON weight_history_entry
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();
