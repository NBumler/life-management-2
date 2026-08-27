package hu.bumler.lm2.food;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import hu.bumler.lm2.api.model.Meal;
import hu.bumler.lm2.api.model.MealItem;
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
class MealServiceTest {

	private static final OffsetDateTime EATEN_AT = OffsetDateTime.parse("2026-08-26T12:00:00Z");

	private MealRepository repository;
	private MealItemRepository itemRepository;
	private RecipeRepository recipeRepository;
	private FoodRepository foodRepository;
	private MealService service;

	@BeforeEach
	void setUp() {
		repository = mock(MealRepository.class);
		itemRepository = mock(MealItemRepository.class);
		recipeRepository = mock(RecipeRepository.class);
		foodRepository = mock(FoodRepository.class);
		service = new MealService(repository, itemRepository, recipeRepository, foodRepository, new MealMapper(), new MealItemMapper());
		when(repository.saveAndFlush(any())).thenAnswer(inv -> inv.getArgument(0));
	}

	private static MealEntity meal(UUID id, UUID userId) {
		return new MealEntity(id, userId);
	}

	private void liveRecipe(UUID recipeId) {
		when(recipeRepository.findById(recipeId)).thenReturn(Optional.of(new RecipeEntity(recipeId)));
	}

	private void liveFood(UUID foodId) {
		when(foodRepository.findById(foodId)).thenReturn(Optional.of(new FoodEntity(foodId)));
	}

	private static MealItem recipeItem(UUID id, UUID mealId, UUID recipeId, double servings, int sortOrder) {
		MealItem item = new MealItem(id, mealId, MealItem.TypeEnum.RECIPE, BigDecimal.valueOf(servings), sortOrder, false);
		item.recipeId(recipeId);
		return item;
	}

	private static MealItem foodItem(UUID id, UUID mealId, UUID foodId, double servings, int sortOrder) {
		MealItem item = new MealItem(id, mealId, MealItem.TypeEnum.FOOD, BigDecimal.valueOf(servings), sortOrder, false);
		item.foodId(foodId);
		item.quantityAmount(BigDecimal.valueOf(350));
		item.quantityUnit("g");
		return item;
	}

	private static MealItem customItem(UUID id, UUID mealId, double servings, int sortOrder) {
		MealItem item = new MealItem(id, mealId, MealItem.TypeEnum.CUSTOM, BigDecimal.valueOf(servings), sortOrder, false);
		item.displayName("Vendégségi torta");
		item.caloriesKcal(BigDecimal.valueOf(450));
		return item;
	}

	// --- create (idempotent upsert) ---

	@Test
	void create_insertsNewMeal_withRecipeItem() {
		UUID userId = UUID.randomUUID();
		UUID id = UUID.randomUUID();
		UUID itemId = UUID.randomUUID();
		UUID recipeId = UUID.randomUUID();
		when(repository.findById(id)).thenReturn(Optional.empty());
		when(itemRepository.findByMealId(id)).thenReturn(List.of());
		liveRecipe(recipeId);

		Meal dto = new Meal(id, EATEN_AT, "Europe/Budapest", List.of(recipeItem(itemId, id, recipeId, 1.0, 0)), false);
		Meal saved = service.create(userId, dto);

		assertThat(saved.getId()).isEqualTo(id);
		ArgumentCaptor<MealEntity> captor = ArgumentCaptor.forClass(MealEntity.class);
		verify(repository).saveAndFlush(captor.capture());
		assertThat(captor.getValue().getUserId()).isEqualTo(userId);
		ArgumentCaptor<MealItemEntity> itemCaptor = ArgumentCaptor.forClass(MealItemEntity.class);
		verify(itemRepository).save(itemCaptor.capture());
		assertThat(itemCaptor.getValue().getId()).isEqualTo(itemId);
		assertThat(itemCaptor.getValue().getRecipeId()).isEqualTo(recipeId);
	}

	@Test
	void create_rejectsForeignMeal_whenIdBelongsToAnotherUser() {
		UUID owner = UUID.randomUUID();
		UUID attacker = UUID.randomUUID();
		MealEntity existing = meal(UUID.randomUUID(), owner);
		when(repository.findById(existing.getId())).thenReturn(Optional.of(existing));

		Meal dto = new Meal(existing.getId(), EATEN_AT, "Europe/Budapest", List.of(), false);

		assertThatThrownBy(() -> service.create(attacker, dto)).isInstanceOf(EntityNotFoundException.class);
		verify(repository, never()).saveAndFlush(any());
	}

	@Test
	void create_rejectsEmptyItemList() {
		UUID userId = UUID.randomUUID();
		UUID id = UUID.randomUUID();
		when(repository.findById(id)).thenReturn(Optional.empty());
		when(itemRepository.findByMealId(id)).thenReturn(List.of());

		Meal dto = new Meal(id, EATEN_AT, "Europe/Budapest", List.of(), false);

		assertThatThrownBy(() -> service.create(userId, dto)).isInstanceOf(ValidationException.class);
		verify(itemRepository, never()).save(any());
	}

