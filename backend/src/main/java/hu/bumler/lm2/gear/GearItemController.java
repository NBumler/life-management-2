package hu.bumler.lm2.gear;

import java.util.List;
import java.util.UUID;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RestController;

import hu.bumler.lm2.api.GearItemsApi;
import hu.bumler.lm2.api.model.GearItem;
import hu.bumler.lm2.common.CurrentUser;

@RestController
class GearItemController implements GearItemsApi {

	private final GearItemService gearItemService;
	private final CurrentUser currentUser;

	GearItemController(GearItemService gearItemService, CurrentUser currentUser) {
		this.gearItemService = gearItemService;
		this.currentUser = currentUser;
	}

	@Override
	public ResponseEntity<List<GearItem>> listGearItems() {
		return ResponseEntity.ok(gearItemService.list(currentUser.id()));
	}

	@Override
	public ResponseEntity<GearItem> createGearItem(GearItem gearItem) {
		return ResponseEntity.ok(gearItemService.create(currentUser.id(), gearItem));
	}

	@Override
	public ResponseEntity<GearItem> getGearItem(UUID id) {
		return ResponseEntity.ok(gearItemService.get(currentUser.id(), id));
	}

	@Override
	public ResponseEntity<GearItem> updateGearItem(UUID id, GearItem gearItem) {
		return ResponseEntity.ok(gearItemService.update(currentUser.id(), id, gearItem));
	}

	@Override
	public ResponseEntity<GearItem> deleteGearItem(UUID id) {
		return ResponseEntity.ok(gearItemService.delete(currentUser.id(), id));
	}
}
