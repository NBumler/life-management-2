-- backlog/201 — a turistaút-szakasz a túraútvonal (OSM route=hiking reláció `name` tag) nevét is
-- hordozza, hogy a térképen egy vonalra koppintva kiderüljön, melyik útvonal része. Nullable: a
-- névtelen relációk és az új import előtti sorok név nélkül maradnak.
ALTER TABLE trail_segment ADD COLUMN route_name text;
