package hu.bumler.lm2.food;

import java.math.BigDecimal;
import java.util.List;
import java.util.Objects;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import hu.bumler.lm2.api.model.Food;
import hu.bumler.lm2.common.BarcodeNormalizer;
import hu.bumler.lm2.common.NameNormalizer;
import hu.bumler.lm2.common.QuantityConverter;
import hu.bumler.lm2.common.exception.EntityDeletedException;
import hu.bumler.lm2.common.exception.EntityNotFoundException;
import hu.bumler.lm2.common.exception.UniqueViolationException;

/**
 * documentation/Subfeatures/Élelmiszerek.md — shared/global catalog: no per-user ownership, so
 * unlike every other feature's service, there is no owner check on read/update/delete. The
 * duplicate check is application-level across every field (documentation/Architektúra/
 * Névegyediség.md "Mezőhalmaz-egyediség"), not a single unique index.
 */
@Service
class FoodService {

	private final FoodRepository repository;
	private final StoredFoodRepository storedFoodRepository;
	private final RecipeIngredientRepository recipeIngredientRepository;
	private final MealItemRepository mealItemRepository;
	private final MealRepository mealRepository;
	private final ShoppingListItemRepository shoppingListItemRepository;
	private final FoodMapper mapper;

	FoodService(FoodRepository repository, StoredFoodRepository storedFoodRepository, RecipeIngredientRepository recipeIngredientRepository,
			MealItemRepository mealItemRepository, MealRepository mealRepository, ShoppingListItemRepository shoppingListItemRepository,
			FoodMapper mapper) {
		this.repository = repository;
		this.storedFoodRepository = storedFoodRepository;
		this.recipeIngredientRepository = recipeIngredientRepository;
		this.mealItemRepository = mealItemRepository;
		this.mealRepository = mealRepository;
		this.shoppingListItemRepository = shoppingListItemRepository;
		this.mapper = mapper;
	}

	@Transactional(readOnly = true)
	List<Food> list() {
		return repository.findByDeletedFalseOrderByNameAsc().stream().map(mapper::toDto).toList();
	}

	@Transactional(readOnly = true)
	Food get(UUID id) {
		FoodEntity entity = repository.findById(id).orElseThrow(() -> new EntityNotFoundException("No such food"));
		return mapper.toDto(entity);
	}

	/** Idempotent upsert on the client-supplied id (documentation/Architektúra/Backend.md "Upsert"). */
	@Transactional
	Food create(Food dto) {
		FoodEntity entity = repository.findById(dto.getId()).orElseGet(() -> new FoodEntity(dto.getId()));
		applyFields(entity, dto);
		return mapper.toDto(repository.saveAndFlush(entity));
	}

	@Transactional
	Food update(UUID id, Food dto) {
		FoodEntity entity = repository.findById(id).orElseThrow(() -> new EntityNotFoundException("No such food"));
		if (entity.isDeleted()) {
			throw new EntityDeletedException("Food already deleted");
		}
		applyFields(entity, dto);
		return mapper.toDto(repository.saveAndFlush(entity));
	}

	/**
	 * Soft delete, idempotent, cascading to every live StoredFood, RecipeIngredient, MealItem, and
	 * ShoppingListItem referencing this catalog item (across every user/recipe/meal/list —
	 * documentation/Subfeatures/Élelmiszerek.md "Törlés"), plus any Meal left with zero live items
	 * as a result (documentation/Subfeatures/Étkezés.md "Cascade"). Unlike Meal, a shopping list is
	 * never auto-deleted by this cascade even if left empty (documentation/Subfeatures/
	 * Bevásárlólista írás.md "Üres aktív lista" — deleted manually instead).
	 */
	@Transactional
	Food delete(UUID id) {
		FoodEntity entity = repository.findById(id).orElseThrow(() -> new EntityNotFoundException("No such food"));
		if (!entity.isDeleted()) {
			entity.softDelete();
			repository.saveAndFlush(entity);
			for (StoredFoodEntity storedFood : storedFoodRepository.findByFoodIdAndDeletedFalse(id)) {
				storedFood.softDelete();
				storedFoodRepository.save(storedFood);
			}
			storedFoodRepository.flush();
			for (RecipeIngredientEntity ingredient : recipeIngredientRepository.findByFoodIdAndDeletedFalse(id)) {
				ingredient.softDelete();
				recipeIngredientRepository.save(ingredient);
			}
			recipeIngredientRepository.flush();
			MealCascade.cascade(mealItemRepository.findByFoodIdAndDeletedFalse(id), mealItemRepository, mealRepository);
			ShoppingListItemCascade.cascade(shoppingListItemRepository.findByFoodIdAndDeletedFalse(id), shoppingListItemRepository);
		}
		return mapper.toDto(entity);
	}

