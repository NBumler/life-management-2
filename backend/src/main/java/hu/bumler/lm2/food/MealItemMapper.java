package hu.bumler.lm2.food;

import java.util.ArrayList;
import java.util.List;

import org.springframework.stereotype.Component;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;

import hu.bumler.lm2.api.model.MealItem;
import hu.bumler.lm2.api.model.MealItemIngredientOverride;

@Component
class MealItemMapper {

	private final ObjectMapper objectMapper;

	MealItemMapper(ObjectMapper objectMapper) {
		this.objectMapper = objectMapper;
	}

	MealItem toDto(MealItemEntity entity) {
		MealItem dto = new MealItem(entity.getId(), entity.getMealId(), MealItem.TypeEnum.fromValue(entity.getType()), entity.getServings(),
				entity.getSortOrder(), entity.isDeleted());
		dto.recipeId(entity.getRecipeId());
		dto.foodId(entity.getFoodId());
		dto.quantityAmount(entity.getQuantityAmount());
		dto.quantityUnit(entity.getQuantityUnit());
		dto.displayName(entity.getDisplayName());
		dto.caloriesKcal(entity.getCaloriesKcal());
		dto.proteinG(entity.getProteinG());
		dto.carbsG(entity.getCarbsG());
		dto.fatG(entity.getFatG());
		dto.priceHuf(entity.getPriceHuf());
		dto.ingredientOverrides(readOverrides(entity.getIngredientOverridesJson()));
		dto.deletedAt(entity.getDeletedAt());
		dto.createdAt(entity.getCreatedAt());
		dto.updatedAt(entity.getUpdatedAt());
		return dto;
	}

	/** backlog/121 — always a list on the wire (empty = the recipe as written), never null. */
	List<MealItemIngredientOverride> readOverrides(String json) {
		if (json == null) {
			return new ArrayList<>();
		}
		try {
			return objectMapper.readValue(json, new TypeReference<List<MealItemIngredientOverride>>() {
			});
		} catch (JsonProcessingException e) {
			throw new IllegalStateException("Corrupt meal item ingredient overrides JSON", e);
		}
	}

	/** Null for an empty list, so a plain recipe item keeps a NULL column. */
	String writeOverrides(List<MealItemIngredientOverride> overrides) {
		if (overrides == null || overrides.isEmpty()) {
			return null;
		}
		try {
			return objectMapper.writeValueAsString(overrides);
		} catch (JsonProcessingException e) {
			throw new IllegalStateException("Could not serialize meal item ingredient overrides", e);
		}
	}
}
