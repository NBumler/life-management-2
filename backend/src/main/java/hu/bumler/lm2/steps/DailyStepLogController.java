package hu.bumler.lm2.steps;

import java.util.List;
import java.util.UUID;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RestController;

import hu.bumler.lm2.api.DailyStepLogsApi;
import hu.bumler.lm2.api.model.DailyStepLog;
import hu.bumler.lm2.common.CurrentUser;

/** documentation/Features/Lépésszám követés.md — per-user daily step logs (see DailyStepLogService). */
@RestController
class DailyStepLogController implements DailyStepLogsApi {

	private final DailyStepLogService dailyStepLogService;
	private final CurrentUser currentUser;

	DailyStepLogController(DailyStepLogService dailyStepLogService, CurrentUser currentUser) {
		this.dailyStepLogService = dailyStepLogService;
		this.currentUser = currentUser;
	}

	@Override
	public ResponseEntity<List<DailyStepLog>> listDailyStepLogs() {
		return ResponseEntity.ok(dailyStepLogService.list(currentUser.id()));
	}

	@Override
	public ResponseEntity<DailyStepLog> createDailyStepLog(DailyStepLog dailyStepLog) {
		return ResponseEntity.ok(dailyStepLogService.create(currentUser.id(), dailyStepLog));
	}

	@Override
	public ResponseEntity<DailyStepLog> getDailyStepLog(UUID id) {
		return ResponseEntity.ok(dailyStepLogService.get(currentUser.id(), id));
	}

	@Override
	public ResponseEntity<DailyStepLog> updateDailyStepLog(UUID id, DailyStepLog dailyStepLog) {
		return ResponseEntity.ok(dailyStepLogService.update(currentUser.id(), id, dailyStepLog));
	}

	@Override
	public ResponseEntity<DailyStepLog> deleteDailyStepLog(UUID id) {
		return ResponseEntity.ok(dailyStepLogService.delete(currentUser.id(), id));
	}
}
