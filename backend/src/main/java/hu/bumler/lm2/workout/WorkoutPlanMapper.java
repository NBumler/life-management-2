package hu.bumler.lm2.workout;

import java.util.List;

import org.springframework.stereotype.Component;

import hu.bumler.lm2.api.model.WorkoutPlan;
import hu.bumler.lm2.api.model.WorkoutPlanExercise;

@Component
class WorkoutPlanMapper {

	/**
	 * documentation/Architektúra/Backend.md "Nested aggregate PUT": {@code exercises} lists every row
	 * for this plan, live or tombstoned — see WorkoutPlan.yaml for why.
	 */
	WorkoutPlan toDto(WorkoutPlanEntity entity, List<WorkoutPlanExercise> exercises) {
		WorkoutPlan dto = new WorkoutPlan(entity.getId(), entity.getName(), entity.isActive(), exercises, entity.isDeleted());
		dto.notes(entity.getNotes());
		dto.goalLabel(entity.getGoalLabel());
		if (entity.getDefaultWorkoutType() != null) {
			dto.defaultWorkoutType(WorkoutPlan.DefaultWorkoutTypeEnum.fromValue(entity.getDefaultWorkoutType()));
		}
		dto.deletedAt(entity.getDeletedAt());
		dto.createdAt(entity.getCreatedAt());
		dto.updatedAt(entity.getUpdatedAt());
		return dto;
	}
}
