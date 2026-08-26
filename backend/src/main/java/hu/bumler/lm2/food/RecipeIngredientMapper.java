package hu.bumler.lm2.food;

import org.springframework.stereotype.Component;

import hu.bumler.lm2.api.model.RecipeIngredient;

@Component
class RecipeIngredientMapper {

	RecipeIngredient toDto(RecipeIngredientEntity entity) {
		RecipeIngredient dto = new RecipeIngredient(entity.getId(), entity.getRecipeId(), entity.getFoodId(), entity.getQuantityAmount(),
				entity.getQuantityUnit(), entity.getSortOrder(), entity.isDeleted());
		dto.deletedAt(entity.getDeletedAt());
		dto.createdAt(entity.getCreatedAt());
		dto.updatedAt(entity.getUpdatedAt());
		return dto;
	}
}
