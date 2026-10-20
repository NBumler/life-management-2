package hu.bumler.lm2.tura;

import java.math.BigDecimal;
import java.util.List;
import java.util.Objects;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import hu.bumler.lm2.api.model.CuratedRoute;
import hu.bumler.lm2.api.model.CuratedRouteActivityType;
import hu.bumler.lm2.api.model.CuratedRouteDifficulty;
import hu.bumler.lm2.api.model.CuratedRouteUpsertRequest;
import hu.bumler.lm2.api.model.HikeRouteDay;
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
	 * Idempotens upsert a megadott id-re (documentation/Architektúra/Backend.md "Upsert"). A táv a
	 * coordinates-ból jön. A szint/idő-becslést az import (scripts/import-curated-routes.mjs) a kliens
	 * `core/geo/route-metrics.ts`-ével és a DEM build assettel számolja és küldi (backlog/217), így az
	 * átvett piszkozat ugyanazt mutatja; ha nem küldi, a szerver számolja ({@link RouteMetricsService},
	 * ritkább mintavétellel). Ez admin-oldali adat-előkészítés, nem a kliens-flow része.
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
		// backlog/193: a kifejezett "days": null (egynapos túra) is jelen lévő JsonNullable — null értékkel.
		List<HikeRouteDay> days = Objects.requireNonNullElse(request.getDays().orElse(null), List.of());
		HikeRouteDayValidation.validate(days, flattened.size() / 2);

		List<double[]> coordinatePairs = request.getCoordinates().stream()
				.map(pair -> new double[] { pair.get(0).doubleValue(), pair.get(1).doubleValue() }).toList();
		RouteMetricsService.ComputedRouteMetrics metrics = metricsFor(request, coordinatePairs);

		CuratedRouteEntity entity = repository.findById(request.getId()).orElseGet(() -> new CuratedRouteEntity(request.getId()));
		entity.setName(name);
		entity.setDescription(request.getDescription().orElse(null));
		entity.setSymbol(request.getSymbol().orElse(null));
		entity.setDifficulty(request.getDifficulty().getValue());
		entity.setActivityType(request.getActivityType().getValue());
		entity.setCoordinates(flattened);
		entity.setDaysJson(mapper.flattenDays(days));
		entity.setDistanceMeters(metrics.distanceMeters());
		entity.setElevationGainMeters(metrics.elevationGainMeters());
		entity.setElevationLossMeters(metrics.elevationLossMeters());
		entity.setEstimatedDurationMinutes(metrics.estimatedDurationMinutes());
		return mapper.toDto(repository.saveAndFlush(entity));
	}

	/**
	 * backlog/217 — a kérésben kapott (a kliens algoritmusával, DEM-ből számolt) szint- és időérték,
	 * vagy ha nincs megadva, a szerver saját számítása. A táv mindig a coordinates-ból jön.
	 */
	private RouteMetricsService.ComputedRouteMetrics metricsFor(CuratedRouteUpsertRequest request, List<double[]> coordinates) {
		BigDecimal gain = request.getElevationGainMeters().orElse(null);
		BigDecimal loss = request.getElevationLossMeters().orElse(null);
		BigDecimal duration = request.getEstimatedDurationMinutes().orElse(null);
		if (gain == null && loss == null && duration == null) {
			return routeMetricsService.compute(coordinates);
		}
		if (gain == null || loss == null || duration == null) {
			throw new ValidationException("elevationGainMeters, elevationLossMeters and estimatedDurationMinutes go together",
					gain == null ? "elevationGainMeters" : loss == null ? "elevationLossMeters" : "estimatedDurationMinutes");
		}
		return new RouteMetricsService.ComputedRouteMetrics(RouteMetricsService.totalDistance(coordinates), gain.doubleValue(),
				loss.doubleValue(), duration.doubleValue());
	}

	/** Hard delete, idempotens: ha már nem létezik, nem hiba. */
	@Transactional
	void delete(UUID id) {
		repository.findById(id).ifPresent(repository::delete);
	}
}
