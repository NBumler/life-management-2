package hu.bumler.lm2.climbing;

import java.util.List;
import java.util.UUID;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RestController;

import hu.bumler.lm2.api.ClimbingIndoorRoutesApi;
import hu.bumler.lm2.api.model.IndoorRoute;
import hu.bumler.lm2.common.CurrentUser;

/** documentation/Subfeatures/Indoor köteles admin.md — per-user indoor-route catalogue (see IndoorRouteService). */
@RestController
class IndoorRouteController implements ClimbingIndoorRoutesApi {

	private final IndoorRouteService indoorRouteService;
	private final CurrentUser currentUser;

	IndoorRouteController(IndoorRouteService indoorRouteService, CurrentUser currentUser) {
		this.indoorRouteService = indoorRouteService;
		this.currentUser = currentUser;
	}

	@Override
	public ResponseEntity<List<IndoorRoute>> listClimbingIndoorRoutes() {
		return ResponseEntity.ok(indoorRouteService.list(currentUser.id()));
	}

	@Override
	public ResponseEntity<IndoorRoute> createClimbingIndoorRoute(IndoorRoute indoorRoute) {
		return ResponseEntity.ok(indoorRouteService.create(currentUser.id(), indoorRoute));
	}

	@Override
	public ResponseEntity<IndoorRoute> getClimbingIndoorRoute(UUID id) {
		return ResponseEntity.ok(indoorRouteService.get(currentUser.id(), id));
	}

	@Override
	public ResponseEntity<IndoorRoute> updateClimbingIndoorRoute(UUID id, IndoorRoute indoorRoute) {
		return ResponseEntity.ok(indoorRouteService.update(currentUser.id(), id, indoorRoute));
	}

	@Override
	public ResponseEntity<IndoorRoute> deleteClimbingIndoorRoute(UUID id) {
		return ResponseEntity.ok(indoorRouteService.delete(currentUser.id(), id));
	}
}
