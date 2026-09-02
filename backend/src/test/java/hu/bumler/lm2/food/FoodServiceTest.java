package hu.bumler.lm2.food;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import hu.bumler.lm2.api.model.Food;
import hu.bumler.lm2.common.exception.EntityDeletedException;
import hu.bumler.lm2.common.exception.EntityNotFoundException;
import hu.bumler.lm2.common.exception.UniqueViolationException;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/** Plain JUnit 5 + Mockito, no Spring context (spring-boot-conventions testing.md). */
class FoodServiceTest {

	private FoodRepository repository;
	private StoredFoodRepository storedFoodRepository;
	private RecipeIngredientRepository recipeIngredientRepository;
	private MealItemRepository mealItemRepository;
	private MealRepository mealRepository;
	private ShoppingListItemRepository shoppingListItemRepository;
	private FoodService service;

	@BeforeEach
	void setUp() {
		repository = mock(FoodRepository.class);
		storedFoodRepository = mock(StoredFoodRepository.class);
		recipeIngredientRepository = mock(RecipeIngredientRepository.class);
		mealItemRepository = mock(MealItemRepository.class);
		mealRepository = mock(MealRepository.class);
		shoppingListItemRepository = mock(ShoppingListItemRepository.class);
		when(repository.findByDeletedFalse()).thenReturn(List.of());
		when(repository.saveAndFlush(any())).thenAnswer(inv -> inv.getArgument(0));
		when(storedFoodRepository.findByFoodIdAndDeletedFalse(any())).thenReturn(List.of());
		when(recipeIngredientRepository.findByFoodIdAndDeletedFalse(any())).thenReturn(List.of());
		when(mealItemRepository.findByFoodIdAndDeletedFalse(any())).thenReturn(List.of());
		service = new FoodService(repository, storedFoodRepository, recipeIngredientRepository, mealItemRepository, mealRepository,
				shoppingListItemRepository, new FoodMapper());
	}

	private static Food food(UUID id, String name) {
		return new Food(id, name, false);
	}

	// --- create (idempotent upsert) ---

	@Test
	void create_insertsNewFood_whenIdNotFoundAnywhere() {
		UUID id = UUID.randomUUID();
		when(repository.findById(id)).thenReturn(Optional.empty());

		Food saved = service.create(food(id, "Tej"));

		assertThat(saved.getId()).isEqualTo(id);
		assertThat(saved.getName()).isEqualTo("Tej");
	}

	@Test
	void create_isIdempotent_whenTheSameIdIsPostedTwice() {
		UUID id = UUID.randomUUID();
		FoodEntity existing = new FoodEntity(id);
		existing.rename("Tej", "tej");
		when(repository.findById(id)).thenReturn(Optional.empty()).thenReturn(Optional.of(existing));

		service.create(food(id, "Tej"));
		Food second = service.create(food(id, "Tej"));

		assertThat(second.getName()).isEqualTo("Tej");
	}

	@Test
	void create_onlyRequiresName_everyOtherFieldOptional() {
		UUID id = UUID.randomUUID();
		when(repository.findById(id)).thenReturn(Optional.empty());

		Food saved = service.create(food(id, "Tej"));

		assertThat(saved.getStore().orElse(null)).isNull();
		assertThat(saved.getEnergyKcal().orElse(null)).isNull();
	}

	@Test
	void create_throwsUniqueViolation_whenEveryFieldMatchesALiveItem() {
		UUID conflictId = UUID.randomUUID();
		FoodEntity conflict = new FoodEntity(conflictId);
		conflict.rename("Tej", "tej");
		conflict.setStore("Aldi");
		conflict.setEnergyKcal(BigDecimal.valueOf(42));
		when(repository.findByDeletedFalse()).thenReturn(List.of(conflict));

		UUID newId = UUID.randomUUID();
		when(repository.findById(newId)).thenReturn(Optional.empty());
		Food dto = food(newId, "Tej").store("Aldi").energyKcal(BigDecimal.valueOf(42));

		assertThatThrownBy(() -> service.create(dto))
				.isInstanceOf(UniqueViolationException.class)
				.satisfies(ex -> assertThat(((UniqueViolationException) ex).getConflictingId()).isEqualTo(conflictId));
		verify(repository, never()).saveAndFlush(any());
	}

