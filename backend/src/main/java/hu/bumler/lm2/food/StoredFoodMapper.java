package hu.bumler.lm2.food;

import org.springframework.stereotype.Component;

import hu.bumler.lm2.api.model.StoredFood;

@Component
class StoredFoodMapper {

	StoredFood toDto(StoredFoodEntity entity) {
		StoredFood dto = new StoredFood(entity.getId(), entity.getFoodId(), entity.getQuantityAmount(), entity.getQuantityUnit(),
				StoredFood.StorageLocationEnum.fromValue(entity.getStorageLocation()), entity.getExpiresOn(), entity.isOpened(),
				entity.isDeleted());
		dto.openedAt(entity.getOpenedAt());
		dto.deletedAt(entity.getDeletedAt());
		dto.createdAt(entity.getCreatedAt());
		dto.updatedAt(entity.getUpdatedAt());
		return dto;
	}
}
