package hu.bumler.lm2.climbing;

import java.util.List;

import org.springframework.stereotype.Component;

import hu.bumler.lm2.api.model.AscentAttempt;
import hu.bumler.lm2.api.model.PitchLog;

@Component
class AscentAttemptMapper {

	/**
	 * documentation/Architektúra/Backend.md "Nested aggregate PUT": {@code pitches} lists every row for
	 * this attempt, live or tombstoned — see ClimbingSession.yaml for why.
	 */
	AscentAttempt toDto(AscentAttemptEntity entity, List<PitchLog> pitches) {
		AscentAttempt dto = new AscentAttempt(entity.getId(), entity.getSessionId(), entity.isSuccess(),
				entity.getOrderIndex(), pitches, entity.isDeleted());
		dto.userRawInput(entity.getUserRawInput());
		dto.absoluteDifficultyIndex(entity.getAbsoluteDifficultyIndex());
		if (entity.getAscentStyle() != null) {
			dto.ascentStyle(AscentAttempt.AscentStyleEnum.fromValue(entity.getAscentStyle()));
		}
		if (entity.getSafetyStyle() != null) {
			dto.safetyStyle(AscentAttempt.SafetyStyleEnum.fromValue(entity.getSafetyStyle()));
		}
		dto.failurePoint(entity.getFailurePoint());
		dto.attemptCount(entity.getAttemptCount());
		dto.colorBandId(entity.getColorBandId());
		dto.colorName(entity.getColorName());
		dto.hexColor(entity.getHexColor());
		dto.gradeRange(entity.getGradeRange());
		dto.indoorRouteId(entity.getIndoorRouteId());
		dto.routeId(entity.getRouteId());
		dto.boulderProblemId(entity.getBoulderProblemId());
		dto.routeName(entity.getRouteName());
		dto.lengthInMeters(entity.getLengthInMeters());
		dto.notes(entity.getNotes());
		dto.deletedAt(entity.getDeletedAt());
		dto.createdAt(entity.getCreatedAt());
		dto.updatedAt(entity.getUpdatedAt());
		return dto;
	}
}
