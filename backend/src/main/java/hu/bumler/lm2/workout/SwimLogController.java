package hu.bumler.lm2.workout;

import java.util.List;
import java.util.UUID;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RestController;

import hu.bumler.lm2.api.SwimLogsApi;
import hu.bumler.lm2.api.model.SwimLog;
import hu.bumler.lm2.common.CurrentUser;

/** documentation/Features/Úszás napló.md — per-user swim logs (see SwimLogService). */
@RestController
class SwimLogController implements SwimLogsApi {

	private final SwimLogService swimLogService;
	private final CurrentUser currentUser;

	SwimLogController(SwimLogService swimLogService, CurrentUser currentUser) {
		this.swimLogService = swimLogService;
		this.currentUser = currentUser;
	}

	@Override
	public ResponseEntity<List<SwimLog>> listSwimLogs() {
		return ResponseEntity.ok(swimLogService.list(currentUser.id()));
	}

	@Override
	public ResponseEntity<SwimLog> createSwimLog(SwimLog swimLog) {
		return ResponseEntity.ok(swimLogService.create(currentUser.id(), swimLog));
	}

	@Override
	public ResponseEntity<SwimLog> getSwimLog(UUID id) {
		return ResponseEntity.ok(swimLogService.get(currentUser.id(), id));
	}

	@Override
	public ResponseEntity<SwimLog> updateSwimLog(UUID id, SwimLog swimLog) {
		return ResponseEntity.ok(swimLogService.update(currentUser.id(), id, swimLog));
	}

	@Override
	public ResponseEntity<SwimLog> deleteSwimLog(UUID id) {
		return ResponseEntity.ok(swimLogService.delete(currentUser.id(), id));
	}
}
