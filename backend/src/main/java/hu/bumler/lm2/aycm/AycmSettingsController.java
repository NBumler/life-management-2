package hu.bumler.lm2.aycm;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RestController;

import hu.bumler.lm2.api.AycmSettingsApi;
import hu.bumler.lm2.api.model.AycmSettings;
import hu.bumler.lm2.common.CurrentUser;

/** documentation/Features/AYCM tracker.md — the caller's AYCM settings singleton (see AycmSettingsService). */
@RestController
class AycmSettingsController implements AycmSettingsApi {

	private final AycmSettingsService service;
	private final CurrentUser currentUser;

	AycmSettingsController(AycmSettingsService service, CurrentUser currentUser) {
		this.service = service;
		this.currentUser = currentUser;
	}

	@Override
	public ResponseEntity<AycmSettings> getAycmSettings() {
		return ResponseEntity.ok(service.get(currentUser.id()));
	}

	@Override
	public ResponseEntity<AycmSettings> putAycmSettings(AycmSettings aycmSettings) {
		return ResponseEntity.ok(service.upsert(currentUser.id(), aycmSettings));
	}
}