	private void applyFields(FoodEntity entity, Food dto) {
		String normalizedName = NameNormalizer.normalize(dto.getName());
		String barcode = dto.getBarcode().orElse(null);
		String normalizedBarcode = BarcodeNormalizer.normalize(barcode);
		String store = dto.getStore().orElse(null);
		String brand = dto.getBrand().orElse(null);
		String note = dto.getNote().orElse(null);
		Integer priceHuf = dto.getPriceHuf().orElse(null);
		BigDecimal netAmount = dto.getNetAmount().orElse(null);
		String netUnit = dto.getNetUnit().orElse(null);
		BigDecimal energyKcal = dto.getEnergyKcal().orElse(null);
		BigDecimal fatG = dto.getFatG().orElse(null);
		BigDecimal fatSaturatedG = dto.getFatSaturatedG().orElse(null);
		BigDecimal fatUnsaturatedG = dto.getFatUnsaturatedG().orElse(null);
		BigDecimal fatTransG = dto.getFatTransG().orElse(null);
		BigDecimal carbsG = dto.getCarbsG().orElse(null);
		BigDecimal carbsSugarsG = dto.getCarbsSugarsG().orElse(null);
		BigDecimal carbsComplexG = dto.getCarbsComplexG().orElse(null);
		BigDecimal carbsFiberG = dto.getCarbsFiberG().orElse(null);
		BigDecimal proteinG = dto.getProteinG().orElse(null);
		BigDecimal saltG = dto.getSaltG().orElse(null);
		BigDecimal sodiumG = dto.getSodiumG().orElse(null);
		BigDecimal chlorideG = dto.getChlorideG().orElse(null);
		BigDecimal shelfRoomAmount = dto.getShelfRoomAmount().orElse(null);
		String shelfRoomUnit = dto.getShelfRoomUnit().orElse(null);
		BigDecimal shelfFridgeAmount = dto.getShelfFridgeAmount().orElse(null);
		String shelfFridgeUnit = dto.getShelfFridgeUnit().orElse(null);
		BigDecimal shelfFreezerAmount = dto.getShelfFreezerAmount().orElse(null);
		String shelfFreezerUnit = dto.getShelfFreezerUnit().orElse(null);
		BigDecimal shelfAfterOpeningAmount = dto.getShelfAfterOpeningAmount().orElse(null);
		String shelfAfterOpeningUnit = dto.getShelfAfterOpeningUnit().orElse(null);

		findLiveDuplicate(entity.getId(), normalizedName, store, brand, note, normalizedBarcode, priceHuf, netAmount, netUnit, energyKcal, fatG,
				fatSaturatedG, fatUnsaturatedG, fatTransG, carbsG, carbsSugarsG, carbsComplexG, carbsFiberG, proteinG, saltG, sodiumG, chlorideG,
				shelfRoomAmount, shelfRoomUnit, shelfFridgeAmount, shelfFridgeUnit, shelfFreezerAmount, shelfFreezerUnit, shelfAfterOpeningAmount,
				shelfAfterOpeningUnit)
				.ifPresent(conflict -> {
					throw new UniqueViolationException("An identical food already exists", "name", conflict.getId());
				});

		entity.rename(dto.getName(), normalizedName);
		entity.setStore(store);
		entity.setBrand(brand);
		entity.setBarcode(barcode, normalizedBarcode);
		entity.setNote(note);
		entity.setPriceHuf(priceHuf);
		entity.setNetAmount(netAmount, netUnit);
		entity.setEnergyKcal(energyKcal);
		entity.setFatG(fatG);
		entity.setFatSaturatedG(fatSaturatedG);
		entity.setFatUnsaturatedG(fatUnsaturatedG);
		entity.setFatTransG(fatTransG);
		entity.setCarbsG(carbsG);
		entity.setCarbsSugarsG(carbsSugarsG);
		entity.setCarbsComplexG(carbsComplexG);
		entity.setCarbsFiberG(carbsFiberG);
		entity.setProteinG(proteinG);
		entity.setSaltG(saltG);
		entity.setSodiumG(sodiumG);
		entity.setChlorideG(chlorideG);
		entity.setShelfRoom(shelfRoomAmount, shelfRoomUnit);
		entity.setShelfFridge(shelfFridgeAmount, shelfFridgeUnit);
		entity.setShelfFreezer(shelfFreezerAmount, shelfFreezerUnit);
		entity.setShelfAfterOpening(shelfAfterOpeningAmount, shelfAfterOpeningUnit);
	}

