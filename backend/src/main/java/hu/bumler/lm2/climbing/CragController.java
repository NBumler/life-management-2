package hu.bumler.lm2.climbing;

import java.util.List;
import java.util.UUID;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RestController;

import hu.bumler.lm2.api.ClimbingCragsApi;
import hu.bumler.lm2.api.model.Crag;
import hu.bumler.lm2.common.CurrentUser;

/** documentation/Subfeatures/Outdoor boulder admin.md — per-user crag master (see CragService). */
@RestController
class CragController implements ClimbingCragsApi {

	private final CragService cragService;
	private final CurrentUser currentUser;

	CragController(CragService cragService, CurrentUser currentUser) {
		this.cragService = cragService;
		this.currentUser = currentUser;
	}

	@Override
	public ResponseEntity<List<Crag>> listClimbingCrags() {
		return ResponseEntity.ok(cragService.list(currentUser.id()));
	}

	@Override
	public ResponseEntity<Crag> createClimbingCrag(Crag crag) {
		return ResponseEntity.ok(cragService.create(currentUser.id(), crag));
	}

	@Override
	public ResponseEntity<Crag> getClimbingCrag(UUID id) {
		return ResponseEntity.ok(cragService.get(currentUser.id(), id));
	}

	@Override
	public ResponseEntity<Crag> updateClimbingCrag(UUID id, Crag crag) {
		return ResponseEntity.ok(cragService.update(currentUser.id(), id, crag));
	}

	@Override
	public ResponseEntity<Crag> deleteClimbingCrag(UUID id) {
		return ResponseEntity.ok(cragService.delete(currentUser.id(), id));
	}
}
