package hu.bumler.lm2.food;

import java.util.List;

import org.springframework.stereotype.Component;

import hu.bumler.lm2.api.model.Recipe;
import hu.bumler.lm2.api.model.RecipeIngredient;

@Component
class RecipeMapper {

	/**
	 * documentation/Architektúra/Backend.md "Nested aggregate PUT": {@code ingredients} lists every
	 * row for this recipe, live or tombstoned — see Recipe.yaml for why.
	 */
	Recipe toDto(RecipeEntity entity, List<RecipeIngredient> ingredients) {
		Recipe dto = new Recipe(entity.getId(), entity.getName(), entity.isDeleted(), ingredients);
		dto.note(entity.getNote());
		dto.deletedAt(entity.getDeletedAt());
		dto.createdAt(entity.getCreatedAt());
		dto.updatedAt(entity.getUpdatedAt());
		return dto;
	}
}
