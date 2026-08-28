package hu.bumler.lm2.food;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import com.fasterxml.jackson.databind.ObjectMapper;

import hu.bumler.lm2.api.model.ShoppingList;
import hu.bumler.lm2.api.model.ShoppingListItem;
import hu.bumler.lm2.common.IdempotencyKeyRepository;
import hu.bumler.lm2.common.exception.EntityDeletedException;
import hu.bumler.lm2.common.exception.EntityNotFoundException;
import hu.bumler.lm2.common.exception.ValidationException;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/** Plain JUnit 5 + Mockito, no Spring context (spring-boot-conventions testing.md). */
class ShoppingListServiceTest {

	private ShoppingListRepository repository;
	private ShoppingListItemRepository itemRepository;
	private FoodRepository foodRepository;
	private StoredFoodRepository storedFoodRepository;
	private IdempotencyKeyRepository idempotencyKeyRepository;
	private ShoppingListService service;

	@BeforeEach
	void setUp() {
		repository = mock(ShoppingListRepository.class);
		itemRepository = mock(ShoppingListItemRepository.class);
		foodRepository = mock(FoodRepository.class);
		storedFoodRepository = mock(StoredFoodRepository.class);
		idempotencyKeyRepository = mock(IdempotencyKeyRepository.class);
		service = new ShoppingListService(repository, itemRepository, foodRepository, storedFoodRepository, idempotencyKeyRepository,
				new ShoppingListMapper(), new ShoppingListItemMapper(), new ObjectMapper());
		when(repository.saveAndFlush(any())).thenAnswer(inv -> inv.getArgument(0));
	}

	private static ShoppingListEntity shoppingList(UUID id, UUID userId) {
		return new ShoppingListEntity(id, userId);
	}

	private void liveFood(UUID foodId) {
		when(foodRepository.findById(foodId)).thenReturn(Optional.of(new FoodEntity(foodId)));
	}

	private static ShoppingListItem foodItem(UUID id, UUID listId, UUID foodId, int sortOrder) {
		ShoppingListItem item = new ShoppingListItem(id, listId, ShoppingListItem.TypeEnum.FOOD, false, sortOrder, false);
		item.foodId(foodId);
		item.quantityAmount(BigDecimal.valueOf(2));
		item.quantityUnit("db");
		return item;
	}

	private static ShoppingListItem nonFoodItem(UUID id, UUID listId, int sortOrder) {
		ShoppingListItem item = new ShoppingListItem(id, listId, ShoppingListItem.TypeEnum.NON_FOOD, false, sortOrder, false);
		item.name("Mosószer");
		item.note("Lidl");
		return item;
	}

	// --- create (idempotent upsert) ---

	@Test
	void create_insertsNewList_withFoodItem() {
		UUID userId = UUID.randomUUID();
		UUID id = UUID.randomUUID();
		UUID itemId = UUID.randomUUID();
		UUID foodId = UUID.randomUUID();
		when(repository.findById(id)).thenReturn(Optional.empty());
		when(itemRepository.findByShoppingListId(id)).thenReturn(List.of());
		liveFood(foodId);

		ShoppingList dto = new ShoppingList(id, List.of(foodItem(itemId, id, foodId, 0)), false);
		dto.name("Heti bevásárlás");
		ShoppingList saved = service.create(userId, dto);

		assertThat(saved.getId()).isEqualTo(id);
		ArgumentCaptor<ShoppingListEntity> captor = ArgumentCaptor.forClass(ShoppingListEntity.class);
		verify(repository).saveAndFlush(captor.capture());
		assertThat(captor.getValue().getUserId()).isEqualTo(userId);
		assertThat(captor.getValue().getName()).isEqualTo("Heti bevásárlás");
		ArgumentCaptor<ShoppingListItemEntity> itemCaptor = ArgumentCaptor.forClass(ShoppingListItemEntity.class);
		verify(itemRepository).save(itemCaptor.capture());
		assertThat(itemCaptor.getValue().getId()).isEqualTo(itemId);
		assertThat(itemCaptor.getValue().getFoodId()).isEqualTo(foodId);
	}

