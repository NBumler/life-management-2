package hu.bumler.lm2.tasks;

import java.util.List;
import java.util.UUID;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RestController;

import hu.bumler.lm2.api.HouseholdTasksApi;
import hu.bumler.lm2.api.model.HouseholdTask;
import hu.bumler.lm2.common.CurrentUser;

@RestController
class HouseholdTaskController implements HouseholdTasksApi {

	private final HouseholdTaskService householdTaskService;
	private final CurrentUser currentUser;

	HouseholdTaskController(HouseholdTaskService householdTaskService, CurrentUser currentUser) {
		this.householdTaskService = householdTaskService;
		this.currentUser = currentUser;
	}

	@Override
	public ResponseEntity<List<HouseholdTask>> listHouseholdTasks() {
		return ResponseEntity.ok(householdTaskService.list(currentUser.id()));
	}

	@Override
	public ResponseEntity<HouseholdTask> createHouseholdTask(HouseholdTask householdTask) {
		return ResponseEntity.ok(householdTaskService.create(currentUser.id(), householdTask));
	}

	@Override
	public ResponseEntity<HouseholdTask> getHouseholdTask(UUID id) {
		return ResponseEntity.ok(householdTaskService.get(currentUser.id(), id));
	}

	@Override
	public ResponseEntity<HouseholdTask> updateHouseholdTask(UUID id, HouseholdTask householdTask) {
		return ResponseEntity.ok(householdTaskService.update(currentUser.id(), id, householdTask));
	}

	@Override
	public ResponseEntity<HouseholdTask> deleteHouseholdTask(UUID id) {
		return ResponseEntity.ok(householdTaskService.delete(currentUser.id(), id));
	}
}