	@Test
	void create_allowsPartialMatch_whenOnlyTheNameIsTheSame() {
		// documentation/Subfeatures/Élelmiszerek.md: "ugyanaz a termék más üzletben = külön tétel".
		UUID existingId = UUID.randomUUID();
		FoodEntity existing = new FoodEntity(existingId);
		existing.rename("Tej", "tej");
		existing.setStore("Aldi");
		when(repository.findByDeletedFalse()).thenReturn(List.of(existing));

		UUID newId = UUID.randomUUID();
		when(repository.findById(newId)).thenReturn(Optional.empty());
		Food dto = food(newId, "Tej").store("Lidl");

		Food saved = service.create(dto);

		assertThat(saved.getStore().orElse(null)).isEqualTo("Lidl");
	}

	@Test
	void create_treatsNullAndZeroAsDifferent_forNumericFields() {
		// documentation/Architektúra/Névegyediség.md: "null != 0".
		UUID existingId = UUID.randomUUID();
		FoodEntity existing = new FoodEntity(existingId);
		existing.rename("Só", "só");
		existing.setEnergyKcal(null);
		when(repository.findByDeletedFalse()).thenReturn(List.of(existing));

		UUID newId = UUID.randomUUID();
		when(repository.findById(newId)).thenReturn(Optional.empty());
		Food dto = food(newId, "Só").energyKcal(BigDecimal.ZERO);

		Food saved = service.create(dto);

		assertThat(saved.getEnergyKcal().orElse(null)).isEqualByComparingTo(BigDecimal.ZERO);
	}

	@Test
	void create_treatsDifferentUnitFamiliesAsNeverEqual_evenWithMatchingNumericAmount() {
		// documentation/Architektúra/Mennyiség mező.md: "egy 3db és egy 3g érték soha nem egyenlő".
		UUID existingId = UUID.randomUUID();
		FoodEntity existing = new FoodEntity(existingId);
		existing.rename("Tojás", "tojás");
		existing.setNetAmount(BigDecimal.valueOf(3), "cs");
		when(repository.findByDeletedFalse()).thenReturn(List.of(existing));

		UUID newId = UUID.randomUUID();
		when(repository.findById(newId)).thenReturn(Optional.empty());
		Food dto = food(newId, "Tojás").netAmount(BigDecimal.valueOf(3)).netUnit("g");

		Food saved = service.create(dto);

		assertThat(saved.getNetUnit().orElse(null)).isEqualTo("g");
	}

	@Test
	void create_treatsDifferentUnitsOfTheSameFamilyAsEqual_whenCanonicalAmountMatches() {
		// documentation/Architektúra/Mennyiség mező.md: "1 l = 100 cl".
		UUID conflictId = UUID.randomUUID();
		FoodEntity conflict = new FoodEntity(conflictId);
		conflict.rename("Tej", "tej");
		conflict.setNetAmount(BigDecimal.ONE, "l");
		when(repository.findByDeletedFalse()).thenReturn(List.of(conflict));

		UUID newId = UUID.randomUUID();
		when(repository.findById(newId)).thenReturn(Optional.empty());
		Food dto = food(newId, "Tej").netAmount(BigDecimal.valueOf(100)).netUnit("cl");

		assertThatThrownBy(() -> service.create(dto)).isInstanceOf(UniqueViolationException.class);
	}

	// --- backlog/063 darab-definíció (pieceAmount / pieceUnit) ---

	@Test
	void create_pieceDefinitionParticipatesInDuplicateDetection() {
		UUID existingId = UUID.randomUUID();
		FoodEntity existing = new FoodEntity(existingId);
		existing.rename("Túró Rudi", "túró rudi");
		existing.setPiece(BigDecimal.valueOf(0.1667), "cs");
		when(repository.findByDeletedFalse()).thenReturn(List.of(existing));

		UUID newId = UUID.randomUUID();
		when(repository.findById(newId)).thenReturn(Optional.empty());

		// Different piece definition -> not a duplicate.
		Food distinct = food(newId, "Túró Rudi").pieceAmount(BigDecimal.valueOf(30)).pieceUnit("g");
		assertThat(service.create(distinct).getPieceUnit().orElse(null)).isEqualTo("g");

		// Same piece definition -> duplicate.
		Food same = food(UUID.randomUUID(), "Túró Rudi").pieceAmount(BigDecimal.valueOf(0.1667)).pieceUnit("cs");
		when(repository.findById(any())).thenReturn(Optional.empty());
		assertThatThrownBy(() -> service.create(same)).isInstanceOf(UniqueViolationException.class);
	}

