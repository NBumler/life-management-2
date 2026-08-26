package hu.bumler.lm2.food;

import java.util.List;
import java.util.UUID;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RestController;

import hu.bumler.lm2.api.RecipesApi;
import hu.bumler.lm2.api.model.Recipe;

/** documentation/Subfeatures/Recept.md — shared catalog, no per-user scoping (see RecipeService). */
@RestController
class RecipeController implements RecipesApi {

	private final RecipeService recipeService;

	RecipeController(RecipeService recipeService) {
		this.recipeService = recipeService;
	}

	@Override
	public ResponseEntity<List<Recipe>> listRecipes() {
		return ResponseEntity.ok(recipeService.list());
	}

	@Override
	public ResponseEntity<Recipe> createRecipe(Recipe recipe) {
		return ResponseEntity.ok(recipeService.create(recipe));
	}

	@Override
	public ResponseEntity<Recipe> getRecipe(UUID id) {
		return ResponseEntity.ok(recipeService.get(id));
	}

	@Override
	public ResponseEntity<Recipe> updateRecipe(UUID id, Recipe recipe) {
		return ResponseEntity.ok(recipeService.update(id, recipe));
	}

	@Override
	public ResponseEntity<Recipe> deleteRecipe(UUID id) {
		return ResponseEntity.ok(recipeService.delete(id));
	}
}
