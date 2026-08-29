package hu.bumler.lm2.climbing;

import java.util.List;
import java.util.UUID;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RestController;

import hu.bumler.lm2.api.ClimbingBoulderProblemsApi;
import hu.bumler.lm2.api.model.BoulderProblem;
import hu.bumler.lm2.common.CurrentUser;

/** documentation/Subfeatures/Outdoor boulder admin.md — per-user boulder-problem master (see BoulderProblemService). */
@RestController
class BoulderProblemController implements ClimbingBoulderProblemsApi {

	private final BoulderProblemService boulderProblemService;
	private final CurrentUser currentUser;

	BoulderProblemController(BoulderProblemService boulderProblemService, CurrentUser currentUser) {
		this.boulderProblemService = boulderProblemService;
		this.currentUser = currentUser;
	}

	@Override
	public ResponseEntity<List<BoulderProblem>> listClimbingBoulderProblems() {
		return ResponseEntity.ok(boulderProblemService.list(currentUser.id()));
	}

	@Override
	public ResponseEntity<BoulderProblem> createClimbingBoulderProblem(BoulderProblem boulderProblem) {
		return ResponseEntity.ok(boulderProblemService.create(currentUser.id(), boulderProblem));
	}

	@Override
	public ResponseEntity<BoulderProblem> getClimbingBoulderProblem(UUID id) {
		return ResponseEntity.ok(boulderProblemService.get(currentUser.id(), id));
	}

	@Override
	public ResponseEntity<BoulderProblem> updateClimbingBoulderProblem(UUID id, BoulderProblem boulderProblem) {
		return ResponseEntity.ok(boulderProblemService.update(currentUser.id(), id, boulderProblem));
	}

	@Override
	public ResponseEntity<BoulderProblem> deleteClimbingBoulderProblem(UUID id) {
		return ResponseEntity.ok(boulderProblemService.delete(currentUser.id(), id));
	}
}
