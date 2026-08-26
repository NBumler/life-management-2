package hu.bumler.lm2.food;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import hu.bumler.lm2.api.model.Recipe;
import hu.bumler.lm2.api.model.RecipeIngredient;
import hu.bumler.lm2.common.exception.EntityDeletedException;
import hu.bumler.lm2.common.exception.EntityNotFoundException;
import hu.bumler.lm2.common.exception.UniqueViolationException;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/** Plain JUnit 5 + Mockito, no Spring context (spring-boot-conventions testing.md). */
class RecipeServiceTest {

	private RecipeRepository repository;
	private RecipeIngredientRepository ingredientRepository;
	private FoodRepository foodRepository;
	private RecipeService service;

	@BeforeEach
	void setUp() {
		repository = mock(RecipeRepository.class);
		ingredientRepository = mock(RecipeIngredientRepository.class);
		foodRepository = mock(FoodRepository.class);
		service = new RecipeService(repository, ingredientRepository, foodRepository, new RecipeMapper(), new RecipeIngredientMapper());
		when(repository.saveAndFlush(any())).thenAnswer(inv -> inv.getArgument(0));
		when(repository.findByDeletedFalse()).thenReturn(List.of());
		when(repository.findByNameNormalizedAndDeletedFalse(any())).thenReturn(Optional.empty());
	}

	private static RecipeEntity recipe(UUID id, String name) {
		RecipeEntity entity = new RecipeEntity(id);
		entity.rename(name, name.toLowerCase());
		return entity;
	}

	private static RecipeIngredientEntity ingredient(UUID id, UUID recipeId, UUID foodId, BigDecimal amount, String unit, int sortOrder) {
		return new RecipeIngredientEntity(id, recipeId, foodId, amount, unit, sortOrder);
	}

	private void liveFood(UUID foodId) {
		FoodEntity food = new FoodEntity(foodId);
		food.rename("Tej", "tej");
		when(foodRepository.findById(foodId)).thenReturn(Optional.of(food));
	}

	// --- create (idempotent upsert) ---

	@Test
	void create_insertsNewRecipe_whenIdNotFoundAnywhere() {
		UUID id = UUID.randomUUID();
		when(repository.findById(id)).thenReturn(Optional.empty());
		when(ingredientRepository.findByRecipeId(id)).thenReturn(List.of());

		Recipe saved = service.create(new Recipe(id, "Rántotta", false, List.of()));

		assertThat(saved.getId()).isEqualTo(id);
		assertThat(saved.getName()).isEqualTo("Rántotta");
	}

	@Test
	void create_throwsUniqueViolationWithConflictingId_whenNameAlreadyLive() {
		UUID id = UUID.randomUUID();
		RecipeEntity conflict = recipe(UUID.randomUUID(), "Rántotta");
		when(repository.findById(id)).thenReturn(Optional.empty());
		when(repository.findByNameNormalizedAndDeletedFalse("rántotta")).thenReturn(Optional.of(conflict));

		Recipe dto = new Recipe(id, "Rántotta", false, List.of());

		assertThatThrownBy(() -> service.create(dto))
				.isInstanceOf(UniqueViolationException.class)
				.satisfies(ex -> {
					UniqueViolationException uve = (UniqueViolationException) ex;
					assertThat(uve.getField()).isEqualTo("name");
					assertThat(uve.getConflictingId()).isEqualTo(conflict.getId());
				});
		verify(repository, never()).saveAndFlush(any());
	}

	@Test
	void create_throwsUniqueViolation_whenLiveIngredientSetMatchesAnotherRecipe_regardlessOfOrder() {
		UUID foodA = UUID.randomUUID();
		UUID foodB = UUID.randomUUID();
		liveFood(foodA);
		liveFood(foodB);

		UUID conflictId = UUID.randomUUID();
		RecipeEntity conflict = recipe(conflictId, "Rántotta 2");
		when(repository.findByDeletedFalse()).thenReturn(List.of(conflict));
		when(ingredientRepository.findByRecipeIdAndDeletedFalse(conflictId)).thenReturn(List.of(
				ingredient(UUID.randomUUID(), conflictId, foodB, BigDecimal.valueOf(2), "db", 0),
				ingredient(UUID.randomUUID(), conflictId, foodA, BigDecimal.valueOf(100), "g", 1)));

		UUID id = UUID.randomUUID();
		when(repository.findById(id)).thenReturn(Optional.empty());
		when(ingredientRepository.findByRecipeId(id)).thenReturn(List.of());

		// Same pairs, opposite order — the set comparison must be order-independent.
		RecipeIngredient ingA = new RecipeIngredient(UUID.randomUUID(), id, foodA, BigDecimal.valueOf(100), "g", 0, false);
		RecipeIngredient ingB = new RecipeIngredient(UUID.randomUUID(), id, foodB, BigDecimal.valueOf(2), "db", 1, false);
		Recipe dto = new Recipe(id, "Rántotta", false, List.of(ingA, ingB));

		assertThatThrownBy(() -> service.create(dto))
				.isInstanceOf(UniqueViolationException.class)
				.satisfies(ex -> assertThat(((UniqueViolationException) ex).getConflictingId()).isEqualTo(conflictId));
		verify(repository, never()).saveAndFlush(any());
	}

