package hu.bumler.lm2.food;

import org.springframework.stereotype.Component;

import hu.bumler.lm2.api.model.ShoppingListItem;

@Component
class ShoppingListItemMapper {

	ShoppingListItem toDto(ShoppingListItemEntity entity) {
		ShoppingListItem dto = new ShoppingListItem(entity.getId(), entity.getShoppingListId(),
				ShoppingListItem.TypeEnum.fromValue(entity.getType()), entity.isChecked(), entity.getSortOrder(), entity.isDeleted());
		dto.foodId(entity.getFoodId());
		dto.name(entity.getName());
		dto.note(entity.getNote());
		dto.quantityAmount(entity.getQuantityAmount());
		dto.quantityUnit(entity.getQuantityUnit());
		dto.deletedAt(entity.getDeletedAt());
		dto.createdAt(entity.getCreatedAt());
		dto.updatedAt(entity.getUpdatedAt());
		return dto;
	}
}
