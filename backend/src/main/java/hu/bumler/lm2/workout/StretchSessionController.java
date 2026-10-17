package hu.bumler.lm2.workout;

import java.util.List;
import java.util.UUID;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RestController;

import hu.bumler.lm2.api.StretchSessionsApi;
import hu.bumler.lm2.api.model.StretchSession;
import hu.bumler.lm2.common.CurrentUser;

/** documentation/Subfeatures/Nyújtás.md — per-user stretching sessions (see StretchSessionService). */
@RestController
class StretchSessionController implements StretchSessionsApi {

	private final StretchSessionService stretchSessionService;
	private final CurrentUser currentUser;

	StretchSessionController(StretchSessionService stretchSessionService, CurrentUser currentUser) {
		this.stretchSessionService = stretchSessionService;
		this.currentUser = currentUser;
	}

	@Override
	public ResponseEntity<List<StretchSession>> listStretchSessions() {
		return ResponseEntity.ok(stretchSessionService.list(currentUser.id()));
	}

	@Override
	public ResponseEntity<StretchSession> createStretchSession(StretchSession stretchSession) {
		return ResponseEntity.ok(stretchSessionService.create(currentUser.id(), stretchSession));
	}

	@Override
	public ResponseEntity<StretchSession> getStretchSession(UUID id) {
		return ResponseEntity.ok(stretchSessionService.get(currentUser.id(), id));
	}

	@Override
	public ResponseEntity<StretchSession> updateStretchSession(UUID id, StretchSession stretchSession) {
		return ResponseEntity.ok(stretchSessionService.update(currentUser.id(), id, stretchSession));
	}

	@Override
	public ResponseEntity<StretchSession> deleteStretchSession(UUID id) {
		return ResponseEntity.ok(stretchSessionService.delete(currentUser.id(), id));
	}
}
