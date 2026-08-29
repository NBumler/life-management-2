package hu.bumler.lm2.workout;

import java.util.List;
import java.util.UUID;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RestController;

import hu.bumler.lm2.api.BikeRideLogsApi;
import hu.bumler.lm2.api.model.BikeRideLog;
import hu.bumler.lm2.common.CurrentUser;

/** documentation/Features/Biciklizés napló.md — per-user bike ride logs (see BikeRideLogService). */
@RestController
class BikeRideLogController implements BikeRideLogsApi {

	private final BikeRideLogService bikeRideLogService;
	private final CurrentUser currentUser;

	BikeRideLogController(BikeRideLogService bikeRideLogService, CurrentUser currentUser) {
		this.bikeRideLogService = bikeRideLogService;
		this.currentUser = currentUser;
	}

	@Override
	public ResponseEntity<List<BikeRideLog>> listBikeRideLogs() {
		return ResponseEntity.ok(bikeRideLogService.list(currentUser.id()));
	}

	@Override
	public ResponseEntity<BikeRideLog> createBikeRideLog(BikeRideLog bikeRideLog) {
		return ResponseEntity.ok(bikeRideLogService.create(currentUser.id(), bikeRideLog));
	}

	@Override
	public ResponseEntity<BikeRideLog> getBikeRideLog(UUID id) {
		return ResponseEntity.ok(bikeRideLogService.get(currentUser.id(), id));
	}

	@Override
	public ResponseEntity<BikeRideLog> updateBikeRideLog(UUID id, BikeRideLog bikeRideLog) {
		return ResponseEntity.ok(bikeRideLogService.update(currentUser.id(), id, bikeRideLog));
	}

	@Override
	public ResponseEntity<BikeRideLog> deleteBikeRideLog(UUID id) {
		return ResponseEntity.ok(bikeRideLogService.delete(currentUser.id(), id));
	}
}
