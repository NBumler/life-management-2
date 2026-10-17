package hu.bumler.lm2.workout;

import java.util.List;
import java.util.UUID;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RestController;

import hu.bumler.lm2.api.StretchPlansApi;
import hu.bumler.lm2.api.model.StretchPlan;
import hu.bumler.lm2.common.CurrentUser;

/** documentation/Subfeatures/Heti terv.md "Nyújtó sablonok" — per-user stretching templates (see StretchPlanService). */
@RestController
class StretchPlanController implements StretchPlansApi {

	private final StretchPlanService stretchPlanService;
	private final CurrentUser currentUser;

	StretchPlanController(StretchPlanService stretchPlanService, CurrentUser currentUser) {
		this.stretchPlanService = stretchPlanService;
		this.currentUser = currentUser;
	}

	@Override
	public ResponseEntity<List<StretchPlan>> listStretchPlans() {
		return ResponseEntity.ok(stretchPlanService.list(currentUser.id()));
	}

	@Override
	public ResponseEntity<StretchPlan> createStretchPlan(StretchPlan stretchPlan) {
		return ResponseEntity.ok(stretchPlanService.create(currentUser.id(), stretchPlan));
	}

	@Override
	public ResponseEntity<StretchPlan> getStretchPlan(UUID id) {
		return ResponseEntity.ok(stretchPlanService.get(currentUser.id(), id));
	}

	@Override
	public ResponseEntity<StretchPlan> updateStretchPlan(UUID id, StretchPlan stretchPlan) {
		return ResponseEntity.ok(stretchPlanService.update(currentUser.id(), id, stretchPlan));
	}

	@Override
	public ResponseEntity<StretchPlan> deleteStretchPlan(UUID id) {
		return ResponseEntity.ok(stretchPlanService.delete(currentUser.id(), id));
	}
}