	@Test
	void create_rejectsHalfFilledPieceDefinition() {
		UUID id = UUID.randomUUID();
		when(repository.findById(id)).thenReturn(Optional.empty());

		assertThatThrownBy(() -> service.create(food(id, "X").pieceAmount(BigDecimal.valueOf(30))))
				.isInstanceOf(hu.bumler.lm2.common.exception.ValidationException.class);
	}

	@Test
	void create_rejectsDbAsPieceUnit() {
		UUID id = UUID.randomUUID();
		when(repository.findById(id)).thenReturn(Optional.empty());

		assertThatThrownBy(() -> service.create(food(id, "X").pieceAmount(BigDecimal.ONE).pieceUnit("db")))
				.isInstanceOf(hu.bumler.lm2.common.exception.ValidationException.class);
	}

	// --- update ---

	@Test
	void update_allowsKeepingItsOwnValues_whenSavingUnchanged() {
		UUID id = UUID.randomUUID();
		FoodEntity existing = new FoodEntity(id);
		existing.rename("Tej", "tej");
		when(repository.findById(id)).thenReturn(Optional.of(existing));
		when(repository.findByDeletedFalse()).thenReturn(List.of(existing));

		Food saved = service.update(id, food(id, "Tej"));

		assertThat(saved.getName()).isEqualTo("Tej");
	}

	@Test
	void update_throwsEntityDeleted_whenAlreadyDeleted() {
		UUID id = UUID.randomUUID();
		FoodEntity existing = new FoodEntity(id);
		existing.rename("Tej", "tej");
		existing.softDelete();
		when(repository.findById(id)).thenReturn(Optional.of(existing));

		assertThatThrownBy(() -> service.update(id, food(id, "Tej"))).isInstanceOf(EntityDeletedException.class);
		verify(repository, never()).saveAndFlush(any());
	}

	// --- get ---

	@Test
	void get_throwsNotFound_whenIdUnknown() {
		UUID id = UUID.randomUUID();
		when(repository.findById(id)).thenReturn(Optional.empty());

		assertThatThrownBy(() -> service.get(id)).isInstanceOf(EntityNotFoundException.class);
	}

	// --- delete (soft, idempotent) ---

	@Test
	void delete_softDeletes_whenNotYetDeleted() {
		UUID id = UUID.randomUUID();
		FoodEntity existing = new FoodEntity(id);
		existing.rename("Tej", "tej");
		when(repository.findById(id)).thenReturn(Optional.of(existing));

		Food deleted = service.delete(id);

		assertThat(deleted.getDeleted()).isTrue();
		verify(repository).saveAndFlush(existing);
	}

	@Test
	void delete_isIdempotent_whenAlreadyDeleted() {
		UUID id = UUID.randomUUID();
		FoodEntity existing = new FoodEntity(id);
		existing.rename("Tej", "tej");
		existing.softDelete();
		when(repository.findById(id)).thenReturn(Optional.of(existing));

		Food deleted = service.delete(id);

		assertThat(deleted.getDeleted()).isTrue();
		verify(repository, never()).saveAndFlush(any());
	}

	@Test
	void delete_cascadesToLiveStoredFoodReferencingThisCatalogItem() {
		// documentation/Subfeatures/Élelmiszer tárolás.md "Törlés".
		UUID id = UUID.randomUUID();
		FoodEntity existing = new FoodEntity(id);
		existing.rename("Tej", "tej");
		when(repository.findById(id)).thenReturn(Optional.of(existing));
		StoredFoodEntity storedFood = new StoredFoodEntity(UUID.randomUUID(), UUID.randomUUID());
		when(storedFoodRepository.findByFoodIdAndDeletedFalse(id)).thenReturn(List.of(storedFood));

		service.delete(id);

		assertThat(storedFood.isDeleted()).isTrue();
		verify(storedFoodRepository).save(storedFood);
	}

