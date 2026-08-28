package hu.bumler.lm2.workout;

import org.springframework.stereotype.Component;

import hu.bumler.lm2.api.model.Exercise;

@Component
class ExerciseMapper {

	Exercise toDto(ExerciseEntity entity) {
		Exercise dto = new Exercise(entity.getId(), entity.getName(),
				Exercise.CategoryEnum.fromValue(entity.getCategory()), Exercise.KindEnum.fromValue(entity.getKind()),
				entity.isFavorite(), entity.isDeleted());
		dto.defaultRestTimeSeconds(entity.getDefaultRestTimeSeconds());
		dto.equipment(entity.getEquipment());
		dto.deletedAt(entity.getDeletedAt());
		dto.createdAt(entity.getCreatedAt());
		dto.updatedAt(entity.getUpdatedAt());
		return dto;
	}
}
