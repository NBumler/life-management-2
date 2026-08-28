package hu.bumler.lm2.workout;

import java.util.List;
import java.util.UUID;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RestController;

import hu.bumler.lm2.api.WorkoutSessionsApi;
import hu.bumler.lm2.api.model.WorkoutSession;
import hu.bumler.lm2.common.CurrentUser;

/** documentation/Subfeatures/Edzésnapló.md — per-user workout log (see WorkoutSessionService). */
@RestController
class WorkoutSessionController implements WorkoutSessionsApi {

	private final WorkoutSessionService workoutSessionService;
	private final CurrentUser currentUser;

	WorkoutSessionController(WorkoutSessionService workoutSessionService, CurrentUser currentUser) {
		this.workoutSessionService = workoutSessionService;
		this.currentUser = currentUser;
	}

	@Override
	public ResponseEntity<List<WorkoutSession>> listWorkoutSessions() {
		return ResponseEntity.ok(workoutSessionService.list(currentUser.id()));
	}

	@Override
	public ResponseEntity<WorkoutSession> createWorkoutSession(WorkoutSession workoutSession) {
		return ResponseEntity.ok(workoutSessionService.create(currentUser.id(), workoutSession));
	}

	@Override
	public ResponseEntity<WorkoutSession> getWorkoutSession(UUID id) {
		return ResponseEntity.ok(workoutSessionService.get(currentUser.id(), id));
	}

	@Override
	public ResponseEntity<WorkoutSession> updateWorkoutSession(UUID id, WorkoutSession workoutSession) {
		return ResponseEntity.ok(workoutSessionService.update(currentUser.id(), id, workoutSession));
	}

	@Override
	public ResponseEntity<WorkoutSession> deleteWorkoutSession(UUID id) {
		return ResponseEntity.ok(workoutSessionService.delete(currentUser.id(), id));
	}
}
