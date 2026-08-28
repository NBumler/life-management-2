package hu.bumler.lm2.workout;

import java.util.List;

import org.springframework.stereotype.Component;

import hu.bumler.lm2.api.model.WorkoutExerciseEntry;
import hu.bumler.lm2.api.model.WorkoutSetEntry;

@Component
class WorkoutExerciseEntryMapper {

	/**
	 * documentation/Architektúra/Backend.md "Nested aggregate PUT": {@code sets} lists every row for
	 * this entry, live or tombstoned — see WorkoutSession.yaml for why.
	 */
	WorkoutExerciseEntry toDto(WorkoutExerciseEntryEntity entity, List<WorkoutSetEntry> sets) {
		WorkoutExerciseEntry dto = new WorkoutExerciseEntry(entity.getId(), entity.getSessionId(), entity.getExerciseName(),
				WorkoutExerciseEntry.ExerciseCategoryEnum.fromValue(entity.getExerciseCategory()),
				WorkoutExerciseEntry.ExerciseKindEnum.fromValue(entity.getExerciseKind()), entity.getOrderIndex(), sets,
				entity.isDeleted());
		dto.exerciseId(entity.getExerciseId());
		dto.supersetGroup(entity.getSupersetGroup());
		dto.deletedAt(entity.getDeletedAt());
		dto.createdAt(entity.getCreatedAt());
		dto.updatedAt(entity.getUpdatedAt());
		return dto;
	}
}
