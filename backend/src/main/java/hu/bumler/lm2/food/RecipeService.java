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

import hu.bumler.lm2.api.model.Recipe;
import hu.bumler.lm2.api.model.RecipeIngredient;
import hu.bumler.lm2.common.NameNormalizer;
import hu.bumler.lm2.common.NestedChildResolver;
import hu.bumler.lm2.common.exception.EntityDeletedException;
import hu.bumler.lm2.common.exception.EntityNotFoundException;
import hu.bumler.lm2.common.exception.UniqueViolationException;

/**
 * documentation/Subfeatures/Recept.md — shared/global recipe catalog: no per-user ownership, like
 * FoodService. Two independent duplicate rules apply on save: the recipe's own name (a real
 * Névegyediség uniqueness scope, unlike Food's name), and — separately — its live ingredient set
 * (foodId+amount+unit pairs, order-independent; only checked when the recipe has ingredients at
 * all, since two empty-ingredient recipes are never considered duplicates of each other).
 */
@Service
class RecipeService {

	private final RecipeRepository repository;
	private final RecipeIngredientRepository ingredientRepository;
	private final FoodRepository foodRepository;
	private final RecipeMapper mapper;
	private final RecipeIngredientMapper ingredientMapper;

	RecipeService(RecipeRepository repository, RecipeIngredientRepository ingredientRepository, FoodRepository foodRepository,
			RecipeMapper mapper, RecipeIngredientMapper ingredientMapper) {
		this.repository = repository;
		this.ingredientRepository = ingredientRepository;
		this.foodRepository = foodRepository;
		this.mapper = mapper;
		this.ingredientMapper = ingredientMapper;
	}

	@Transactional(readOnly = true)
	List<Recipe> list() {
		List<RecipeEntity> recipes = repository.findByDeletedFalseOrderByNameAsc();
		Map<UUID, List<RecipeIngredientEntity>> ingredientsByRecipe = groupByRecipeId(
				ingredientRepository.findByRecipeIdIn(recipes.stream().map(RecipeEntity::getId).toList()));
		return recipes.stream().map(recipe -> toDto(recipe, ingredientsByRecipe.getOrDefault(recipe.getId(), List.of()))).toList();
	}

	@Transactional(readOnly = true)
	Recipe get(UUID id) {
		RecipeEntity entity = repository.findById(id).orElseThrow(() -> new EntityNotFoundException("No such recipe"));
		return toDto(entity);
	}

	/** Idempotent upsert on the client-supplied id (documentation/Architektúra/Backend.md "Upsert"). */
	@Transactional
	Recipe create(Recipe dto) {
		RecipeEntity entity = repository.findById(dto.getId()).orElseGet(() -> new RecipeEntity(dto.getId()));
		return saveTree(entity, dto);
	}

	@Transactional
	Recipe update(UUID id, Recipe dto) {
		RecipeEntity entity = repository.findById(id).orElseThrow(() -> new EntityNotFoundException("No such recipe"));
		if (entity.isDeleted()) {
			throw new EntityDeletedException("Recipe already deleted");
		}
		return saveTree(entity, dto);
	}

	/**
	 * Soft delete, idempotent, cascading to every live ingredient on the recipe (documentation/
	 * Subfeatures/Recept.md "CRUD / törlés"). The further cascade to Meal / Recept forrású étkezés
	 * references is added once those features exist (same deferral as FoodService.delete's javadoc).
	 */
	@Transactional
	Recipe delete(UUID id) {
		RecipeEntity entity = repository.findById(id).orElseThrow(() -> new EntityNotFoundException("No such recipe"));
		if (!entity.isDeleted()) {
			entity.softDelete();
			repository.saveAndFlush(entity);
			for (RecipeIngredientEntity ingredient : ingredientRepository.findByRecipeIdAndDeletedFalse(id)) {
				ingredient.softDelete();
				ingredientRepository.save(ingredient);
			}
			ingredientRepository.flush();
		}
		return toDto(entity);
	}

	/**
	 * documentation/Architektúra/Backend.md "Nested aggregate PUT": the incoming {@code ingredients}
	 * list is the complete desired live tree — an ingredient's presence/absence by id is the only
	 * signal. Ingredients missing from the incoming list are soft-deleted; the response always lists
	 * every row, live or tombstoned (Recipe.yaml).
	 */
	private Recipe saveTree(RecipeEntity entity, Recipe dto) {
		String normalizedName = NameNormalizer.normalize(dto.getName());
		applyName(entity, dto.getName(), normalizedName);

		List<RecipeIngredientEntity> existingIngredients = ingredientRepository.findByRecipeId(entity.getId());
		Set<UUID> incomingIds = new HashSet<>();
		List<RecipeIngredientEntity> incomingLive = new ArrayList<>();
		for (RecipeIngredient ingredientDto : dto.getIngredients()) {
			if (ingredientDto.getDeleted()) {
				continue;
			}
			incomingIds.add(ingredientDto.getId());
			requireLiveFood(ingredientDto.getFoodId());
			RecipeIngredientEntity ingredientEntity = resolveIngredient(entity.getId(), existingIngredients, ingredientDto.getId());
			ingredientEntity.setFoodId(ingredientDto.getFoodId());
			ingredientEntity.setQuantity(ingredientDto.getQuantityAmount(), ingredientDto.getQuantityUnit());
			ingredientEntity.setSortOrder(ingredientDto.getSortOrder());
			incomingLive.add(ingredientEntity);
		}
		checkIngredientSetDuplicate(entity.getId(), incomingLive);

		entity.setNote(dto.getNote().orElse(null));
		repository.saveAndFlush(entity);
		for (RecipeIngredientEntity ingredientEntity : incomingLive) {
			ingredientRepository.save(ingredientEntity);
		}
		for (RecipeIngredientEntity existing : existingIngredients) {
			if (!existing.isDeleted() && !incomingIds.contains(existing.getId())) {
				existing.softDelete();
				ingredientRepository.save(existing);
			}
		}
		ingredientRepository.flush();

		return toDto(entity);
	}

