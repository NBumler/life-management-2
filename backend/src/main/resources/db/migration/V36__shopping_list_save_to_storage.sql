-- backlog/099 — per-list "save purchases to storage" toggle. When false, completing the list
-- (POST /api/shopping-lists/{id}/complete) archives it and spins off the leftover items as usual
-- but creates NO stored_food rows — for a list written for somewhere other than home. Default
-- true preserves the existing behaviour for every current row.

ALTER TABLE shopping_list
    ADD COLUMN save_to_storage boolean NOT NULL DEFAULT true;
