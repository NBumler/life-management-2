package hu.bumler.lm2.aycm;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RestController;

import hu.bumler.lm2.api.AycmCheckInsApi;
import hu.bumler.lm2.api.model.AycmCheckIn;
import hu.bumler.lm2.common.CurrentUser;

/** documentation/Subfeatures/AYCM Check-In.md — per-user AYCM Check-Ins (see AycmCheckInService). */
@RestController
class AycmCheckInController implements AycmCheckInsApi {

	private final AycmCheckInService service;
	private final CurrentUser currentUser;

	AycmCheckInController(AycmCheckInService service, CurrentUser currentUser) {
		this.service = service;
		this.currentUser = currentUser;
	}

	@Override
	public ResponseEntity<List<AycmCheckIn>> listAycmCheckIns(LocalDate from, LocalDate to) {
		return ResponseEntity.ok(service.list(currentUser.id(), from, to));
	}

	@Override
	public ResponseEntity<AycmCheckIn> createAycmCheckIn(AycmCheckIn aycmCheckIn) {
		return ResponseEntity.ok(service.create(currentUser.id(), aycmCheckIn));
	}

	@Override
	public ResponseEntity<AycmCheckIn> getAycmCheckIn(UUID id) {
		return ResponseEntity.ok(service.get(currentUser.id(), id));
	}

	@Override
	public ResponseEntity<AycmCheckIn> updateAycmCheckIn(UUID id, AycmCheckIn aycmCheckIn) {
		return ResponseEntity.ok(service.update(currentUser.id(), id, aycmCheckIn));
	}

	@Override
	public ResponseEntity<AycmCheckIn> deleteAycmCheckIn(UUID id) {
		return ResponseEntity.ok(service.delete(currentUser.id(), id));
	}
}
