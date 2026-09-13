package hu.bumler.lm2.tura;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

import org.springframework.stereotype.Component;

import hu.bumler.lm2.api.model.TrailSegment;

/**
 * Converts between the entity's flattened {@code List<Double>} ([lon1, lat1, lon2, lat2, ...])
 * and the DTO's {@code List<List<BigDecimal>>} ([[lon, lat], [lon, lat], ...]) shape.
 */
@Component
class TrailSegmentMapper {

	TrailSegment toDto(TrailSegmentEntity entity) {
		TrailSegment dto = new TrailSegment(entity.getId(), entity.getCountryCode(), entity.getSymbol(), toPairs(entity.getCoordinates()));
		dto.osmWayId(entity.getOsmWayId());
		return dto;
	}

	static List<List<BigDecimal>> toPairs(List<Double> flattened) {
		List<List<BigDecimal>> pairs = new ArrayList<>(flattened.size() / 2);
		for (int i = 0; i < flattened.size(); i += 2) {
			pairs.add(List.of(BigDecimal.valueOf(flattened.get(i)), BigDecimal.valueOf(flattened.get(i + 1))));
		}
		return pairs;
	}

	static List<Double> flatten(List<List<BigDecimal>> pairs) {
		List<Double> flattened = new ArrayList<>(pairs.size() * 2);
		for (List<BigDecimal> pair : pairs) {
			flattened.add(pair.get(0).doubleValue());
			flattened.add(pair.get(1).doubleValue());
		}
		return flattened;
	}
}
