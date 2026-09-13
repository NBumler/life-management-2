-- backlog/tura-utvonaltervezo/104-... — turistaút-szakasz referenciaadat, OSM extract-importból.
-- Szándékosan NEM szerepel a sync_changes view-ban: nem szinkronizált/user-owned entitás, hanem
-- terület (bbox) szerint lekérdezett, admin-importált referenciaadat (backlog/tura-utvonaltervezo/
-- 103-... 1. fázis terve). Az ország-kód oszlop a kezdetektől particionál a jövőbeli
-- több-országos bővítéshez (backlog/tura-utvonaltervezo/104-... döntési napló).
--
-- A geometria lapított double precision[] tömbként tárolt [lon, lat] pontsorozat (lon1, lat1,
-- lon2, lat2, ...) — a natív Postgres tömb ugyanaz a minta, mint a PackingSession
-- source_template_ids oszlopa (Hibernate SqlTypes.ARRAY, nincs külön jsonb-szerializációs réteg).
-- Nem PostGIS geometry — nincs rá igény, amíg a bbox-szűrés a min/max oszlopokkal is elég gyors.
-- Nincs deleted/deleted_at tombstone:
-- egy admin-import a teljes ország-kódra vonatkozó készletet lecseréli (töröl majd újra beszúr),
-- nincs kliens-oldali offline másolat, aminek konvergálnia kellene.

CREATE TABLE trail_segment (
    id            uuid PRIMARY KEY,
    country_code  varchar(2) NOT NULL,
    osm_way_id    bigint,
    symbol        text NOT NULL,
    coordinates   double precision[] NOT NULL,
    min_lon       double precision NOT NULL,
    min_lat       double precision NOT NULL,
    max_lon       double precision NOT NULL,
    max_lat       double precision NOT NULL,
    created_at    timestamptz NOT NULL DEFAULT now(),
    updated_at    timestamptz NOT NULL DEFAULT now()
);

-- bbox-overlap lekérdezés (country_code egyenlőség + két intervallum metszés) erre támaszkodik.
CREATE INDEX idx_trail_segment_country_bbox ON trail_segment (country_code, min_lon, max_lon, min_lat, max_lat);

CREATE TRIGGER trail_segment_set_updated_at
    BEFORE INSERT OR UPDATE ON trail_segment
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();
