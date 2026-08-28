package hu.bumler.lm2.workout;

import java.util.List;
import java.util.UUID;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RestController;

import hu.bumler.lm2.api.WeeklyPlansApi;
import hu.bumler.lm2.api.model.WeeklyPlan;
import hu.bumler.lm2.common.CurrentUser;

/** documentation/Subfeatures/Heti terv.md — per-user weekly plans (see WeeklyPlanService). */
@RestController
class WeeklyPlanController implements WeeklyPlansApi {

	private final WeeklyPlanService weeklyPlanService;
	private final CurrentUser currentUser;

	WeeklyPlanController(WeeklyPlanService weeklyPlanService, CurrentUser currentUser) {
		this.weeklyPlanService = weeklyPlanService;
		this.currentUser = currentUser;
	}

	@Override
	public ResponseEntity<List<WeeklyPlan>> listWeeklyPlans() {
		return ResponseEntity.ok(weeklyPlanService.list(currentUser.id()));
	}

	@Override
	public ResponseEntity<WeeklyPlan> createWeeklyPlan(WeeklyPlan weeklyPlan) {
		return ResponseEntity.ok(weeklyPlanService.create(currentUser.id(), weeklyPlan));
	}

	@Override
	public ResponseEntity<WeeklyPlan> getWeeklyPlan(UUID id) {
		return ResponseEntity.ok(weeklyPlanService.get(currentUser.id(), id));
	}

	@Override
	public ResponseEntity<WeeklyPlan> updateWeeklyPlan(UUID id, WeeklyPlan weeklyPlan) {
		return ResponseEntity.ok(weeklyPlanService.update(currentUser.id(), id, weeklyPlan));
	}

	@Override
	public ResponseEntity<WeeklyPlan> deleteWeeklyPlan(UUID id) {
		return ResponseEntity.ok(weeklyPlanService.delete(currentUser.id(), id));
	}
}
