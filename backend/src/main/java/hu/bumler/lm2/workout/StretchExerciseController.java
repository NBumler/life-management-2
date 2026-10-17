package hu.bumler.lm2.workout;

import java.util.List;
import java.util.UUID;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RestController;

import hu.bumler.lm2.api.StretchExercisesApi;
import hu.bumler.lm2.api.model.StretchExercise;
import hu.bumler.lm2.common.CurrentUser;

@RestController
class StretchExerciseController implements StretchExercisesApi {

	private final StretchExerciseService stretchExerciseService;
	private final CurrentUser currentUser;

	StretchExerciseController(StretchExerciseService stretchExerciseService, CurrentUser currentUser) {
		this.stretchExerciseService = stretchExerciseService;
		this.currentUser = currentUser;
	}

	@Override
	public ResponseEntity<List<StretchExercise>> listStretchExercises() {
		return ResponseEntity.ok(stretchExerciseService.list(currentUser.id()));
	}

	@Override
	public ResponseEntity<StretchExercise> createStretchExercise(StretchExercise stretchExercise) {
		return ResponseEntity.ok(stretchExerciseService.create(currentUser.id(), stretchExercise));
	}

	@Override
	public ResponseEntity<StretchExercise> getStretchExercise(UUID id) {
		return ResponseEntity.ok(stretchExerciseService.get(currentUser.id(), id));
	}

	@Override
	public ResponseEntity<StretchExercise> updateStretchExercise(UUID id, StretchExercise stretchExercise) {
		return ResponseEntity.ok(stretchExerciseService.update(currentUser.id(), id, stretchExercise));
	}

	@Override
	public ResponseEntity<StretchExercise> deleteStretchExercise(UUID id) {
		return ResponseEntity.ok(stretchExerciseService.delete(currentUser.id(), id));
	}
}
