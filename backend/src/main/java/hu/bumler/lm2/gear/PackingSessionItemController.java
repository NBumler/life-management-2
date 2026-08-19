package hu.bumler.lm2.gear;

import java.util.UUID;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RestController;

import hu.bumler.lm2.api.PackingSessionItemsApi;
import hu.bumler.lm2.api.model.PackingSessionItem;
import hu.bumler.lm2.common.CurrentUser;

@RestController
class PackingSessionItemController implements PackingSessionItemsApi {

	private final PackingSessionItemService packingSessionItemService;
	private final CurrentUser currentUser;

	PackingSessionItemController(PackingSessionItemService packingSessionItemService, CurrentUser currentUser) {
		this.packingSessionItemService = packingSessionItemService;
		this.currentUser = currentUser;
	}

	@Override
	public ResponseEntity<PackingSessionItem> createPackingSessionItem(PackingSessionItem packingSessionItem) {
		return ResponseEntity.ok(packingSessionItemService.create(currentUser.id(), packingSessionItem));
	}

	@Override
	public ResponseEntity<PackingSessionItem> getPackingSessionItem(UUID id) {
		return ResponseEntity.ok(packingSessionItemService.get(currentUser.id(), id));
	}

	@Override
	public ResponseEntity<PackingSessionItem> updatePackingSessionItem(UUID id, PackingSessionItem packingSessionItem) {
		return ResponseEntity.ok(packingSessionItemService.update(currentUser.id(), id, packingSessionItem));
	}
}
