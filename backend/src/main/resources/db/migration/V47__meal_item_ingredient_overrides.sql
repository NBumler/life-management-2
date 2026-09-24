-- backlog/121 — recept forrású étkezési tétel hozzávalónkénti mennyiség-felülírása (a ténylegesen
-- felhasznált mennyiség a recept szerinti helyett, a Recipe / RecipeIngredient változatlan). Nem
-- önálló szinkronizált entitás: a felülírások csak a tétellel együtt változnak, nincs saját id-juk és
-- semmi nem hivatkozik rájuk, ezért a tétel sorában JSON-tömbként élnek (ugyanaz a minta, mint a
-- hike_route.days — V42). NULL = a recept változatlanul. sync_changes view érintetlen.

ALTER TABLE meal_item
    ADD COLUMN ingredient_overrides jsonb;
