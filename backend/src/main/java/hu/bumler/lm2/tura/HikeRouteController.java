package hu.bumler.lm2.tura;

import java.util.List;
import java.util.UUID;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RestController;

import hu.bumler.lm2.api.HikeRoutesApi;
import hu.bumler.lm2.api.model.HikeRoute;
import hu.bumler.lm2.common.CurrentUser;

/** backlog/tura-utvonaltervezo/103-... 2.1 fázis — per-user kézi útvonalak (see HikeRouteService). */
@RestController
class HikeRouteController implements HikeRoutesApi {

	private final HikeRouteService hikeRouteService;
	private final CurrentUser currentUser;

	HikeRouteController(HikeRouteService hikeRouteService, CurrentUser currentUser) {
		this.hikeRouteService = hikeRouteService;
		this.currentUser = currentUser;
	}

	@Override
	public ResponseEntity<List<HikeRoute>> listHikeRoutes() {
		return ResponseEntity.ok(hikeRouteService.list(currentUser.id()));
	}

	@Override
	public ResponseEntity<HikeRoute> createHikeRoute(HikeRoute hikeRoute) {
		return ResponseEntity.ok(hikeRouteService.create(currentUser.id(), hikeRoute));
	}

	@Override
	public ResponseEntity<HikeRoute> getHikeRoute(UUID id) {
		return ResponseEntity.ok(hikeRouteService.get(currentUser.id(), id));
	}

	@Override
	public ResponseEntity<HikeRoute> updateHikeRoute(UUID id, HikeRoute hikeRoute) {
		return ResponseEntity.ok(hikeRouteService.update(currentUser.id(), id, hikeRoute));
	}

	@Override
	public ResponseEntity<HikeRoute> deleteHikeRoute(UUID id) {
		return ResponseEntity.ok(hikeRouteService.delete(currentUser.id(), id));
	}
}
