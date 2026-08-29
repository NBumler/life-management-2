package hu.bumler.lm2.climbing;

import java.util.List;
import java.util.UUID;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RestController;

import hu.bumler.lm2.api.ClimbingSessionsApi;
import hu.bumler.lm2.api.model.ClimbingSession;
import hu.bumler.lm2.common.CurrentUser;

/** documentation/Features/Mászónapló.md — per-user climbing log (see {@link ClimbingSessionService}). */
@RestController
class ClimbingSessionController implements ClimbingSessionsApi {

	private final ClimbingSessionService climbingSessionService;
	private final CurrentUser currentUser;

	ClimbingSessionController(ClimbingSessionService climbingSessionService, CurrentUser currentUser) {
		this.climbingSessionService = climbingSessionService;
		this.currentUser = currentUser;
	}

	@Override
	public ResponseEntity<List<ClimbingSession>> listClimbingSessions() {
		return ResponseEntity.ok(climbingSessionService.list(currentUser.id()));
	}

	@Override
	public ResponseEntity<ClimbingSession> createClimbingSession(ClimbingSession climbingSession) {
		return ResponseEntity.ok(climbingSessionService.create(currentUser.id(), climbingSession));
	}

	@Override
	public ResponseEntity<ClimbingSession> getClimbingSession(UUID id) {
		return ResponseEntity.ok(climbingSessionService.get(currentUser.id(), id));
	}

	@Override
	public ResponseEntity<ClimbingSession> updateClimbingSession(UUID id, ClimbingSession climbingSession) {
		return ResponseEntity.ok(climbingSessionService.update(currentUser.id(), id, climbingSession));
	}

	@Override
	public ResponseEntity<ClimbingSession> deleteClimbingSession(UUID id) {
		return ResponseEntity.ok(climbingSessionService.delete(currentUser.id(), id));
	}
}