	@Test
	void create_rejectsRecipeItem_whenRecipeIsDeleted() {
		UUID userId = UUID.randomUUID();
		UUID id = UUID.randomUUID();
		UUID recipeId = UUID.randomUUID();
		RecipeEntity deletedRecipe = new RecipeEntity(recipeId);
		deletedRecipe.softDelete();
		when(repository.findById(id)).thenReturn(Optional.empty());
		when(itemRepository.findByMealId(id)).thenReturn(List.of());
		when(recipeRepository.findById(recipeId)).thenReturn(Optional.of(deletedRecipe));

		Meal dto = new Meal(id, EATEN_AT, "Europe/Budapest", List.of(recipeItem(UUID.randomUUID(), id, recipeId, 1.0, 0)), false);

		assertThatThrownBy(() -> service.create(userId, dto)).isInstanceOf(EntityNotFoundException.class);
	}

	@Test
	void create_rejectsFoodItem_whenFoodIsMissingReferencedQuantity() {
		UUID userId = UUID.randomUUID();
		UUID id = UUID.randomUUID();
		UUID foodId = UUID.randomUUID();
		when(repository.findById(id)).thenReturn(Optional.empty());
		when(itemRepository.findByMealId(id)).thenReturn(List.of());
		liveFood(foodId);

		MealItem badItem = new MealItem(UUID.randomUUID(), id, MealItem.TypeEnum.FOOD, BigDecimal.ONE, 0, false);
		badItem.foodId(foodId); // quantityAmount/quantityUnit left unset

		Meal dto = new Meal(id, EATEN_AT, "Europe/Budapest", List.of(badItem), false);

		assertThatThrownBy(() -> service.create(userId, dto)).isInstanceOf(ValidationException.class);
	}

	@Test
	void create_savesFoodAndCustomItems_withTypeSpecificFields() {
		UUID userId = UUID.randomUUID();
		UUID id = UUID.randomUUID();
		UUID foodItemId = UUID.randomUUID();
		UUID customItemId = UUID.randomUUID();
		UUID foodId = UUID.randomUUID();
		when(repository.findById(id)).thenReturn(Optional.empty());
		when(itemRepository.findByMealId(id)).thenReturn(List.of());
		liveFood(foodId);

		Meal dto = new Meal(id, EATEN_AT, "Europe/Budapest",
				List.of(foodItem(foodItemId, id, foodId, 2.0, 0), customItem(customItemId, id, 1.0, 1)), false);
		service.create(userId, dto);

		ArgumentCaptor<MealItemEntity> captor = ArgumentCaptor.forClass(MealItemEntity.class);
		verify(itemRepository, times(2)).save(captor.capture());
		assertThat(captor.getAllValues()).extracting(MealItemEntity::getId).containsExactlyInAnyOrder(foodItemId, customItemId);
	}

	// --- update: item diff (add / keep+reorder / remove), no stock re-adjustment concern here (frontend-only) ---

	@Test
	void update_addsNewItem_andSoftDeletesMissingItem() {
		UUID userId = UUID.randomUUID();
		UUID mealId = UUID.randomUUID();
		MealEntity existing = meal(mealId, userId);
		UUID keptId = UUID.randomUUID();
		UUID removedId = UUID.randomUUID();
		UUID recipeId = UUID.randomUUID();
		MealItemEntity kept = new MealItemEntity(keptId, mealId, "RECIPE", 0);
		kept.setRecipeId(recipeId);
		kept.setServings(BigDecimal.ONE);
		MealItemEntity removed = new MealItemEntity(removedId, mealId, "CUSTOM", 1);
		removed.setServings(BigDecimal.ONE);

		when(repository.findByIdAndUserId(mealId, userId)).thenReturn(Optional.of(existing));
		when(itemRepository.findByMealId(mealId)).thenReturn(List.of(kept, removed));
		liveRecipe(recipeId);

		UUID newId = UUID.randomUUID();
		Meal dto = new Meal(mealId, EATEN_AT, "Europe/Budapest",
				List.of(recipeItem(keptId, mealId, recipeId, 1.0, 0), customItem(newId, mealId, 1.0, 1)), false);

		service.update(userId, mealId, dto);

		assertThat(removed.isDeleted()).isTrue();
		verify(itemRepository).save(removed);
		verify(itemRepository).save(kept);
		ArgumentCaptor<MealItemEntity> captor = ArgumentCaptor.forClass(MealItemEntity.class);
		verify(itemRepository, times(3)).save(captor.capture());
		assertThat(captor.getAllValues()).anySatisfy(e -> assertThat(e.getId()).isEqualTo(newId));
	}

