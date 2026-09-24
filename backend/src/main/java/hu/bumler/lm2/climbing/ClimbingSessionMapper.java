package hu.bumler.lm2.climbing;

import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

import org.springframework.stereotype.Component;

import hu.bumler.lm2.api.model.AscentAttempt;
import hu.bumler.lm2.api.model.ClimbingSession;

@Component
class ClimbingSessionMapper {

	/**
	 * documentation/Architektúra/Backend.md "Nested aggregate PUT": {@code attempts} lists every row for
	 * this session, live or tombstoned — see ClimbingSession.yaml for why.
	 */
	ClimbingSession toDto(ClimbingSessionEntity entity, List<AscentAttempt> attempts) {
		ClimbingSession dto = new ClimbingSession(entity.getId(), entity.getDate(),
				ClimbingSession.LocationTypeEnum.fromValue(entity.getLocationType()),
				ClimbingSession.DisciplineEnum.fromValue(entity.getDiscipline()), attempts, entity.isDeleted());
		dto.totalSessionDurationMinutes(entity.getTotalSessionDurationMinutes());
		dto.pumpRating(entity.getPumpRating());
		dto.headspaceRating(entity.getHeadspaceRating());
		dto.notes(entity.getNotes());
		dto.climbingPartners(entity.getClimbingPartners());
		dto.weatherConditions(entity.getWeatherConditions() == null ? new ArrayList<>()
				: entity.getWeatherConditions().stream().map(ClimbingSession.WeatherConditionsEnum::fromValue)
						.collect(Collectors.toCollection(ArrayList::new)));
		dto.gymId(entity.getGymId());
		dto.gymName(entity.getGymName());
		dto.cragId(entity.getCragId());
		dto.cragName(entity.getCragName());
		dto.deletedAt(entity.getDeletedAt());
		dto.createdAt(entity.getCreatedAt());
		dto.updatedAt(entity.getUpdatedAt());
		return dto;
	}
}
