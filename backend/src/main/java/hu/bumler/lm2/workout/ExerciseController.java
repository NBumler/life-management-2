package hu.bumler.lm2.workout;

import java.util.List;
import java.util.UUID;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RestController;

import hu.bumler.lm2.api.ExercisesApi;
import hu.bumler.lm2.api.model.Exercise;
import hu.bumler.lm2.common.CurrentUser;

@RestController
class ExerciseController implements ExercisesApi {

	private final ExerciseService exerciseService;
	private final CurrentUser currentUser;

	ExerciseController(ExerciseService exerciseService, CurrentUser currentUser) {
		this.exerciseService = exerciseService;
		this.currentUser = currentUser;
	}

	@Override
	public ResponseEntity<List<Exercise>> listExercises() {
		return ResponseEntity.ok(exerciseService.list(currentUser.id()));
	}

	@Override
	public ResponseEntity<Exercise> createExercise(Exercise exercise) {
		return ResponseEntity.ok(exerciseService.create(currentUser.id(), exercise));
	}

	@Override
	public ResponseEntity<Exercise> getExercise(UUID id) {
		return ResponseEntity.ok(exerciseService.get(currentUser.id(), id));
	}

	@Override
	public ResponseEntity<Exercise> updateExercise(UUID id, Exercise exercise) {
		return ResponseEntity.ok(exerciseService.update(currentUser.id(), id, exercise));
	}

	@Override
	public ResponseEntity<Exercise> deleteExercise(UUID id) {
		return ResponseEntity.ok(exerciseService.delete(currentUser.id(), id));
	}
}
