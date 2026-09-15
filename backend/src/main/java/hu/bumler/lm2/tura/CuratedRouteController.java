package hu.bumler.lm2.tura;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RestController;

import hu.bumler.lm2.api.CuratedRoutesApi;
import hu.bumler.lm2.api.model.CuratedRoute;
import hu.bumler.lm2.api.model.CuratedRouteActivityType;
import hu.bumler.lm2.api.model.CuratedRouteDifficulty;
import hu.bumler.lm2.api.model.CuratedRouteUpsertRequest;

/** backlog/tura-utvonaltervezo/103-... 2.5 fázis — katalógus-lekérdezés + admin upsert/törlés, thin controller. */
@RestController
class CuratedRouteController implements CuratedRoutesApi {

	private final CuratedRouteService service;

	CuratedRouteController(CuratedRouteService service) {
		this.service = service;
	}

	@Override
	public ResponseEntity<List<CuratedRoute>> listCuratedRoutes(CuratedRouteDifficulty difficulty, CuratedRouteActivityType activityType,
			BigDecimal minDistanceMeters, BigDecimal maxDistanceMeters) {
		return ResponseEntity.ok(service.list(difficulty, activityType, minDistanceMeters, maxDistanceMeters));
	}

	@Override
	public ResponseEntity<CuratedRoute> upsertCuratedRoute(CuratedRouteUpsertRequest request) {
		return ResponseEntity.ok(service.upsert(request));
	}

	@Override
	public ResponseEntity<Void> deleteCuratedRoute(UUID id) {
		service.delete(id);
		return ResponseEntity.noContent().build();
	}
}
