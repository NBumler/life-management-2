package hu.bumler.lm2.food;

import java.util.List;
import java.util.UUID;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RestController;

import hu.bumler.lm2.api.FoodsApi;
import hu.bumler.lm2.api.model.Food;

/** documentation/Subfeatures/Élelmiszerek.md — shared catalog, no per-user scoping (see FoodService). */
@RestController
class FoodController implements FoodsApi {

	private final FoodService foodService;

	FoodController(FoodService foodService) {
		this.foodService = foodService;
	}

	@Override
	public ResponseEntity<List<Food>> listFoods() {
		return ResponseEntity.ok(foodService.list());
	}

	@Override
	public ResponseEntity<Food> createFood(Food food) {
		return ResponseEntity.ok(foodService.create(food));
	}

	@Override
	public ResponseEntity<Food> getFood(UUID id) {
		return ResponseEntity.ok(foodService.get(id));
	}

	@Override
	public ResponseEntity<Food> updateFood(UUID id, Food food) {
		return ResponseEntity.ok(foodService.update(id, food));
	}

	@Override
	public ResponseEntity<Food> deleteFood(UUID id) {
		return ResponseEntity.ok(foodService.delete(id));
	}
}
