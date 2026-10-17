package hu.bumler.lm2.workout;

import org.springframework.stereotype.Component;

import hu.bumler.lm2.api.model.StretchExercise;

@Component
class StretchExerciseMapper {

	StretchExercise toDto(StretchExerciseEntity entity) {
		StretchExercise dto = new StretchExercise(entity.getId(), entity.getName(),
				StretchExercise.CategoryEnum.fromValue(entity.getCategory()), entity.isFavorite(),
				entity.getDefaultHoldSeconds(), entity.isDefaultPerSide(), entity.isDeleted());
		dto.description(entity.getDescription());
		dto.equipment(entity.getEquipment());
		dto.deletedAt(entity.getDeletedAt());
		dto.createdAt(entity.getCreatedAt());
		dto.updatedAt(entity.getUpdatedAt());
		return dto;
	}
}
