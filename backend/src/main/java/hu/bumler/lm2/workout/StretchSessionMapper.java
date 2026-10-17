package hu.bumler.lm2.workout;

import java.util.List;

import org.springframework.stereotype.Component;

import hu.bumler.lm2.api.model.StretchSession;
import hu.bumler.lm2.api.model.StretchSessionItem;

@Component
class StretchSessionMapper {

	/** {@code items} lists every row for this session, live or tombstoned — see StretchSession.yaml. */
	StretchSession toDto(StretchSessionEntity entity, List<StretchSessionItem> items) {
		StretchSession dto = new StretchSession(entity.getId(), entity.getDate(), entity.getDurationMinutes(), entity.isDeleted(), items);
		dto.startTime(entity.getStartTime());
		dto.endTime(entity.getEndTime());
		dto.stretchPlanId(entity.getStretchPlanId());
		dto.workoutSessionId(entity.getWorkoutSessionId());
		dto.notes(entity.getNotes());
		dto.deletedAt(entity.getDeletedAt());
		dto.createdAt(entity.getCreatedAt());
		dto.updatedAt(entity.getUpdatedAt());
		return dto;
	}

	StretchSessionItem toDto(StretchSessionItemEntity entity) {
		StretchSessionItem dto = new StretchSessionItem(entity.getId(), entity.getSessionId(), entity.getStretchName(),
				StretchSessionItem.StretchCategoryEnum.fromValue(entity.getStretchCategory()), entity.getOrderIndex(),
				entity.getHoldSeconds(), entity.isPerSide(), entity.getRepetitions(), entity.isCompleted(), entity.isDeleted());
		dto.stretchExerciseId(entity.getStretchExerciseId());
		dto.deletedAt(entity.getDeletedAt());
		dto.createdAt(entity.getCreatedAt());
		dto.updatedAt(entity.getUpdatedAt());
		return dto;
	}
}
