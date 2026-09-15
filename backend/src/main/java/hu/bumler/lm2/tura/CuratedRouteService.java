package hu.bumler.lm2.tura;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import hu.bumler.lm2.api.model.CuratedRoute;
import hu.bumler.lm2.api.model.CuratedRouteActivityType;
import hu.bumler.lm2.api.model.CuratedRouteDifficulty;
import hu.bumler.lm2.api.model.CuratedRouteUpsertRequest;
import hu.bumler.lm2.api.model.HikeRouteDay;
import hu.bumler.lm2.api.model.RouteMetrics;
import hu.bumler.lm2.common.exception.ValidationException;

/**
 * backlog/tura-utvonaltervezo/103-... 2.5 fázis — admin-szerkesztett/OSM-eredetű ajánlott
 * túrakatalógus. A katalógus mérete admin-kurált tartalom, ezért a szűrés egyszerű stream-filterrel
 * történik ({@link CuratedRouteRepository} megjegyzése), nem dinamikus JPQL-lel.
 */
@Service
class CuratedRouteService {

	private final CuratedRouteRepository repository;
	private final CuratedRouteMapper mapper;
	private final RouteMetricsService routeMetricsService;

	CuratedRouteService(CuratedRouteRepository repository, CuratedRouteMapper mapper, RouteMetricsService routeMetricsService) {
		this.repository = repository;
		this.mapper = mapper;
		this.routeMetricsService = routeMetricsService;
	}

	@Transactional(readOnly = true)
	List<CuratedRoute> list(CuratedRouteDifficulty difficulty, CuratedRouteActivityType activityType, BigDecimal minDistanceMeters,
			BigDecimal maxDistanceMeters) {
		return repository.findAll().stream().map(mapper::toDto)
				.filter(route -> difficulty == null || route.getDifficulty() == difficulty)
				.filter(route -> activityType == null || route.getActivityType() == activityType)
				.filter(route -> minDistanceMeters == null || route.getDistanceMeters().compareTo(minDistanceMeters) >= 0)
				.filter(route -> maxDistanceMeters == null || route.getDistanceMeters().compareTo(maxDistanceMeters) <= 0).toList();
	}

	/**
	 * Idempotens upsert a megadott id-re (documentation/Architektúra/Backend.md "Upsert"). A táv/
	 * szint/idő-becslést itt, a szerveren számoljuk ki a coordinates-ból (ugyanaz a
	 * {@link RouteMetricsService}, mint amit a kliens hív mentéskor a saját útvonalaihoz) — az admin
	 * nem adja meg közvetlenül, így a katalógus és a felhasználói útvonalak metrikái konzisztensek.
	 */
	@Transactional
	CuratedRoute upsert(CuratedRouteUpsertRequest request) {
		String name = request.getName() == null ? "" : request.getName().trim();
		if (name.isEmpty()) {
			throw new ValidationException("Curated route name must not be blank", "name");
		}
		if (request.getCoordinates() == null || request.getCoordinates().size() < 2) {
			throw new ValidationException("Curated route needs at least 2 waypoints", "coordinates");
		}

		List<Double> flattened = TrailSegmentMapper.flatten(request.getCoordinates());
		List<HikeRouteDay> days = request.getDays().orElse(List.of());
		HikeRouteDayValidation.validate(days, flattened.size() / 2);

		List<double[]> coordinatePairs = request.getCoordinates().stream()
				.map(pair -> new double[] { pair.get(0).doubleValue(), pair.get(1).doubleValue() }).toList();
		RouteMetrics metrics = routeMetricsService.compute(coordinatePairs);

		CuratedRouteEntity entity = repository.findById(request.getId()).orElseGet(() -> new CuratedRouteEntity(request.getId()));
		entity.setName(name);
		entity.setDescription(request.getDescription().orElse(null));
		entity.setDifficulty(request.getDifficulty().getValue());
		entity.setActivityType(request.getActivityType().getValue());
		entity.setCoordinates(flattened);
		entity.setDaysJson(mapper.flattenDays(days));
		entity.setDistanceMeters(metrics.getDistanceMeters().doubleValue());
		entity.setElevationGainMeters(metrics.getElevationGainMeters().doubleValue());
		entity.setElevationLossMeters(metrics.getElevationLossMeters().doubleValue());
		entity.setEstimatedDurationMinutes(metrics.getEstimatedDurationMinutes().doubleValue());
		return mapper.toDto(repository.saveAndFlush(entity));
	}

	/** Hard delete, idempotens: ha már nem létezik, nem hiba. */
	@Transactional
	void delete(UUID id) {
		repository.findById(id).ifPresent(repository::delete);
	}
}