	@Test
	void create_allowsTwoEmptyIngredientRecipes_withDifferentNames() {
		// documentation/Subfeatures/Recept.md "Duplikáció": empty-ingredient recipes are only compared by name.
		UUID otherId = UUID.randomUUID();
		RecipeEntity other = recipe(otherId, "Saláta");
		when(repository.findByDeletedFalse()).thenReturn(List.of(other));
		when(ingredientRepository.findByRecipeIdAndDeletedFalse(otherId)).thenReturn(List.of());

		UUID id = UUID.randomUUID();
		when(repository.findById(id)).thenReturn(Optional.empty());
		when(ingredientRepository.findByRecipeId(id)).thenReturn(List.of());

		Recipe saved = service.create(new Recipe(id, "Leves", false, List.of()));

		assertThat(saved.getName()).isEqualTo("Leves");
	}

	@Test
	void create_throwsNotFound_whenIngredientFoodIsDeleted() {
		UUID foodId = UUID.randomUUID();
		FoodEntity deletedFood = new FoodEntity(foodId);
		deletedFood.rename("Tej", "tej");
		deletedFood.softDelete();
		when(foodRepository.findById(foodId)).thenReturn(Optional.of(deletedFood));

		UUID id = UUID.randomUUID();
		when(repository.findById(id)).thenReturn(Optional.empty());
		when(ingredientRepository.findByRecipeId(id)).thenReturn(List.of());

		RecipeIngredient ingredientDto = new RecipeIngredient(UUID.randomUUID(), id, foodId, BigDecimal.ONE, "l", 0, false);
		Recipe dto = new Recipe(id, "Rántotta", false, List.of(ingredientDto));

		assertThatThrownBy(() -> service.create(dto)).isInstanceOf(EntityNotFoundException.class);
		verify(repository, never()).saveAndFlush(any());
	}

	// --- update: ingredient diff (add / keep+reorder / remove) ---

	@Test
	void update_addsNewIngredients_reordersKeptOnes_andSoftDeletesMissingOnes() {
		UUID recipeId = UUID.randomUUID();
		RecipeEntity existing = recipe(recipeId, "Rántotta");
		UUID keptId = UUID.randomUUID();
		UUID removedId = UUID.randomUUID();
		UUID keptFoodId = UUID.randomUUID();
		UUID removedFoodId = UUID.randomUUID();
		UUID newFoodId = UUID.randomUUID();
		RecipeIngredientEntity kept = ingredient(keptId, recipeId, keptFoodId, BigDecimal.valueOf(2), "db", 0);
		RecipeIngredientEntity removed = ingredient(removedId, recipeId, removedFoodId, BigDecimal.ONE, "dl", 1);

		when(repository.findById(recipeId)).thenReturn(Optional.of(existing));
		when(ingredientRepository.findByRecipeId(recipeId)).thenReturn(List.of(kept, removed));
		liveFood(keptFoodId);
		liveFood(newFoodId);

		UUID newIngredientId = UUID.randomUUID();
		RecipeIngredient keptDto = new RecipeIngredient(keptId, recipeId, keptFoodId, BigDecimal.valueOf(2), "db", 1, false);
		RecipeIngredient newDto = new RecipeIngredient(newIngredientId, recipeId, newFoodId, BigDecimal.TEN, "dkg", 0, false);
		Recipe dto = new Recipe(recipeId, "Rántotta", false, List.of(newDto, keptDto));

		service.update(recipeId, dto);

		ArgumentCaptor<RecipeIngredientEntity> captor = ArgumentCaptor.forClass(RecipeIngredientEntity.class);
		verify(ingredientRepository, times(3)).save(captor.capture());
		List<RecipeIngredientEntity> saved = captor.getAllValues();

		assertThat(kept.getSortOrder()).isEqualTo(1);
		assertThat(saved).contains(kept);
		assertThat(saved).anySatisfy(e -> {
			assertThat(e.getId()).isEqualTo(newIngredientId);
			assertThat(e.getFoodId()).isEqualTo(newFoodId);
			assertThat(e.getSortOrder()).isEqualTo(0);
		});
		assertThat(removed.isDeleted()).isTrue();
		assertThat(saved).contains(removed);
	}

