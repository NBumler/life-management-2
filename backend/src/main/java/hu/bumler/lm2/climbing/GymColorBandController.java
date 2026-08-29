package hu.bumler.lm2.climbing;

import java.util.List;
import java.util.UUID;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RestController;

import hu.bumler.lm2.api.ClimbingGymColorBandsApi;
import hu.bumler.lm2.api.model.GymColorBand;
import hu.bumler.lm2.common.CurrentUser;

/** documentation/Subfeatures/Indoor boulder admin.md — per-user gym colour bands (see GymColorBandService). */
@RestController
class GymColorBandController implements ClimbingGymColorBandsApi {

	private final GymColorBandService gymColorBandService;
	private final CurrentUser currentUser;

	GymColorBandController(GymColorBandService gymColorBandService, CurrentUser currentUser) {
		this.gymColorBandService = gymColorBandService;
		this.currentUser = currentUser;
	}

	@Override
	public ResponseEntity<List<GymColorBand>> listClimbingGymColorBands() {
		return ResponseEntity.ok(gymColorBandService.list(currentUser.id()));
	}

	@Override
	public ResponseEntity<GymColorBand> createClimbingGymColorBand(GymColorBand gymColorBand) {
		return ResponseEntity.ok(gymColorBandService.create(currentUser.id(), gymColorBand));
	}

	@Override
	public ResponseEntity<GymColorBand> getClimbingGymColorBand(UUID id) {
		return ResponseEntity.ok(gymColorBandService.get(currentUser.id(), id));
	}

	@Override
	public ResponseEntity<GymColorBand> updateClimbingGymColorBand(UUID id, GymColorBand gymColorBand) {
		return ResponseEntity.ok(gymColorBandService.update(currentUser.id(), id, gymColorBand));
	}

	@Override
	public ResponseEntity<GymColorBand> deleteClimbingGymColorBand(UUID id) {
		return ResponseEntity.ok(gymColorBandService.delete(currentUser.id(), id));
	}
}
