package hu.bumler.lm2.food;

import org.springframework.stereotype.Component;

import hu.bumler.lm2.api.model.MealItem;

@Component
class MealItemMapper {

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
		dto.deletedAt(entity.getDeletedAt());
		dto.createdAt(entity.getCreatedAt());
		dto.updatedAt(entity.getUpdatedAt());
		return dto;
	}
}
