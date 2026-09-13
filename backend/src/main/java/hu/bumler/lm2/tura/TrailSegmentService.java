package hu.bumler.lm2.tura;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import hu.bumler.lm2.api.model.TrailSegment;
import hu.bumler.lm2.api.model.TrailSegmentImportItem;
import hu.bumler.lm2.common.exception.ValidationException;

/**
 * backlog/tura-utvonaltervezo/103-... / 104-... — bbox-alapú lekérdezés a térkép trail-rétegéhez,
 * plusz a kézi/admin-triggerelt import (teljes ország-kódra vonatkozó csere, nem diff).
 */
@Service
class TrailSegmentService {

	private final TrailSegmentRepository repository;
	private final TrailSegmentMapper mapper;

	TrailSegmentService(TrailSegmentRepository repository, TrailSegmentMapper mapper) {
		this.repository = repository;
		this.mapper = mapper;
	}

	@Transactional(readOnly = true)
	List<TrailSegment> findInBbox(String countryCode, double minLon, double minLat, double maxLon, double maxLat) {
		return repository.findInBbox(countryCode, minLon, minLat, maxLon, maxLat).stream().map(mapper::toDto).toList();
	}

	/** Replaces the entire live set for countryCode — not a diff, see the openapi summary. */
	@Transactional
	int importSegments(String countryCode, List<TrailSegmentImportItem> items) {
		repository.deleteByCountryCode(countryCode);
		for (TrailSegmentImportItem item : items) {
			List<List<BigDecimal>> coordinates = item.getCoordinates();
			if (coordinates.size() < 2) {
				throw new ValidationException("Egy szakasznak legalább 2 pontból kell állnia", "coordinates");
			}
			List<Double> flattened = TrailSegmentMapper.flatten(coordinates);
			double minLon = Double.MAX_VALUE;
			double minLat = Double.MAX_VALUE;
			double maxLon = -Double.MAX_VALUE;
			double maxLat = -Double.MAX_VALUE;
			for (int i = 0; i < flattened.size(); i += 2) {
				double lon = flattened.get(i);
				double lat = flattened.get(i + 1);
				minLon = Math.min(minLon, lon);
				minLat = Math.min(minLat, lat);
				maxLon = Math.max(maxLon, lon);
				maxLat = Math.max(maxLat, lat);
			}

			TrailSegmentEntity entity = new TrailSegmentEntity(UUID.randomUUID());
			entity.setCountryCode(countryCode);
			entity.setOsmWayId(item.getOsmWayId().orElse(null));
			entity.setSymbol(item.getSymbol());
			entity.setGeometry(flattened, minLon, minLat, maxLon, maxLat);
			repository.save(entity);
		}
		return items.size();
	}
}
