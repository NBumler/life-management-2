package hu.bumler.lm2.common.sync;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RestController;

import hu.bumler.lm2.api.SyncApi;
import hu.bumler.lm2.api.model.SyncChangesResponse;
import hu.bumler.lm2.common.CurrentUser;

@RestController
class SyncController implements SyncApi {

	private final SyncService syncService;
	private final CurrentUser currentUser;

	SyncController(SyncService syncService, CurrentUser currentUser) {
		this.syncService = syncService;
		this.currentUser = currentUser;
	}

	@Override
	public ResponseEntity<SyncChangesResponse> getSyncChanges(String since, Integer limit, List<String> types) {
		return ResponseEntity.ok(syncService.pull(currentUser.id(), since, limit, types));
	}
}
