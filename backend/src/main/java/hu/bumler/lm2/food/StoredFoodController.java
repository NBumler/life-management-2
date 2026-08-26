package hu.bumler.lm2.food;

import java.util.List;
import java.util.UUID;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RestController;

import hu.bumler.lm2.api.StoredFoodsApi;
import hu.bumler.lm2.api.model.StoredFood;
import hu.bumler.lm2.common.CurrentUser;

@RestController
class StoredFoodController implements StoredFoodsApi {

	private final StoredFoodService storedFoodService;
	private final CurrentUser currentUser;

	StoredFoodController(StoredFoodService storedFoodService, CurrentUser currentUser) {
		this.storedFoodService = storedFoodService;
		this.currentUser = currentUser;
	}

	@Override
	public ResponseEntity<List<StoredFood>> listStoredFoods() {
		return ResponseEntity.ok(storedFoodService.list(currentUser.id()));
	}

	@Override
	public ResponseEntity<StoredFood> createStoredFood(StoredFood storedFood) {
		return ResponseEntity.ok(storedFoodService.create(currentUser.id(), storedFood));
	}

	@Override
	public ResponseEntity<StoredFood> getStoredFood(UUID id) {
		return ResponseEntity.ok(storedFoodService.get(currentUser.id(), id));
	}

	@Override
	public ResponseEntity<StoredFood> updateStoredFood(UUID id, StoredFood storedFood) {
		return ResponseEntity.ok(storedFoodService.update(currentUser.id(), id, storedFood));
	}

	@Override
	public ResponseEntity<StoredFood> deleteStoredFood(UUID id) {
		return ResponseEntity.ok(storedFoodService.delete(currentUser.id(), id));
	}
}
