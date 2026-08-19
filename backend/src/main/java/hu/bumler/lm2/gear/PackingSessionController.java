package hu.bumler.lm2.gear;

import java.util.List;
import java.util.UUID;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RestController;

import hu.bumler.lm2.api.PackingSessionsApi;
import hu.bumler.lm2.api.model.PackingSession;
import hu.bumler.lm2.api.model.PackingSessionDetail;
import hu.bumler.lm2.common.CurrentUser;

@RestController
class PackingSessionController implements PackingSessionsApi {

	private final PackingSessionService packingSessionService;
	private final CurrentUser currentUser;

	PackingSessionController(PackingSessionService packingSessionService, CurrentUser currentUser) {
		this.packingSessionService = packingSessionService;
		this.currentUser = currentUser;
	}

	@Override
	public ResponseEntity<List<PackingSession>> listPackingSessions() {
		return ResponseEntity.ok(packingSessionService.list(currentUser.id()));
	}

	@Override
	public ResponseEntity<PackingSessionDetail> createPackingSession(PackingSessionDetail packingSessionDetail) {
		return ResponseEntity.ok(packingSessionService.create(currentUser.id(), packingSessionDetail));
	}

	@Override
	public ResponseEntity<PackingSessionDetail> getPackingSession(UUID id) {
		return ResponseEntity.ok(packingSessionService.get(currentUser.id(), id));
	}

	@Override
	public ResponseEntity<PackingSession> updatePackingSession(UUID id, PackingSession packingSession) {
		return ResponseEntity.ok(packingSessionService.update(currentUser.id(), id, packingSession));
	}

	@Override
	public ResponseEntity<PackingSession> deletePackingSession(UUID id) {
		return ResponseEntity.ok(packingSessionService.delete(currentUser.id(), id));
	}
}
