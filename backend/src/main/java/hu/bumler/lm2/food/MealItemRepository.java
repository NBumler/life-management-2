package hu.bumler.lm2.food;

import java.util.Collection;
import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

interface MealItemRepository extends JpaRepository<MealItemEntity, UUID> {

	/** All rows (live and tombstoned) — the nested response needs both, see Meal.yaml. */
	List<MealItemEntity> findByMealId(UUID mealId);

	List<MealItemEntity> findByMealIdAndDeletedFalse(UUID mealId);

	/** Batch form of {@link #findByMealId} — MealService.list()/MealSyncDataLoader group the result by mealId instead of querying per meal. */
	List<MealItemEntity> findByMealIdIn(Collection<UUID> mealIds);

	/** documentation/Subfeatures/Recept forrású étkezés.md — Recipe delete cascade. */
	List<MealItemEntity> findByRecipeIdAndDeletedFalse(UUID recipeId);

	/** documentation/Subfeatures/Élelmiszer forrású étkezés.md — Food delete cascade. */
	List<MealItemEntity> findByFoodIdAndDeletedFalse(UUID foodId);
}
