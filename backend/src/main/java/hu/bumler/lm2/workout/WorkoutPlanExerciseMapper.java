package hu.bumler.lm2.workout;

import java.util.List;

import org.springframework.stereotype.Component;

import hu.bumler.lm2.api.model.WorkoutPlanExercise;
import hu.bumler.lm2.api.model.WorkoutPlanSet;

@Component
class WorkoutPlanExerciseMapper {

	/**
	 * documentation/Architektúra/Backend.md "Nested aggregate PUT": {@code targetSets} lists every row
	 * for this exercise line, live or tombstoned — see WorkoutPlan.yaml for why.
	 */
	WorkoutPlanExercise toDto(WorkoutPlanExerciseEntity entity, List<WorkoutPlanSet> targetSets) {
		WorkoutPlanExercise dto = new WorkoutPlanExercise(entity.getId(), entity.getPlanId(), entity.getExerciseId(),
				entity.getExerciseName(), WorkoutPlanExercise.ExerciseCategoryEnum.fromValue(entity.getExerciseCategory()),
				WorkoutPlanExercise.ExerciseKindEnum.fromValue(entity.getExerciseKind()), entity.getOrderIndex(), targetSets,
				entity.isDeleted());
		dto.supersetGroup(entity.getSupersetGroup());
		dto.deletedAt(entity.getDeletedAt());
		dto.createdAt(entity.getCreatedAt());
		dto.updatedAt(entity.getUpdatedAt());
		return dto;
	}
}
