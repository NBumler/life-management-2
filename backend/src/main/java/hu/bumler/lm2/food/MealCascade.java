package hu.bumler.lm2.food;

import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;

/**
 * documentation/Subfeatures/Étkezés.md "Cascade: Food / Recipe delete → itemek, majd üres meal soft
 * delete" — shared by FoodService.delete and RecipeService.delete. Soft-deletes every given live
 * MealItem, then soft-deletes any Meal left with zero remaining live items.
 */
final class MealCascade {

	private MealCascade() {
	}

	static void cascade(List<MealItemEntity> referencingItems, MealItemRepository itemRepository, MealRepository mealRepository) {
		Set<UUID> affectedMealIds = new HashSet<>();
		for (MealItemEntity item : referencingItems) {
			item.softDelete();
			itemRepository.save(item);
			affectedMealIds.add(item.getMealId());
		}
		itemRepository.flush();

		for (UUID mealId : affectedMealIds) {
			if (itemRepository.findByMealIdAndDeletedFalse(mealId).isEmpty()) {
				mealRepository.findById(mealId).ifPresent(meal -> {
					if (!meal.isDeleted()) {
						meal.softDelete();
						mealRepository.save(meal);
					}
				});
			}
		}
		mealRepository.flush();
	}
}
