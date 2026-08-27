package hu.bumler.lm2.food;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import hu.bumler.lm2.api.model.Meal;
import hu.bumler.lm2.api.model.MealItem;
import hu.bumler.lm2.common.NestedChildResolver;
import hu.bumler.lm2.common.exception.EntityDeletedException;
import hu.bumler.lm2.common.exception.EntityNotFoundException;
import hu.bumler.lm2.common.exception.ValidationException;

/**
 * documentation/Subfeatures/Étkezés.md — per-user meal log: nested aggregate PUT like
 * RecipeService/PackingTemplateService, but user-owned like PackingTemplateService/
 * StoredFoodService. Stock deduction ([[Élelmiszer tárolás]]) is deliberately NOT here — it is
 * client-side business logic against the local StoredFood store (see StoredFoodService's own
 * javadoc for the same deferral), so this service only ever validates references and persists.
 */
@Service
class MealService {

	private final MealRepository repository;
	private final MealItemRepository itemRepository;
	private final RecipeRepository recipeRepository;
	private final FoodRepository foodRepository;
	private final MealMapper mapper;
	private final MealItemMapper itemMapper;

	MealService(MealRepository repository, MealItemRepository itemRepository, RecipeRepository recipeRepository, FoodRepository foodRepository,
			MealMapper mapper, MealItemMapper itemMapper) {
		this.repository = repository;
		this.itemRepository = itemRepository;
		this.recipeRepository = recipeRepository;
		this.foodRepository = foodRepository;
		this.mapper = mapper;
		this.itemMapper = itemMapper;
	}

	@Transactional(readOnly = true)
	List<Meal> list(UUID userId) {
		List<MealEntity> meals = repository.findByUserIdAndDeletedFalseOrderByEatenAtAsc(userId);
		var itemsByMeal = groupByMealId(itemRepository.findByMealIdIn(meals.stream().map(MealEntity::getId).toList()));
		return meals.stream().map(meal -> toDto(meal, itemsByMeal.getOrDefault(meal.getId(), List.of()))).toList();
	}

	@Transactional(readOnly = true)
	Meal get(UUID userId, UUID id) {
		MealEntity entity = repository.findByIdAndUserId(id, userId).orElseThrow(() -> new EntityNotFoundException("No such meal"));
		return toDto(entity);
	}

	/** Idempotent upsert on the client-supplied id (documentation/Architektúra/Backend.md "Upsert"). */
	@Transactional
	Meal create(UUID userId, Meal dto) {
		MealEntity entity = repository.findById(dto.getId()).map(existing -> requireOwner(existing, userId))
				.orElseGet(() -> new MealEntity(dto.getId(), userId));
		return saveTree(entity, dto);
	}

	@Transactional
	Meal update(UUID userId, UUID id, Meal dto) {
		MealEntity entity = repository.findByIdAndUserId(id, userId).orElseThrow(() -> new EntityNotFoundException("No such meal"));
		if (entity.isDeleted()) {
			throw new EntityDeletedException("Meal already deleted");
		}
		return saveTree(entity, dto);
	}

	/** Soft delete, idempotent, cascading to every live item on the meal. */
	@Transactional
	Meal delete(UUID userId, UUID id) {
		MealEntity entity = repository.findByIdAndUserId(id, userId).orElseThrow(() -> new EntityNotFoundException("No such meal"));
		if (!entity.isDeleted()) {
			entity.softDelete();
			repository.saveAndFlush(entity);
			for (MealItemEntity item : itemRepository.findByMealIdAndDeletedFalse(id)) {
				item.softDelete();
				itemRepository.save(item);
			}
			itemRepository.flush();
		}
		return toDto(entity);
	}

	/**
	 * documentation/Architektúra/Backend.md "Nested aggregate PUT": the incoming {@code items} list
	 * is the complete desired live tree — an item's presence/absence by id is the only signal.
	 * Items missing from the incoming list are soft-deleted; the response always lists every row,
	 * live or tombstoned (Meal.yaml). documentation/Subfeatures/Étkezés.md "Tételek ≥1 kötelező".
	 */
	private Meal saveTree(MealEntity entity, Meal dto) {
		entity.setEatenAt(dto.getEatenAt(), dto.getTimeZoneId());
		entity.setNote(dto.getNote().orElse(null));
		repository.saveAndFlush(entity);

		List<MealItemEntity> existingItems = itemRepository.findByMealId(entity.getId());
		Set<UUID> incomingIds = new HashSet<>();
		List<MealItemEntity> incomingLive = new ArrayList<>();
		for (MealItem itemDto : dto.getItems()) {
			if (itemDto.getDeleted()) {
				continue;
			}
			incomingIds.add(itemDto.getId());
			MealItemEntity itemEntity = resolveItem(entity.getId(), existingItems, itemDto.getId());
			applyItem(itemEntity, itemDto);
			incomingLive.add(itemEntity);
		}
		if (incomingLive.isEmpty()) {
			throw new ValidationException("A meal must have at least one item", "items");
		}

		for (MealItemEntity itemEntity : incomingLive) {
			itemRepository.save(itemEntity);
		}
		for (MealItemEntity existing : existingItems) {
			if (!existing.isDeleted() && !incomingIds.contains(existing.getId())) {
				existing.softDelete();
				itemRepository.save(existing);
			}
		}
		itemRepository.flush();

		return toDto(entity);
	}

