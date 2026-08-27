package hu.bumler.lm2.food;

import java.util.List;

/**
 * documentation/Subfeatures/Élelmiszerek.md "Törlés" — Food delete cascade for shopping-list items.
 * Unlike {@link MealCascade}, a shopping list is allowed to be empty (documentation/Subfeatures/
 * Bevásárlólista írás.md "Üres aktív lista" — the user deletes it manually), so this only
 * soft-deletes the referencing items and never touches the parent list.
 */
final class ShoppingListItemCascade {

	private ShoppingListItemCascade() {
	}

	static void cascade(List<ShoppingListItemEntity> referencingItems, ShoppingListItemRepository itemRepository) {
		for (ShoppingListItemEntity item : referencingItems) {
			item.softDelete();
			itemRepository.save(item);
		}
		itemRepository.flush();
	}
}
