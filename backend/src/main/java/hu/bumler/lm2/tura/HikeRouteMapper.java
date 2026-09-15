package hu.bumler.lm2.tura;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

import org.springframework.stereotype.Component;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;

import hu.bumler.lm2.api.model.ElevationProfilePoint;
import hu.bumler.lm2.api.model.HikeRoute;
import hu.bumler.lm2.api.model.HikeRouteDay;

@Component
class HikeRouteMapper {

	private final ObjectMapper objectMapper;

	HikeRouteMapper(ObjectMapper objectMapper) {
		this.objectMapper = objectMapper;
	}

	HikeRoute toDto(HikeRouteEntity entity) {
		HikeRoute dto = new HikeRoute(entity.getId(), entity.getName(), TrailSegmentMapper.toPairs(entity.getCoordinates()),
				entity.isDeleted());
		dto.deletedAt(entity.getDeletedAt());
		dto.createdAt(entity.getCreatedAt());
		dto.updatedAt(entity.getUpdatedAt());
		dto.distanceMeters(toBigDecimal(entity.getDistanceMeters()));
		dto.elevationGainMeters(toBigDecimal(entity.getElevationGainMeters()));
		dto.elevationLossMeters(toBigDecimal(entity.getElevationLossMeters()));
		dto.estimatedDurationMinutes(toBigDecimal(entity.getEstimatedDurationMinutes()));
		dto.elevationProfile(toProfile(entity.getElevationProfile()));
		dto.days(toDays(entity.getDaysJson()));
		return dto;
	}

	/**
	 * backlog/tura-utvonaltervezo/103-... 2.4 fázis — a napi bontás nem önálló entitás, hanem a
	 * generált {@link HikeRouteDay} DTO-t magát tároljuk pre-szerializált JSON-ként (ld.
	 * HikeRouteEntity.daysJson), ugyanazzal az ObjectMapper-rel, ami a HTTP kérés/válasz testet is
	 * (de)szerializálja — a JsonNullable mezők (overnightName, a napi metrikák) így ugyanúgy
	 * viselkednek oda-vissza.
	 */
	private List<HikeRouteDay> toDays(String json) {
		if (json == null) {
			return null;
		}
		try {
			return objectMapper.readValue(json, new TypeReference<List<HikeRouteDay>>() {
			});
		} catch (JsonProcessingException e) {
			throw new IllegalStateException("Corrupt hike route days JSON", e);
		}
	}

	/** Fordítottja a {@link #toDays}-nak — null bemenetre (egynapos túra) null-t ad vissza, nem üres tömböt. */
	String flattenDays(List<HikeRouteDay> days) {
		if (days == null || days.isEmpty()) {
			return null;
		}
		try {
			return objectMapper.writeValueAsString(days);
		} catch (JsonProcessingException e) {
			throw new IllegalStateException("Could not serialize hike route days", e);
		}
	}

	private static BigDecimal toBigDecimal(Double value) {
		return value == null ? null : BigDecimal.valueOf(value);
	}

	private static List<ElevationProfilePoint> toProfile(List<Double> flattened) {
		if (flattened == null || flattened.isEmpty()) {
			return null;
		}
		List<ElevationProfilePoint> profile = new ArrayList<>(flattened.size() / 2);
		for (int i = 0; i < flattened.size(); i += 2) {
			profile.add(new ElevationProfilePoint(BigDecimal.valueOf(flattened.get(i)), BigDecimal.valueOf(flattened.get(i + 1))));
		}
		return profile;
	}

	static List<Double> flattenProfile(List<ElevationProfilePoint> profile) {
		if (profile == null) {
			return null;
		}
		List<Double> flattened = new ArrayList<>(profile.size() * 2);
		for (ElevationProfilePoint point : profile) {
			flattened.add(point.getDistanceMeters().doubleValue());
			flattened.add(point.getElevationMeters().doubleValue());
		}
		return flattened;
	}
}
