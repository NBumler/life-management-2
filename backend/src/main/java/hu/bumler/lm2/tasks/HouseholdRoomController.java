package hu.bumler.lm2.tasks;

import java.util.List;
import java.util.UUID;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RestController;

import hu.bumler.lm2.api.HouseholdRoomsApi;
import hu.bumler.lm2.api.model.HouseholdRoom;
import hu.bumler.lm2.common.CurrentUser;

@RestController
class HouseholdRoomController implements HouseholdRoomsApi {

	private final HouseholdRoomService householdRoomService;
	private final CurrentUser currentUser;

	HouseholdRoomController(HouseholdRoomService householdRoomService, CurrentUser currentUser) {
		this.householdRoomService = householdRoomService;
		this.currentUser = currentUser;
	}

	@Override
	public ResponseEntity<List<HouseholdRoom>> listHouseholdRooms() {
		return ResponseEntity.ok(householdRoomService.list(currentUser.id()));
	}

	@Override
	public ResponseEntity<HouseholdRoom> createHouseholdRoom(HouseholdRoom householdRoom) {
		return ResponseEntity.ok(householdRoomService.create(currentUser.id(), householdRoom));
	}

	@Override
	public ResponseEntity<HouseholdRoom> getHouseholdRoom(UUID id) {
		return ResponseEntity.ok(householdRoomService.get(currentUser.id(), id));
	}

	@Override
	public ResponseEntity<HouseholdRoom> updateHouseholdRoom(UUID id, HouseholdRoom householdRoom) {
		return ResponseEntity.ok(householdRoomService.update(currentUser.id(), id, householdRoom));
	}

	@Override
	public ResponseEntity<HouseholdRoom> deleteHouseholdRoom(UUID id) {
		return ResponseEntity.ok(householdRoomService.delete(currentUser.id(), id));
	}
}
