package hu.bumler.lm2.food;

import java.util.List;

import org.springframework.stereotype.Component;

import hu.bumler.lm2.api.model.ShoppingList;
import hu.bumler.lm2.api.model.ShoppingListItem;

@Component
class ShoppingListMapper {

	/**
	 * documentation/Architektúra/Backend.md "Nested aggregate PUT": {@code items} lists every row
	 * for this list, live or tombstoned — see ShoppingList.yaml for why.
	 */
	ShoppingList toDto(ShoppingListEntity entity, List<ShoppingListItem> items) {
		ShoppingList dto = new ShoppingList(entity.getId(), items, entity.isDeleted());
		dto.name(entity.getName());
		dto.status(ShoppingList.StatusEnum.fromValue(entity.getStatus()));
		dto.completedAt(entity.getCompletedAt());
		dto.deletedAt(entity.getDeletedAt());
		dto.createdAt(entity.getCreatedAt());
		dto.updatedAt(entity.getUpdatedAt());
		return dto;
	}
}