	@Test
	void create_rejectsForeignList_whenIdBelongsToAnotherUser() {
		UUID owner = UUID.randomUUID();
		UUID attacker = UUID.randomUUID();
		ShoppingListEntity existing = shoppingList(UUID.randomUUID(), owner);
		when(repository.findById(existing.getId())).thenReturn(Optional.of(existing));

		ShoppingList dto = new ShoppingList(existing.getId(), List.of(), false);

		assertThatThrownBy(() -> service.create(attacker, dto)).isInstanceOf(EntityNotFoundException.class);
		verify(repository, never()).saveAndFlush(any());
	}

	@Test
	void create_allowsEmptyItemList() {
		// documentation/Subfeatures/Bevásárlólista írás.md "Üres aktív lista": unlike Meal, an
		// empty shopping list is valid — it's deleted manually, not rejected on save.
		UUID userId = UUID.randomUUID();
		UUID id = UUID.randomUUID();
		when(repository.findById(id)).thenReturn(Optional.empty());
		when(itemRepository.findByShoppingListId(id)).thenReturn(List.of());

		ShoppingList dto = new ShoppingList(id, List.of(), false);
		ShoppingList saved = service.create(userId, dto);

		assertThat(saved.getItems()).isEmpty();
		verify(itemRepository, never()).save(any());
	}

	@Test
	void create_rejectsFoodItem_whenFoodIsMissingReferencedQuantity() {
		UUID userId = UUID.randomUUID();
		UUID id = UUID.randomUUID();
		UUID foodId = UUID.randomUUID();
		when(repository.findById(id)).thenReturn(Optional.empty());
		when(itemRepository.findByShoppingListId(id)).thenReturn(List.of());
		liveFood(foodId);

		ShoppingListItem badItem = new ShoppingListItem(UUID.randomUUID(), id, ShoppingListItem.TypeEnum.FOOD, false, 0, false);
		badItem.foodId(foodId); // quantityAmount/quantityUnit left unset

		ShoppingList dto = new ShoppingList(id, List.of(badItem), false);

		assertThatThrownBy(() -> service.create(userId, dto)).isInstanceOf(ValidationException.class);
	}

	@Test
	void create_rejectsNonFoodItem_whenNameMissing() {
		UUID userId = UUID.randomUUID();
		UUID id = UUID.randomUUID();
		when(repository.findById(id)).thenReturn(Optional.empty());
		when(itemRepository.findByShoppingListId(id)).thenReturn(List.of());

		ShoppingListItem badItem = new ShoppingListItem(UUID.randomUUID(), id, ShoppingListItem.TypeEnum.NON_FOOD, false, 0, false);

		ShoppingList dto = new ShoppingList(id, List.of(badItem), false);

		assertThatThrownBy(() -> service.create(userId, dto)).isInstanceOf(ValidationException.class);
	}

	@Test
	void create_savesFoodAndNonFoodItems_withTypeSpecificFields() {
		UUID userId = UUID.randomUUID();
		UUID id = UUID.randomUUID();
		UUID foodItemId = UUID.randomUUID();
		UUID nonFoodItemId = UUID.randomUUID();
		UUID foodId = UUID.randomUUID();
		when(repository.findById(id)).thenReturn(Optional.empty());
		when(itemRepository.findByShoppingListId(id)).thenReturn(List.of());
		liveFood(foodId);

		ShoppingList dto = new ShoppingList(id, List.of(foodItem(foodItemId, id, foodId, 0), nonFoodItem(nonFoodItemId, id, 1)), false);
		service.create(userId, dto);

		ArgumentCaptor<ShoppingListItemEntity> captor = ArgumentCaptor.forClass(ShoppingListItemEntity.class);
		verify(itemRepository, times(2)).save(captor.capture());
		assertThat(captor.getAllValues()).extracting(ShoppingListItemEntity::getId).containsExactlyInAnyOrder(foodItemId, nonFoodItemId);
	}

