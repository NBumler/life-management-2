package hu.bumler.lm2.workout;

import org.springframework.stereotype.Component;

import hu.bumler.lm2.api.model.WorkoutPlanSet;

@Component
class WorkoutPlanSetMapper {

	WorkoutPlanSet toDto(WorkoutPlanSetEntity entity) {
		WorkoutPlanSet dto = new WorkoutPlanSet(entity.getId(), entity.getPlanExerciseId(),
				WorkoutPlanSet.SetTypeEnum.fromValue(entity.getSetType()), entity.getOrderIndex(), entity.isDeleted());
		dto.reps(entity.getReps());
		dto.weightKg(entity.getWeightKg());
		dto.holdTimeSeconds(entity.getHoldTimeSeconds());
		dto.edgeSizeMm(entity.getEdgeSizeMm());
		dto.distanceMeters(entity.getDistanceMeters());
		dto.restTimeSeconds(entity.getRestTimeSeconds());
		dto.deletedAt(entity.getDeletedAt());
		dto.createdAt(entity.getCreatedAt());
		dto.updatedAt(entity.getUpdatedAt());
		return dto;
	}
}
