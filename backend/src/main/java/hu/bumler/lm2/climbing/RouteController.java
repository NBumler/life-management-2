package hu.bumler.lm2.climbing;

import java.util.List;
import java.util.UUID;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RestController;

import hu.bumler.lm2.api.ClimbingRoutesApi;
import hu.bumler.lm2.api.model.Route;
import hu.bumler.lm2.common.CurrentUser;

/** documentation/Subfeatures/Outdoor köteles admin.md — per-user rope-route master (see RouteService). */
@RestController
class RouteController implements ClimbingRoutesApi {

	private final RouteService routeService;
	private final CurrentUser currentUser;

	RouteController(RouteService routeService, CurrentUser currentUser) {
		this.routeService = routeService;
		this.currentUser = currentUser;
	}

	@Override
	public ResponseEntity<List<Route>> listClimbingRoutes() {
		return ResponseEntity.ok(routeService.list(currentUser.id()));
	}

	@Override
	public ResponseEntity<Route> createClimbingRoute(Route route) {
		return ResponseEntity.ok(routeService.create(currentUser.id(), route));
	}

	@Override
	public ResponseEntity<Route> getClimbingRoute(UUID id) {
		return ResponseEntity.ok(routeService.get(currentUser.id(), id));
	}

	@Override
	public ResponseEntity<Route> updateClimbingRoute(UUID id, Route route) {
		return ResponseEntity.ok(routeService.update(currentUser.id(), id, route));
	}

	@Override
	public ResponseEntity<Route> deleteClimbingRoute(UUID id) {
		return ResponseEntity.ok(routeService.delete(currentUser.id(), id));
	}
}
