package hu.bumler.lm2.workout;

import java.util.List;
import java.util.UUID;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RestController;

import hu.bumler.lm2.api.VolleyballLogsApi;
import hu.bumler.lm2.api.model.VolleyballLog;
import hu.bumler.lm2.common.CurrentUser;

/** documentation/Features/Röplabda napló.md — per-user volleyball logs (see VolleyballLogService). */
@RestController
class VolleyballLogController implements VolleyballLogsApi {

	private final VolleyballLogService volleyballLogService;
	private final CurrentUser currentUser;

	VolleyballLogController(VolleyballLogService volleyballLogService, CurrentUser currentUser) {
		this.volleyballLogService = volleyballLogService;
		this.currentUser = currentUser;
	}

	@Override
	public ResponseEntity<List<VolleyballLog>> listVolleyballLogs() {
		return ResponseEntity.ok(volleyballLogService.list(currentUser.id()));
	}

	@Override
	public ResponseEntity<VolleyballLog> createVolleyballLog(VolleyballLog volleyballLog) {
		return ResponseEntity.ok(volleyballLogService.create(currentUser.id(), volleyballLog));
	}

	@Override
	public ResponseEntity<VolleyballLog> getVolleyballLog(UUID id) {
		return ResponseEntity.ok(volleyballLogService.get(currentUser.id(), id));
	}

	@Override
	public ResponseEntity<VolleyballLog> updateVolleyballLog(UUID id, VolleyballLog volleyballLog) {
		return ResponseEntity.ok(volleyballLogService.update(currentUser.id(), id, volleyballLog));
	}

	@Override
	public ResponseEntity<VolleyballLog> deleteVolleyballLog(UUID id) {
		return ResponseEntity.ok(volleyballLogService.delete(currentUser.id(), id));
	}
}
