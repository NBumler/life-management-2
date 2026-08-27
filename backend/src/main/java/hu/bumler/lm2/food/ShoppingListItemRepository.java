package hu.bumler.lm2.food;

import java.util.Collection;
import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

interface ShoppingListItemRepository extends JpaRepository<ShoppingListItemEntity, UUID> {

	/** All rows (live and tombstoned) — the nested response needs both, see ShoppingList.yaml. */
	List<ShoppingListItemEntity> findByShoppingListId(UUID shoppingListId);

	List<ShoppingListItemEntity> findByShoppingListIdAndDeletedFalse(UUID shoppingListId);

	/** Batch form of {@link #findByShoppingListId} — ShoppingListService.list()/ShoppingListSyncDataLoader group the result by shoppingListId instead of querying per list. */
	List<ShoppingListItemEntity> findByShoppingListIdIn(Collection<UUID> shoppingListIds);

	/** documentation/Subfeatures/Élelmiszerek.md — Food delete cascade. */
	List<ShoppingListItemEntity> findByFoodIdAndDeletedFalse(UUID foodId);
}