	// --- update: item diff (add / keep / remove), checked round-trips ---

	@Test
	void update_addsNewItem_andSoftDeletesMissingItem() {
		UUID userId = UUID.randomUUID();
		UUID listId = UUID.randomUUID();
		ShoppingListEntity existing = shoppingList(listId, userId);
		UUID keptId = UUID.randomUUID();
		UUID removedId = UUID.randomUUID();
		UUID foodId = UUID.randomUUID();
		ShoppingListItemEntity kept = new ShoppingListItemEntity(keptId, listId, "FOOD", 0);
		kept.setFoodId(foodId);
		kept.setQuantity(BigDecimal.ONE, "db");
		ShoppingListItemEntity removed = new ShoppingListItemEntity(removedId, listId, "NON_FOOD", 1);
		removed.setName("Törlendő");

		when(repository.findByIdAndUserId(listId, userId)).thenReturn(Optional.of(existing));
		when(itemRepository.findByShoppingListId(listId)).thenReturn(List.of(kept, removed));
		liveFood(foodId);

		UUID newId = UUID.randomUUID();
		ShoppingList dto = new ShoppingList(listId, List.of(foodItem(keptId, listId, foodId, 0), nonFoodItem(newId, listId, 1)), false);

		service.update(userId, listId, dto);

		assertThat(removed.isDeleted()).isTrue();
		verify(itemRepository).save(removed);
		verify(itemRepository).save(kept);
		ArgumentCaptor<ShoppingListItemEntity> captor = ArgumentCaptor.forClass(ShoppingListItemEntity.class);
		verify(itemRepository, times(3)).save(captor.capture());
		assertThat(captor.getAllValues()).anySatisfy(e -> assertThat(e.getId()).isEqualTo(newId));
	}

	@Test
	void update_persistsCheckedFlag() {
		UUID userId = UUID.randomUUID();
		UUID listId = UUID.randomUUID();
		ShoppingListEntity existing = shoppingList(listId, userId);
		UUID itemId = UUID.randomUUID();
		ShoppingListItemEntity item = new ShoppingListItemEntity(itemId, listId, "NON_FOOD", 0);
		item.setName("Kenyér");

		when(repository.findByIdAndUserId(listId, userId)).thenReturn(Optional.of(existing));
		when(itemRepository.findByShoppingListId(listId)).thenReturn(List.of(item));

		ShoppingListItem checkedItem = new ShoppingListItem(itemId, listId, ShoppingListItem.TypeEnum.NON_FOOD, true, 0, false);
		checkedItem.name("Kenyér");
		ShoppingList dto = new ShoppingList(listId, List.of(checkedItem), false);

		service.update(userId, listId, dto);

		assertThat(item.isChecked()).isTrue();
	}

	@Test
	void update_revivesTombstonedItem_whenItsIdReappearsInIncomingLiveList() {
		UUID userId = UUID.randomUUID();
		UUID listId = UUID.randomUUID();
		ShoppingListEntity existing = shoppingList(listId, userId);
		ShoppingListItemEntity tombstoned = new ShoppingListItemEntity(UUID.randomUUID(), listId, "NON_FOOD", 0);
		tombstoned.setName("Sör");
		tombstoned.softDelete();

		when(repository.findByIdAndUserId(listId, userId)).thenReturn(Optional.of(existing));
		when(itemRepository.findByShoppingListId(listId)).thenReturn(List.of(tombstoned));

		ShoppingList dto = new ShoppingList(listId, List.of(nonFoodItem(tombstoned.getId(), listId, 0)), false);
		service.update(userId, listId, dto);

		assertThat(tombstoned.isDeleted()).isFalse();
		verify(itemRepository).save(tombstoned);
	}

