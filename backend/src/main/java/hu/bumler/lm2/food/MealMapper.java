package hu.bumler.lm2.food;

import java.util.List;

import org.springframework.stereotype.Component;

import hu.bumler.lm2.api.model.Meal;
import hu.bumler.lm2.api.model.MealItem;

@Component
class MealMapper {

	/**
	 * documentation/Architektúra/Backend.md "Nested aggregate PUT": {@code items} lists every row
	 * for this meal, live or tombstoned — see Meal.yaml for why.
	 */
	Meal toDto(MealEntity entity, List<MealItem> items) {
		Meal dto = new Meal(entity.getId(), entity.getEatenAt(), entity.getTimeZoneId(), items, entity.isDeleted());
		dto.note(entity.getNote());
		dto.deletedAt(entity.getDeletedAt());
		dto.createdAt(entity.getCreatedAt());
		dto.updatedAt(entity.getUpdatedAt());
		return dto;
	}
}