	/**
	 * documentation/Architektúra/Névegyediség.md "Mezőhalmaz-egyediség": every field must match a
	 * live row (excluding the row being saved) for it to count as a duplicate. Text fields compare
	 * via NameNormalizer (null treated as ""), the barcode via its own normalized form, numbers by
	 * exact value with null != 0, and quantity/duration pairs via QuantityConverter's canonical
	 * base-unit equality.
	 */
	private java.util.Optional<FoodEntity> findLiveDuplicate(UUID selfId, String normalizedName, String store, String brand, String note,
			String normalizedBarcode, Integer priceHuf, BigDecimal netAmount, String netUnit, BigDecimal energyKcal, BigDecimal fatG,
			BigDecimal fatSaturatedG, BigDecimal fatUnsaturatedG, BigDecimal fatTransG, BigDecimal carbsG, BigDecimal carbsSugarsG,
			BigDecimal carbsComplexG, BigDecimal carbsFiberG, BigDecimal proteinG, BigDecimal saltG, BigDecimal sodiumG, BigDecimal chlorideG,
			BigDecimal shelfRoomAmount, String shelfRoomUnit, BigDecimal shelfFridgeAmount, String shelfFridgeUnit, BigDecimal shelfFreezerAmount,
			String shelfFreezerUnit, BigDecimal shelfAfterOpeningAmount, String shelfAfterOpeningUnit) {
		return repository.findByDeletedFalse().stream()
				.filter(existing -> !existing.getId().equals(selfId))
				.filter(existing -> Objects.equals(existing.getNameNormalized(), normalizedName))
				.filter(existing -> textEquals(existing.getStore(), store))
				.filter(existing -> textEquals(existing.getBrand(), brand))
				.filter(existing -> textEquals(existing.getNote(), note))
				.filter(existing -> Objects.equals(nullToEmpty(existing.getBarcodeNormalized()), nullToEmpty(normalizedBarcode)))
				.filter(existing -> Objects.equals(existing.getPriceHuf(), priceHuf))
				.filter(existing -> QuantityConverter.quantitiesEqual(existing.getNetAmount(), existing.getNetUnit(), netAmount, netUnit))
				.filter(existing -> numberEquals(existing.getEnergyKcal(), energyKcal))
				.filter(existing -> numberEquals(existing.getFatG(), fatG))
				.filter(existing -> numberEquals(existing.getFatSaturatedG(), fatSaturatedG))
				.filter(existing -> numberEquals(existing.getFatUnsaturatedG(), fatUnsaturatedG))
				.filter(existing -> numberEquals(existing.getFatTransG(), fatTransG))
				.filter(existing -> numberEquals(existing.getCarbsG(), carbsG))
				.filter(existing -> numberEquals(existing.getCarbsSugarsG(), carbsSugarsG))
				.filter(existing -> numberEquals(existing.getCarbsComplexG(), carbsComplexG))
				.filter(existing -> numberEquals(existing.getCarbsFiberG(), carbsFiberG))
				.filter(existing -> numberEquals(existing.getProteinG(), proteinG))
				.filter(existing -> numberEquals(existing.getSaltG(), saltG))
				.filter(existing -> numberEquals(existing.getSodiumG(), sodiumG))
				.filter(existing -> numberEquals(existing.getChlorideG(), chlorideG))
				.filter(existing -> QuantityConverter.durationsEqual(existing.getShelfRoomAmount(), existing.getShelfRoomUnit(), shelfRoomAmount,
						shelfRoomUnit))
				.filter(existing -> QuantityConverter.durationsEqual(existing.getShelfFridgeAmount(), existing.getShelfFridgeUnit(),
						shelfFridgeAmount, shelfFridgeUnit))
				.filter(existing -> QuantityConverter.durationsEqual(existing.getShelfFreezerAmount(), existing.getShelfFreezerUnit(),
						shelfFreezerAmount, shelfFreezerUnit))
				.filter(existing -> QuantityConverter.durationsEqual(existing.getShelfAfterOpeningAmount(), existing.getShelfAfterOpeningUnit(),
						shelfAfterOpeningAmount, shelfAfterOpeningUnit))
				.findFirst();
	}

	private static boolean textEquals(String a, String b) {
		return Objects.equals(NameNormalizer.normalize(nullToEmpty(a)), NameNormalizer.normalize(nullToEmpty(b)));
	}

	private static String nullToEmpty(String value) {
		return value == null ? "" : value;
	}

	/** documentation/Architektúra/Névegyediség.md: exact value match, null != 0. */
	private static boolean numberEquals(BigDecimal a, BigDecimal b) {
		if (a == null || b == null) {
			return a == null && b == null;
		}
		return a.compareTo(b) == 0;
	}
}