	/** See {@link NestedChildResolver} — shared with RecipeService.resolveIngredient / PackingTemplateService.resolveItem. */
	private MealItemEntity resolveItem(UUID mealId, List<MealItemEntity> existingItems, UUID itemId) {
		return NestedChildResolver.resolve(itemId, existingItems, MealItemEntity::getId, MealItemEntity::isDeleted, MealItemEntity::undelete,
				itemRepository::existsById, () -> new MealItemEntity(itemId, mealId, MealItem.TypeEnum.CUSTOM.getValue(), 0), "No such meal item");
	}

	/** documentation/Subfeatures/Étkezés.md "Tétel — közös": per-type required fields; unused fields on the entity are cleared. */
	private void applyItem(MealItemEntity entity, MealItem dto) {
		MealItem.TypeEnum type = dto.getType();
		entity.setType(type.getValue());
		entity.setRecipeId(null);
		entity.setFoodId(null);
		entity.setQuantity(null, null);
		entity.setDisplayName(null);
		entity.setCaloriesKcal(null);
		entity.setProteinG(null);
		entity.setCarbsG(null);
		entity.setFatG(null);
		entity.setPriceHuf(null);

		switch (type) {
			case RECIPE -> {
				UUID recipeId = dto.getRecipeId().orElseThrow(() -> new ValidationException("recipeId is required for RECIPE items", "recipeId"));
				requireLiveRecipe(recipeId);
				entity.setRecipeId(recipeId);
			}
			case FOOD -> {
				UUID foodId = dto.getFoodId().orElseThrow(() -> new ValidationException("foodId is required for FOOD items", "foodId"));
				requireLiveFood(foodId);
				BigDecimal amount = dto.getQuantityAmount()
						.orElseThrow(() -> new ValidationException("quantityAmount is required for FOOD items", "quantityAmount"));
				String unit = dto.getQuantityUnit().orElseThrow(() -> new ValidationException("quantityUnit is required for FOOD items", "quantityUnit"));
				entity.setFoodId(foodId);
				entity.setQuantity(amount, unit);
			}
			case CUSTOM -> {
				String displayName = dto.getDisplayName()
						.orElseThrow(() -> new ValidationException("displayName is required for CUSTOM items", "displayName"));
				BigDecimal calories = dto.getCaloriesKcal()
						.orElseThrow(() -> new ValidationException("caloriesKcal is required for CUSTOM items", "caloriesKcal"));
				entity.setDisplayName(displayName);
				entity.setCaloriesKcal(calories);
				entity.setProteinG(dto.getProteinG().orElse(null));
				entity.setCarbsG(dto.getCarbsG().orElse(null));
				entity.setFatG(dto.getFatG().orElse(null));
				entity.setPriceHuf(dto.getPriceHuf().orElse(null));
			}
		}

		entity.setServings(dto.getServings());
		entity.setSortOrder(dto.getSortOrder());
	}

	/** documentation/Subfeatures/Recept forrású étkezés.md: a meal item may only reference a live Recipe. */
	private void requireLiveRecipe(UUID recipeId) {
		RecipeEntity recipe = recipeRepository.findById(recipeId).orElseThrow(() -> new EntityNotFoundException("No such recipe"));
		if (recipe.isDeleted()) {
			throw new EntityNotFoundException("No such recipe");
		}
	}

	/** documentation/Subfeatures/Élelmiszer forrású étkezés.md: a meal item may only reference a live Food. */
	private void requireLiveFood(UUID foodId) {
		FoodEntity food = foodRepository.findById(foodId).orElseThrow(() -> new EntityNotFoundException("No such food"));
		if (food.isDeleted()) {
			throw new EntityNotFoundException("No such food");
		}
	}

	private Meal toDto(MealEntity entity) {
		return toDto(entity, itemRepository.findByMealId(entity.getId()));
	}

	private Meal toDto(MealEntity entity, List<MealItemEntity> items) {
		return mapper.toDto(entity, items.stream().map(itemMapper::toDto).toList());
	}

	private static Map<UUID, List<MealItemEntity>> groupByMealId(List<MealItemEntity> items) {
		return items.stream().collect(Collectors.groupingBy(MealItemEntity::getMealId));
	}

	private static MealEntity requireOwner(MealEntity entity, UUID userId) {
		if (!entity.getUserId().equals(userId)) {
			throw new EntityNotFoundException("No such meal");
		}
		return entity;
	}
}
