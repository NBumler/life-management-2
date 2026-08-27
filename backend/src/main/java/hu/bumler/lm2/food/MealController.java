package hu.bumler.lm2.food;

import java.util.List;
import java.util.UUID;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RestController;

import hu.bumler.lm2.api.MealsApi;
import hu.bumler.lm2.api.model.Meal;
import hu.bumler.lm2.common.CurrentUser;

/** documentation/Subfeatures/Étkezés.md — per-user meal log (see MealService). */
@RestController
class MealController implements MealsApi {

	private final MealService mealService;
	private final CurrentUser currentUser;

	MealController(MealService mealService, CurrentUser currentUser) {
		this.mealService = mealService;
		this.currentUser = currentUser;
	}

	@Override
	public ResponseEntity<List<Meal>> listMeals() {
		return ResponseEntity.ok(mealService.list(currentUser.id()));
	}

	@Override
	public ResponseEntity<Meal> createMeal(Meal meal) {
		return ResponseEntity.ok(mealService.create(currentUser.id(), meal));
	}

	@Override
	public ResponseEntity<Meal> getMeal(UUID id) {
		return ResponseEntity.ok(mealService.get(currentUser.id(), id));
	}

	@Override
	public ResponseEntity<Meal> updateMeal(UUID id, Meal meal) {
		return ResponseEntity.ok(mealService.update(currentUser.id(), id, meal));
	}

	@Override
	public ResponseEntity<Meal> deleteMeal(UUID id) {
		return ResponseEntity.ok(mealService.delete(currentUser.id(), id));
	}
}
