package hu.bumler.lm2.tura;

import java.math.BigDecimal;
import java.util.List;

import org.springframework.stereotype.Component;

import com.fasterxml.jackson.databind.ObjectMapper;

import hu.bumler.lm2.api.model.CuratedRoute;
import hu.bumler.lm2.api.model.CuratedRouteActivityType;
import hu.bumler.lm2.api.model.CuratedRouteDifficulty;
import hu.bumler.lm2.api.model.HikeRouteDay;

@Component
class CuratedRouteMapper {

	private final ObjectMapper objectMapper;

	CuratedRouteMapper(ObjectMapper objectMapper) {
		this.objectMapper = objectMapper;
	}

	CuratedRoute toDto(CuratedRouteEntity entity) {
		CuratedRoute dto = new CuratedRoute(entity.getId(), entity.getName(), CuratedRouteDifficulty.fromValue(entity.getDifficulty()),
				CuratedRouteActivityType.fromValue(entity.getActivityType()), TrailSegmentMapper.toPairs(entity.getCoordinates()),
				BigDecimal.valueOf(entity.getDistanceMeters()), BigDecimal.valueOf(entity.getElevationGainMeters()),
				BigDecimal.valueOf(entity.getElevationLossMeters()), BigDecimal.valueOf(entity.getEstimatedDurationMinutes()));
		dto.description(entity.getDescription());
		dto.days(HikeRouteDayJson.toDays(objectMapper, entity.getDaysJson()));
		dto.createdAt(entity.getCreatedAt());
		dto.updatedAt(entity.getUpdatedAt());
		return dto;
	}

	String flattenDays(List<HikeRouteDay> days) {
		return HikeRouteDayJson.flatten(objectMapper, days);
	}
}
