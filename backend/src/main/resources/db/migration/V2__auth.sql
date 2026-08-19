-- User is server-generated, not an offline/synced entity (documentation/Features/Bejelentkezés.md:
-- "id UUID (szerver generálhatja user létrehozáskor — ez nem offline entitás)"), so it does not
-- carry the common sync columns (deleted, deleted_at, user_id).
CREATE TABLE users (
    id            uuid PRIMARY KEY,
    username      varchar(32) NOT NULL,
    password_hash text NOT NULL,
    role          varchar(16) NOT NULL DEFAULT 'USER',
    created_at    timestamptz NOT NULL DEFAULT now(),
    updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_users_username ON users (username);

CREATE TRIGGER users_set_updated_at
    BEFORE INSERT OR UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();

-- One row per device session. token_hash is a SHA-256 hash of the opaque refresh token;
-- the raw token is only ever returned to the client, never stored.
CREATE TABLE refresh_token (
    id           uuid PRIMARY KEY,
    user_id      uuid NOT NULL REFERENCES users (id),
    token_hash   text NOT NULL,
    device_label text,
    created_at   timestamptz NOT NULL DEFAULT now(),
    expires_at   timestamptz NOT NULL,
    revoked_at   timestamptz
);

CREATE INDEX idx_refresh_token_user_id ON refresh_token (user_id);
CREATE UNIQUE INDEX idx_refresh_token_token_hash ON refresh_token (token_hash);