	@Test
	void update_rejectsIngredientId_thatBelongsToAnotherRecipe_insteadOfHijackingItViaMerge() {
		UUID myRecipeId = UUID.randomUUID();
		RecipeEntity myRecipe = recipe(myRecipeId, "Rántotta");
		UUID victimFoodId = UUID.randomUUID();
		UUID foreignIngredientId = UUID.randomUUID();

		when(repository.findById(myRecipeId)).thenReturn(Optional.of(myRecipe));
		when(ingredientRepository.findByRecipeId(myRecipeId)).thenReturn(List.of());
		when(ingredientRepository.existsById(foreignIngredientId)).thenReturn(true);
		liveFood(victimFoodId);

		RecipeIngredient hijackDto = new RecipeIngredient(foreignIngredientId, myRecipeId, victimFoodId, BigDecimal.ONE, "db", 0, false);
		Recipe dto = new Recipe(myRecipeId, "Rántotta", false, List.of(hijackDto));

		assertThatThrownBy(() -> service.update(myRecipeId, dto)).isInstanceOf(EntityNotFoundException.class);
		verify(ingredientRepository, never()).save(any());
	}

	@Test
	void update_throwsEntityDeleted_whenRecipeAlreadyDeleted() {
		UUID id = UUID.randomUUID();
		RecipeEntity existing = recipe(id, "Rántotta");
		existing.softDelete();
		when(repository.findById(id)).thenReturn(Optional.of(existing));

		Recipe dto = new Recipe(id, "Rántotta", false, List.of());

		assertThatThrownBy(() -> service.update(id, dto)).isInstanceOf(EntityDeletedException.class);
		verify(repository, never()).saveAndFlush(any());
	}

	@Test
	void update_throwsNotFound_whenRecipeUnknown() {
		UUID id = UUID.randomUUID();
		when(repository.findById(id)).thenReturn(Optional.empty());

		assertThatThrownBy(() -> service.update(id, new Recipe(id, "Tél", false, List.of()))).isInstanceOf(EntityNotFoundException.class);
	}

	// --- get ---

	@Test
	void get_throwsNotFound_whenIdUnknown() {
		UUID id = UUID.randomUUID();
		when(repository.findById(id)).thenReturn(Optional.empty());

		assertThatThrownBy(() -> service.get(id)).isInstanceOf(EntityNotFoundException.class);
	}

	// --- delete (soft, cascading, idempotent) ---

	@Test
	void delete_softDeletesRecipeAndCascadesToLiveIngredients() {
		UUID id = UUID.randomUUID();
		RecipeEntity existing = recipe(id, "Rántotta");
		RecipeIngredientEntity liveIngredient = ingredient(UUID.randomUUID(), id, UUID.randomUUID(), BigDecimal.ONE, "db", 0);
		when(repository.findById(id)).thenReturn(Optional.of(existing));
		when(ingredientRepository.findByRecipeIdAndDeletedFalse(id)).thenReturn(List.of(liveIngredient));
		when(ingredientRepository.findByRecipeId(id)).thenReturn(List.of(liveIngredient));

		Recipe deleted = service.delete(id);

		assertThat(deleted.getDeleted()).isTrue();
		assertThat(liveIngredient.isDeleted()).isTrue();
		verify(ingredientRepository).save(liveIngredient);
	}

	@Test
	void delete_isIdempotent_whenAlreadyDeleted() {
		UUID id = UUID.randomUUID();
		RecipeEntity existing = recipe(id, "Rántotta");
		existing.softDelete();
		when(repository.findById(id)).thenReturn(Optional.of(existing));
		when(ingredientRepository.findByRecipeId(id)).thenReturn(List.of());

		Recipe deleted = service.delete(id);

		assertThat(deleted.getDeleted()).isTrue();
		verify(repository, never()).saveAndFlush(any());
		verify(ingredientRepository, never()).findByRecipeIdAndDeletedFalse(any());
	}

	// --- list ---

	@Test
	void list_returnsMappedRecipes() {
		RecipeEntity a = recipe(UUID.randomUUID(), "Alma leves");
		RecipeEntity b = recipe(UUID.randomUUID(), "Bableves");
		when(repository.findByDeletedFalseOrderByNameAsc()).thenReturn(List.of(a, b));

		List<Recipe> result = service.list();

		assertThat(result).extracting(Recipe::getId).containsExactly(a.getId(), b.getId());
	}
}