	@Test
	void update_revivesTombstonedItem_whenItsIdReappearsInIncomingLiveList() {
		UUID userId = UUID.randomUUID();
		UUID mealId = UUID.randomUUID();
		MealEntity existing = meal(mealId, userId);
		MealItemEntity tombstoned = new MealItemEntity(UUID.randomUUID(), mealId, "CUSTOM", 0);
		tombstoned.setServings(BigDecimal.ONE);
		tombstoned.softDelete();

		when(repository.findByIdAndUserId(mealId, userId)).thenReturn(Optional.of(existing));
		when(itemRepository.findByMealId(mealId)).thenReturn(List.of(tombstoned));

		Meal dto = new Meal(mealId, EATEN_AT, "Europe/Budapest", List.of(customItem(tombstoned.getId(), mealId, 1.0, 0)), false);
		service.update(userId, mealId, dto);

		assertThat(tombstoned.isDeleted()).isFalse();
		verify(itemRepository).save(tombstoned);
	}

	@Test
	void update_throwsEntityDeleted_whenMealAlreadyDeleted() {
		UUID userId = UUID.randomUUID();
		MealEntity existing = meal(UUID.randomUUID(), userId);
		existing.softDelete();
		when(repository.findByIdAndUserId(existing.getId(), userId)).thenReturn(Optional.of(existing));

		Meal dto = new Meal(existing.getId(), EATEN_AT, "Europe/Budapest", List.of(), false);

		assertThatThrownBy(() -> service.update(userId, existing.getId(), dto)).isInstanceOf(EntityDeletedException.class);
		verify(repository, never()).saveAndFlush(any());
	}

	@Test
	void update_throwsNotFound_whenMealBelongsToAnotherUser() {
		UUID attacker = UUID.randomUUID();
		UUID id = UUID.randomUUID();
		when(repository.findByIdAndUserId(id, attacker)).thenReturn(Optional.empty());

		Meal dto = new Meal(id, EATEN_AT, "Europe/Budapest", List.of(), false);

		assertThatThrownBy(() -> service.update(attacker, id, dto)).isInstanceOf(EntityNotFoundException.class);
	}

	// --- get ---

	@Test
	void get_throwsNotFound_whenMealBelongsToAnotherUser() {
		UUID attacker = UUID.randomUUID();
		UUID id = UUID.randomUUID();
		when(repository.findByIdAndUserId(id, attacker)).thenReturn(Optional.empty());

		assertThatThrownBy(() -> service.get(attacker, id)).isInstanceOf(EntityNotFoundException.class);
	}

	// --- delete (soft, cascading, idempotent) ---

	@Test
	void delete_softDeletesMealAndCascadesToLiveItems() {
		UUID userId = UUID.randomUUID();
		MealEntity existing = meal(UUID.randomUUID(), userId);
		MealItemEntity liveItem = new MealItemEntity(UUID.randomUUID(), existing.getId(), "CUSTOM", 0);
		when(repository.findByIdAndUserId(existing.getId(), userId)).thenReturn(Optional.of(existing));
		when(itemRepository.findByMealIdAndDeletedFalse(existing.getId())).thenReturn(List.of(liveItem));
		when(itemRepository.findByMealId(existing.getId())).thenReturn(List.of(liveItem));

		Meal deleted = service.delete(userId, existing.getId());

		assertThat(deleted.getDeleted()).isTrue();
		assertThat(liveItem.isDeleted()).isTrue();
		verify(itemRepository).save(liveItem);
	}

	@Test
	void delete_isIdempotent_whenMealAlreadyDeleted() {
		UUID userId = UUID.randomUUID();
		MealEntity existing = meal(UUID.randomUUID(), userId);
		existing.softDelete();
		when(repository.findByIdAndUserId(existing.getId(), userId)).thenReturn(Optional.of(existing));
		when(itemRepository.findByMealId(existing.getId())).thenReturn(List.of());

		Meal deleted = service.delete(userId, existing.getId());

		assertThat(deleted.getDeleted()).isTrue();
		verify(repository, never()).saveAndFlush(any());
		verify(itemRepository, never()).findByMealIdAndDeletedFalse(any());
	}

	// --- list ---

	@Test
	void list_returnsMappedMealsForUser() {
		UUID userId = UUID.randomUUID();
		MealEntity m1 = meal(UUID.randomUUID(), userId);
		MealEntity m2 = meal(UUID.randomUUID(), userId);
		when(repository.findByUserIdAndDeletedFalseOrderByEatenAtAsc(userId)).thenReturn(List.of(m1, m2));
		when(itemRepository.findByMealIdIn(any())).thenReturn(List.of());

		List<Meal> result = service.list(userId);

		assertThat(result).hasSize(2).extracting(Meal::getId).containsExactly(m1.getId(), m2.getId());
	}
}
