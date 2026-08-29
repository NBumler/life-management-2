package hu.bumler.lm2.climbing;

import java.util.List;
import java.util.UUID;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RestController;

import hu.bumler.lm2.api.ClimbingGymsApi;
import hu.bumler.lm2.api.model.Gym;
import hu.bumler.lm2.common.CurrentUser;

/** documentation/Subfeatures/Indoor boulder admin.md — per-user indoor gym master (see GymService). */
@RestController
class GymController implements ClimbingGymsApi {

	private final GymService gymService;
	private final CurrentUser currentUser;

	GymController(GymService gymService, CurrentUser currentUser) {
		this.gymService = gymService;
		this.currentUser = currentUser;
	}

	@Override
	public ResponseEntity<List<Gym>> listClimbingGyms() {
		return ResponseEntity.ok(gymService.list(currentUser.id()));
	}

	@Override
	public ResponseEntity<Gym> createClimbingGym(Gym gym) {
		return ResponseEntity.ok(gymService.create(currentUser.id(), gym));
	}

	@Override
	public ResponseEntity<Gym> getClimbingGym(UUID id) {
		return ResponseEntity.ok(gymService.get(currentUser.id(), id));
	}

	@Override
	public ResponseEntity<Gym> updateClimbingGym(UUID id, Gym gym) {
		return ResponseEntity.ok(gymService.update(currentUser.id(), id, gym));
	}

	@Override
	public ResponseEntity<Gym> deleteClimbingGym(UUID id) {
		return ResponseEntity.ok(gymService.delete(currentUser.id(), id));
	}
}
