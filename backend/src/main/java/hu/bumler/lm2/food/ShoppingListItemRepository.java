package hu.bumler.lm2.food;

import java.util.Collection;
import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

interface ShoppingListItemRepository extends JpaRepository<ShoppingListItemEntity, UUID> {

	/** All rows (live and tombstoned) — the nested response needs both, see ShoppingList.yaml. */
	List<ShoppingListItemEntity> findByShoppingListId(UUID shoppingListId);

	List<ShoppingListItemEntity> findByShoppingListIdAndDeletedFalse(UUID shoppingListId);

	/** Batch form of {@link #findByShoppingListId} — ShoppingListService.list()/ShoppingListSyncDataLoader group the result by shoppingListId instead of querying per list. */
	List<ShoppingListItemEntity> findByShoppingListIdIn(Collection<UUID> shoppingListIds);

	/** documentation/Subfeatures/Élelmiszerek.md — Food delete cascade. */
	List<ShoppingListItemEntity> findByFoodIdAndDeletedFalse(UUID foodId);

	/**
	 * documentation/Architektúra/Backend.md "Indexek" / CLAUDE.md: one bulk UPDATE, not a per-row
	 * {@code save()} loop — the {@code shopping_list_item_set_updated_at} BEFORE trigger still stamps
	 * {@code updated_at} on every affected row, which the delta pull relies on. Used by the list-delete
	 * cascade.
	 */
	@Modifying
	@Query("UPDATE ShoppingListItemEntity i SET i.deleted = true, i.deletedAt = CURRENT_TIMESTAMP "
			+ "WHERE i.shoppingListId = :shoppingListId AND i.deleted = false")
	int softDeleteByShoppingListIdAndDeletedFalse(@Param("shoppingListId") UUID shoppingListId);

	/**
	 * documentation/Subfeatures/Élelmiszerek.md "Törlés" — Food delete cascade for shopping-list items,
	 * as one bulk UPDATE (see {@link #softDeleteByShoppingListIdAndDeletedFalse}). Unlike the Meal
	 * cascade, the parent list is never touched even if this empties it
	 * (documentation/Subfeatures/Bevásárlólista írás.md "Üres aktív lista").
	 */
	@Modifying
	@Query("UPDATE ShoppingListItemEntity i SET i.deleted = true, i.deletedAt = CURRENT_TIMESTAMP "
			+ "WHERE i.foodId = :foodId AND i.deleted = false")
	int softDeleteByFoodIdAndDeletedFalse(@Param("foodId") UUID foodId);
}