	/** See {@link NestedChildResolver} — shared with PackingTemplateService.resolveItem. */
	private RecipeIngredientEntity resolveIngredient(UUID recipeId, List<RecipeIngredientEntity> existingIngredients, UUID ingredientId) {
		return NestedChildResolver.resolve(ingredientId, existingIngredients, RecipeIngredientEntity::getId, RecipeIngredientEntity::isDeleted,
				RecipeIngredientEntity::undelete, ingredientRepository::existsById,
				() -> new RecipeIngredientEntity(ingredientId, recipeId, null, null, null, 0), "No such recipe ingredient");
	}

	/**
	 * documentation/Subfeatures/Recept.md: a recipe may only reference the (global) Food catalog's
	 * live rows. Runs for every incoming live ingredient, including ones whose foodId didn't change —
	 * skipping unchanged references would let a stale offline PUT silently revive (via
	 * {@link #resolveIngredient}) an ingredient row that FoodService.delete's cascade already
	 * tombstoned for a since-deleted food, corrupting the invariant instead of just erroring the sync.
	 */
	private void requireLiveFood(UUID foodId) {
		FoodEntity food = foodRepository.findById(foodId).orElseThrow(() -> new EntityNotFoundException("No such food"));
		if (food.isDeleted()) {
			throw new EntityNotFoundException("No such food");
		}
	}

	/** documentation/Architektúra/Névegyediség.md — same pre-check pattern as PackingTemplateService.applyName, without user scoping. */
	private void applyName(RecipeEntity entity, String name, String normalizedName) {
		repository.findByNameNormalizedAndDeletedFalse(normalizedName)
				.filter(existing -> !existing.getId().equals(entity.getId()))
				.ifPresent(conflict -> {
					throw new UniqueViolationException("Name already in use", "name", conflict.getId());
				});
		entity.rename(name, normalizedName);
	}

	/**
	 * documentation/Subfeatures/Recept.md "Duplikáció": same live ingredient set (foodId+amount+unit
	 * pairs, order-independent) as another live recipe. Since a recipe can never reference the same
	 * foodId twice (idx_recipe_ingredient_recipe_food), the (foodId, amount, unit) triple is already
	 * unique within one recipe's own list, so plain set equality (not multiset) is correct here.
	 * Skipped entirely for an empty incoming list — "üres hozzávalós receptek: csak a név dönt".
	 */
	private void checkIngredientSetDuplicate(UUID selfId, List<RecipeIngredientEntity> incomingLive) {
		if (incomingLive.isEmpty()) {
			return;
		}
		Set<String> incomingSignature = signatureOf(incomingLive);
		List<RecipeEntity> candidates = repository.findByDeletedFalse().stream().filter(candidate -> !candidate.getId().equals(selfId)).toList();
		Map<UUID, List<RecipeIngredientEntity>> ingredientsByRecipe = groupByRecipeId(
				ingredientRepository.findByRecipeIdInAndDeletedFalse(candidates.stream().map(RecipeEntity::getId).toList()));
		for (RecipeEntity candidate : candidates) {
			List<RecipeIngredientEntity> candidateIngredients = ingredientsByRecipe.getOrDefault(candidate.getId(), List.of());
			if (candidateIngredients.size() == incomingLive.size() && signatureOf(candidateIngredients).equals(incomingSignature)) {
				throw new UniqueViolationException("An identical recipe already exists", "ingredients", candidate.getId());
			}
		}
	}

	private static Set<String> signatureOf(List<RecipeIngredientEntity> ingredients) {
		Set<String> signature = new HashSet<>();
		for (RecipeIngredientEntity ingredient : ingredients) {
			BigDecimal amount = ingredient.getQuantityAmount();
			signature.add(ingredient.getFoodId() + "|" + (amount == null ? "" : amount.stripTrailingZeros().toPlainString()) + "|"
					+ ingredient.getQuantityUnit());
		}
		return signature;
	}

	private Recipe toDto(RecipeEntity entity) {
		return toDto(entity, ingredientRepository.findByRecipeId(entity.getId()));
	}

	private Recipe toDto(RecipeEntity entity, List<RecipeIngredientEntity> ingredients) {
		return mapper.toDto(entity, ingredients.stream().map(ingredientMapper::toDto).toList());
	}

	private static Map<UUID, List<RecipeIngredientEntity>> groupByRecipeId(List<RecipeIngredientEntity> ingredients) {
		return ingredients.stream().collect(Collectors.groupingBy(RecipeIngredientEntity::getRecipeId));
	}
}
