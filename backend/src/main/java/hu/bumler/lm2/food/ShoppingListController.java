package hu.bumler.lm2.food;

import java.util.List;
import java.util.UUID;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RestController;

import hu.bumler.lm2.api.ShoppingListsApi;
import hu.bumler.lm2.api.model.ShoppingList;
import hu.bumler.lm2.api.model.ShoppingListCompleteRequest;
import hu.bumler.lm2.api.model.ShoppingListCompleteResponse;
import hu.bumler.lm2.common.CurrentUser;

/** documentation/Subfeatures/Bevásárlólista írás.md — per-user active shopping list (see ShoppingListService). */
@RestController
class ShoppingListController implements ShoppingListsApi {

	private final ShoppingListService shoppingListService;
	private final CurrentUser currentUser;

	ShoppingListController(ShoppingListService shoppingListService, CurrentUser currentUser) {
		this.shoppingListService = shoppingListService;
		this.currentUser = currentUser;
	}

	@Override
	public ResponseEntity<List<ShoppingList>> listShoppingLists() {
		return ResponseEntity.ok(shoppingListService.list(currentUser.id()));
	}

	@Override
	public ResponseEntity<ShoppingList> createShoppingList(ShoppingList shoppingList) {
		return ResponseEntity.ok(shoppingListService.create(currentUser.id(), shoppingList));
	}

	@Override
	public ResponseEntity<ShoppingList> getShoppingList(UUID id) {
		return ResponseEntity.ok(shoppingListService.get(currentUser.id(), id));
	}

	@Override
	public ResponseEntity<ShoppingList> updateShoppingList(UUID id, ShoppingList shoppingList) {
		return ResponseEntity.ok(shoppingListService.update(currentUser.id(), id, shoppingList));
	}

	@Override
	public ResponseEntity<ShoppingList> deleteShoppingList(UUID id) {
		return ResponseEntity.ok(shoppingListService.delete(currentUser.id(), id));
	}

	@Override
	public ResponseEntity<ShoppingListCompleteResponse> completeShoppingList(UUID id, UUID idempotencyKey, ShoppingListCompleteRequest shoppingListCompleteRequest) {
		return ResponseEntity.ok(shoppingListService.complete(currentUser.id(), id, idempotencyKey, shoppingListCompleteRequest));
	}
}