	@Test
	void delete_cascadesToLiveRecipeIngredientReferencingThisCatalogItem() {
		// documentation/Subfeatures/Élelmiszerek.md "Törlés".
		UUID id = UUID.randomUUID();
		FoodEntity existing = new FoodEntity(id);
		existing.rename("Tej", "tej");
		when(repository.findById(id)).thenReturn(Optional.of(existing));
		RecipeIngredientEntity ingredient = new RecipeIngredientEntity(UUID.randomUUID(), UUID.randomUUID(), id, BigDecimal.ONE, "l", 0);
		when(recipeIngredientRepository.findByFoodIdAndDeletedFalse(id)).thenReturn(List.of(ingredient));

		service.delete(id);

		assertThat(ingredient.isDeleted()).isTrue();
		verify(recipeIngredientRepository).save(ingredient);
	}

	@Test
	void delete_cascadesToLiveMealItemReferencingThisCatalogItem_andSoftDeletesNowEmptyMeal() {
		// documentation/Subfeatures/Étkezés.md "Cascade".
		UUID id = UUID.randomUUID();
		FoodEntity existing = new FoodEntity(id);
		existing.rename("Tej", "tej");
		when(repository.findById(id)).thenReturn(Optional.of(existing));
		UUID mealId = UUID.randomUUID();
		MealItemEntity mealItem = new MealItemEntity(UUID.randomUUID(), mealId, "FOOD", 0);
		mealItem.setFoodId(id);
		when(mealItemRepository.findByFoodIdAndDeletedFalse(id)).thenReturn(List.of(mealItem));
		when(mealItemRepository.findByMealIdAndDeletedFalse(mealId)).thenReturn(List.of());
		MealEntity meal = new MealEntity(mealId, UUID.randomUUID());
		when(mealRepository.findById(mealId)).thenReturn(Optional.of(meal));

		service.delete(id);

		assertThat(mealItem.isDeleted()).isTrue();
		verify(mealItemRepository).save(mealItem);
		assertThat(meal.isDeleted()).isTrue();
		verify(mealRepository).save(meal);
	}

	@Test
	void delete_cascadesToLiveShoppingListItemReferencingThisCatalogItem_withoutTouchingTheList() {
		// documentation/Subfeatures/Bevásárlólista írás.md "Üres aktív lista": unlike Meal, the
		// parent list is never auto-deleted even if this cascade leaves it empty. One bulk UPDATE.
		UUID id = UUID.randomUUID();
		FoodEntity existing = new FoodEntity(id);
		existing.rename("Tej", "tej");
		when(repository.findById(id)).thenReturn(Optional.of(existing));

		service.delete(id);

		verify(shoppingListItemRepository).softDeleteByFoodIdAndDeletedFalse(id);
		verify(shoppingListItemRepository, never()).save(any());
	}

	@Test
	void delete_doesNotSoftDeleteMeal_whenItStillHasOtherLiveItems() {
		UUID id = UUID.randomUUID();
		FoodEntity existing = new FoodEntity(id);
		existing.rename("Tej", "tej");
		when(repository.findById(id)).thenReturn(Optional.of(existing));
		UUID mealId = UUID.randomUUID();
		MealItemEntity mealItem = new MealItemEntity(UUID.randomUUID(), mealId, "FOOD", 0);
		mealItem.setFoodId(id);
		MealItemEntity otherLiveItem = new MealItemEntity(UUID.randomUUID(), mealId, "CUSTOM", 1);
		when(mealItemRepository.findByFoodIdAndDeletedFalse(id)).thenReturn(List.of(mealItem));
		when(mealItemRepository.findByMealIdAndDeletedFalse(mealId)).thenReturn(List.of(otherLiveItem));

		service.delete(id);

		verify(mealRepository, never()).save(any());
	}

	// --- list ---

	@Test
	void list_returnsLiveItemsOnly() {
		FoodEntity a = new FoodEntity(UUID.randomUUID());
		a.rename("Alma", "alma");
		FoodEntity b = new FoodEntity(UUID.randomUUID());
		b.rename("Banán", "banán");
		when(repository.findByDeletedFalseOrderByNameAsc()).thenReturn(List.of(a, b));

		List<Food> result = service.list();

		assertThat(result).extracting(Food::getName).containsExactly("Alma", "Banán");
	}
}