	@Test
	void update_throwsEntityDeleted_whenListAlreadyDeleted() {
		UUID userId = UUID.randomUUID();
		ShoppingListEntity existing = shoppingList(UUID.randomUUID(), userId);
		existing.softDelete();
		when(repository.findByIdAndUserId(existing.getId(), userId)).thenReturn(Optional.of(existing));

		ShoppingList dto = new ShoppingList(existing.getId(), List.of(), false);

		assertThatThrownBy(() -> service.update(userId, existing.getId(), dto)).isInstanceOf(EntityDeletedException.class);
		verify(repository, never()).saveAndFlush(any());
	}

	@Test
	void update_throwsNotFound_whenListBelongsToAnotherUser() {
		UUID attacker = UUID.randomUUID();
		UUID id = UUID.randomUUID();
		when(repository.findByIdAndUserId(id, attacker)).thenReturn(Optional.empty());

		ShoppingList dto = new ShoppingList(id, List.of(), false);

		assertThatThrownBy(() -> service.update(attacker, id, dto)).isInstanceOf(EntityNotFoundException.class);
	}

	// --- get ---

	@Test
	void get_throwsNotFound_whenListBelongsToAnotherUser() {
		UUID attacker = UUID.randomUUID();
		UUID id = UUID.randomUUID();
		when(repository.findByIdAndUserId(id, attacker)).thenReturn(Optional.empty());

		assertThatThrownBy(() -> service.get(attacker, id)).isInstanceOf(EntityNotFoundException.class);
	}

	// --- delete (soft, cascading, idempotent) ---

	@Test
	void delete_softDeletesListAndCascadesToLiveItems_asOneBulkUpdate() {
		UUID userId = UUID.randomUUID();
		ShoppingListEntity existing = shoppingList(UUID.randomUUID(), userId);
		ShoppingListItemEntity item = new ShoppingListItemEntity(UUID.randomUUID(), existing.getId(), "NON_FOOD", 0);
		item.softDelete();
		when(repository.findByIdAndUserId(existing.getId(), userId)).thenReturn(Optional.of(existing));
		when(itemRepository.findByShoppingListId(existing.getId())).thenReturn(List.of(item));

		ShoppingList deleted = service.delete(userId, existing.getId());

		assertThat(deleted.getDeleted()).isTrue();
		verify(itemRepository).softDeleteByShoppingListIdAndDeletedFalse(existing.getId());
		verify(itemRepository, never()).save(any());
	}

	@Test
	void delete_isIdempotent_whenListAlreadyDeleted() {
		UUID userId = UUID.randomUUID();
		ShoppingListEntity existing = shoppingList(UUID.randomUUID(), userId);
		existing.softDelete();
		when(repository.findByIdAndUserId(existing.getId(), userId)).thenReturn(Optional.of(existing));
		when(itemRepository.findByShoppingListId(existing.getId())).thenReturn(List.of());

		ShoppingList deleted = service.delete(userId, existing.getId());

		assertThat(deleted.getDeleted()).isTrue();
		verify(repository, never()).saveAndFlush(any());
		verify(itemRepository, never()).softDeleteByShoppingListIdAndDeletedFalse(any());
	}

	// --- list ---

	@Test
	void list_returnsMappedListsForUser() {
		UUID userId = UUID.randomUUID();
		ShoppingListEntity l1 = shoppingList(UUID.randomUUID(), userId);
		ShoppingListEntity l2 = shoppingList(UUID.randomUUID(), userId);
		when(repository.findByUserIdAndDeletedFalseOrderByCreatedAtDesc(userId)).thenReturn(List.of(l1, l2));
		when(itemRepository.findByShoppingListIdIn(any())).thenReturn(List.of());

		List<ShoppingList> result = service.list(userId);

		assertThat(result).hasSize(2).extracting(ShoppingList::getId).containsExactly(l1.getId(), l2.getId());
	}
}
