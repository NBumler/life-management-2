-- backlog/068 — a "fekvés" (aspect) eddig szabad szöveg volt a sector.default_aspect / route.aspect /
-- climbing_session.aspect oszlopokban. Mostantól 8 irányú égtáj-enum token: N, NE, E, SE, S, SW, W, NW
-- (NULL = ismeretlen / nincs megadva; nincs UNKNOWN tag). A felmászókönyvek eleve égtájként adják meg,
-- a bevitel egy vizuális választóból történik; iránytű-fokból a kliens + a backend azonos binneléssel
-- konvertál (shared/fixtures/aspect-degrees.json, hu.bumler.lm2.common.AspectDirection).
--
-- Ez a migráció:
--   1. best-effort megfelelteti a meglévő magyar/angol szabad szöveget (kis-nagybetű + whitespace
--      toleránsan) a token-készletre; amit nem ismer fel, NULL-ra állítja (lossy, elfogadott — a
--      helyszín-fa solo adat, kevés sor, és a fekvés bármikor újraválasztható);
--   2. CHECK constraintet tesz mindhárom oszlopra, hogy ezután csak a nyolc token vagy NULL kerülhessen be.
--
-- A token szövegoszlopban marad (mint a locationType / discipline), így a sync_changes view
-- érintetlen (csak id / user_id / updated_at / deleted oszlopokat vetít).

CREATE FUNCTION lm2_aspect_from_freetext(raw text) RETURNS text
    LANGUAGE sql IMMUTABLE AS $$
    SELECT CASE lower(regexp_replace(trim(coalesce(raw, '')), '[\s\-_.]', '', 'g'))
        WHEN 'n' THEN 'N'
        WHEN 'north' THEN 'N'
        WHEN 'é' THEN 'N'
        WHEN 'eszak' THEN 'N'
        WHEN 'észak' THEN 'N'
        WHEN 'eszaki' THEN 'N'
        WHEN 'északi' THEN 'N'
        WHEN 'ne' THEN 'NE'
        WHEN 'northeast' THEN 'NE'
        WHEN 'ék' THEN 'NE'
        WHEN 'ek' THEN 'NE'
        WHEN 'eszakkelet' THEN 'NE'
        WHEN 'északkelet' THEN 'NE'
        WHEN 'eszakkeleti' THEN 'NE'
        WHEN 'északkeleti' THEN 'NE'
        WHEN 'e' THEN 'E'
        WHEN 'east' THEN 'E'
        WHEN 'k' THEN 'E'
        WHEN 'kelet' THEN 'E'
        WHEN 'keleti' THEN 'E'
        WHEN 'se' THEN 'SE'
        WHEN 'southeast' THEN 'SE'
        WHEN 'dk' THEN 'SE'
        WHEN 'delkelet' THEN 'SE'
        WHEN 'délkelet' THEN 'SE'
        WHEN 'delkeleti' THEN 'SE'
        WHEN 'délkeleti' THEN 'SE'
        WHEN 's' THEN 'S'
        WHEN 'south' THEN 'S'
        WHEN 'd' THEN 'S'
        WHEN 'del' THEN 'S'
        WHEN 'dél' THEN 'S'
        WHEN 'deli' THEN 'S'
        WHEN 'déli' THEN 'S'
        WHEN 'sw' THEN 'SW'
        WHEN 'southwest' THEN 'SW'
        WHEN 'dny' THEN 'SW'
        WHEN 'delnyugat' THEN 'SW'
        WHEN 'délnyugat' THEN 'SW'
        WHEN 'delnyugati' THEN 'SW'
        WHEN 'délnyugati' THEN 'SW'
        WHEN 'w' THEN 'W'
        WHEN 'west' THEN 'W'
        WHEN 'ny' THEN 'W'
        WHEN 'nyugat' THEN 'W'
        WHEN 'nyugati' THEN 'W'
        WHEN 'nw' THEN 'NW'
        WHEN 'northwest' THEN 'NW'
        WHEN 'ény' THEN 'NW'
        WHEN 'eny' THEN 'NW'
        WHEN 'eszaknyugat' THEN 'NW'
        WHEN 'északnyugat' THEN 'NW'
        WHEN 'eszaknyugati' THEN 'NW'
        WHEN 'északnyugati' THEN 'NW'
        ELSE NULL
    END;
$$;

UPDATE sector SET default_aspect = lm2_aspect_from_freetext(default_aspect)
    WHERE default_aspect IS NOT NULL;
UPDATE route SET aspect = lm2_aspect_from_freetext(aspect)
    WHERE aspect IS NOT NULL;
UPDATE climbing_session SET aspect = lm2_aspect_from_freetext(aspect)
    WHERE aspect IS NOT NULL;

DROP FUNCTION lm2_aspect_from_freetext(text);

ALTER TABLE sector ADD CONSTRAINT sector_default_aspect_check
    CHECK (default_aspect IS NULL OR default_aspect IN ('N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'));
ALTER TABLE route ADD CONSTRAINT route_aspect_check
    CHECK (aspect IS NULL OR aspect IN ('N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'));
ALTER TABLE climbing_session ADD CONSTRAINT climbing_session_aspect_check
    CHECK (aspect IS NULL OR aspect IN ('N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'));
