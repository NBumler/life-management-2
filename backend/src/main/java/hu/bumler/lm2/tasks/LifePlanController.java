package hu.bumler.lm2.tasks;

import java.util.List;
import java.util.UUID;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RestController;

import hu.bumler.lm2.api.LifePlansApi;
import hu.bumler.lm2.api.model.LifePlan;
import hu.bumler.lm2.common.CurrentUser;

@RestController
class LifePlanController implements LifePlansApi {

	private final LifePlanService lifePlanService;
	private final CurrentUser currentUser;

	LifePlanController(LifePlanService lifePlanService, CurrentUser currentUser) {
		this.lifePlanService = lifePlanService;
		this.currentUser = currentUser;
	}

	@Override
	public ResponseEntity<List<LifePlan>> listLifePlans() {
		return ResponseEntity.ok(lifePlanService.list(currentUser.id()));
	}

	@Override
	public ResponseEntity<LifePlan> createLifePlan(LifePlan lifePlan) {
		return ResponseEntity.ok(lifePlanService.create(currentUser.id(), lifePlan));
	}

	@Override
	public ResponseEntity<LifePlan> getLifePlan(UUID id) {
		return ResponseEntity.ok(lifePlanService.get(currentUser.id(), id));
	}

	@Override
	public ResponseEntity<LifePlan> updateLifePlan(UUID id, LifePlan lifePlan) {
		return ResponseEntity.ok(lifePlanService.update(currentUser.id(), id, lifePlan));
	}

	@Override
	public ResponseEntity<LifePlan> deleteLifePlan(UUID id) {
		return ResponseEntity.ok(lifePlanService.delete(currentUser.id(), id));
	}
}
