package hu.bumler.lm2.aycm;

import java.util.List;
import java.util.UUID;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RestController;

import hu.bumler.lm2.api.AycmPartnersApi;
import hu.bumler.lm2.api.model.AycmPartner;
import hu.bumler.lm2.common.CurrentUser;

/** documentation/Subfeatures/AYCM elfogadóhely hozzáadása.md — per-user AYCM partners (see AycmPartnerService). */
@RestController
class AycmPartnerController implements AycmPartnersApi {

	private final AycmPartnerService service;
	private final CurrentUser currentUser;

	AycmPartnerController(AycmPartnerService service, CurrentUser currentUser) {
		this.service = service;
		this.currentUser = currentUser;
	}

	@Override
	public ResponseEntity<List<AycmPartner>> listAycmPartners() {
		return ResponseEntity.ok(service.list(currentUser.id()));
	}

	@Override
	public ResponseEntity<AycmPartner> createAycmPartner(AycmPartner aycmPartner) {
		return ResponseEntity.ok(service.create(currentUser.id(), aycmPartner));
	}

	@Override
	public ResponseEntity<AycmPartner> getAycmPartner(UUID id) {
		return ResponseEntity.ok(service.get(currentUser.id(), id));
	}

	@Override
	public ResponseEntity<AycmPartner> updateAycmPartner(UUID id, AycmPartner aycmPartner) {
		return ResponseEntity.ok(service.update(currentUser.id(), id, aycmPartner));
	}

	@Override
	public ResponseEntity<AycmPartner> deleteAycmPartner(UUID id) {
		return ResponseEntity.ok(service.delete(currentUser.id(), id));
	}
}
