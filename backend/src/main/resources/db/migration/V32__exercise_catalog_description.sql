-- backlog/066 — opcionális szabad szöveges leírás / cue mező a gyakorlat törzsadaton (fogásszélesség,
-- szerszám-variáns, cél), hogy ne kelljen mindent a `name`-be zsúfolni. NEM része a
-- [[Névegyediség]] összehasonlításnak (csak `name_normalized`), és az [[Edzésnapló]] session entry
-- NEM snapshotolja (nem viselkedést befolyásoló adat, szemben a `category` / `kind` mezőkkel).
-- sync_changes view érintetlen: csak id / user_id / updated_at / deleted oszlopokat vetít.

ALTER TABLE exercise_catalog
    ADD COLUMN description text CHECK (description IS NULL OR char_length(description) <= 1000);
