package hu.bumler.lm2.workout;

import java.util.List;

import org.springframework.stereotype.Component;

import hu.bumler.lm2.api.model.WorkoutExerciseEntry;
import hu.bumler.lm2.api.model.WorkoutSession;

@Component
class WorkoutSessionMapper {

	/**
	 * documentation/Architektúra/Backend.md "Nested aggregate PUT": {@code exercises} lists every row
	 * for this session, live or tombstoned — see WorkoutSession.yaml for why.
	 */
	WorkoutSession toDto(WorkoutSessionEntity entity, List<WorkoutExerciseEntry> exercises) {
		WorkoutSession dto = new WorkoutSession(entity.getId(), entity.getDate(),
				WorkoutSession.WorkoutTypeEnum.fromValue(entity.getWorkoutType()), exercises, entity.isDeleted());
		dto.startTime(entity.getStartTime());
		dto.endTime(entity.getEndTime());
		dto.durationMinutes(entity.getDurationMinutes());
		dto.title(entity.getTitle());
		dto.notes(entity.getNotes());
		if (entity.getLocation() != null) {
			dto.location(WorkoutSession.LocationEnum.fromValue(entity.getLocation()));
		}
		dto.planId(entity.getPlanId());
		dto.roundsCount(entity.getRoundsCount());
		dto.deletedAt(entity.getDeletedAt());
		dto.createdAt(entity.getCreatedAt());
		dto.updatedAt(entity.getUpdatedAt());
		return dto;
	}
}
