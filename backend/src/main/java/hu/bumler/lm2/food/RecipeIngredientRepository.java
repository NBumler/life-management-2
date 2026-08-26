package hu.bumler.lm2.food;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

interface RecipeIngredientRepository extends JpaRepository<RecipeIngredientEntity, UUID> {

	/** All rows (live and tombstoned) — the nested response needs both, see Recipe.yaml. */
	List<RecipeIngredientEntity> findByRecipeId(UUID recipeId);

	List<RecipeIngredientEntity> findByRecipeIdAndDeletedFalse(UUID recipeId);

	/** documentation/Subfeatures/Élelmiszerek.md — Food delete cascade. */
	List<RecipeIngredientEntity> findByFoodIdAndDeletedFalse(UUID foodId);
}
