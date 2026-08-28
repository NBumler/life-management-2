package hu.bumler.lm2.workout;

import java.util.List;
import java.util.UUID;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RestController;

import hu.bumler.lm2.api.WorkoutPlansApi;
import hu.bumler.lm2.api.model.WorkoutPlan;
import hu.bumler.lm2.common.CurrentUser;

/** documentation/Subfeatures/Heti terv.md — per-user training templates (see WorkoutPlanService). */
@RestController
class WorkoutPlanController implements WorkoutPlansApi {

	private final WorkoutPlanService workoutPlanService;
	private final CurrentUser currentUser;

	WorkoutPlanController(WorkoutPlanService workoutPlanService, CurrentUser currentUser) {
		this.workoutPlanService = workoutPlanService;
		this.currentUser = currentUser;
	}

	@Override
	public ResponseEntity<List<WorkoutPlan>> listWorkoutPlans() {
		return ResponseEntity.ok(workoutPlanService.list(currentUser.id()));
	}

	@Override
	public ResponseEntity<WorkoutPlan> createWorkoutPlan(WorkoutPlan workoutPlan) {
		return ResponseEntity.ok(workoutPlanService.create(currentUser.id(), workoutPlan));
	}

	@Override
	public ResponseEntity<WorkoutPlan> getWorkoutPlan(UUID id) {
		return ResponseEntity.ok(workoutPlanService.get(currentUser.id(), id));
	}

	@Override
	public ResponseEntity<WorkoutPlan> updateWorkoutPlan(UUID id, WorkoutPlan workoutPlan) {
		return ResponseEntity.ok(workoutPlanService.update(currentUser.id(), id, workoutPlan));
	}

	@Override
	public ResponseEntity<WorkoutPlan> deleteWorkoutPlan(UUID id) {
		return ResponseEntity.ok(workoutPlanService.delete(currentUser.id(), id));
	}
}
