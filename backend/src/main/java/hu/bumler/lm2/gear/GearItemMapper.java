package hu.bumler.lm2.gear;

import org.springframework.stereotype.Component;

import hu.bumler.lm2.api.model.GearItem;

@Component
class GearItemMapper {

	GearItem toDto(GearItemEntity entity) {
		GearItem dto = new GearItem(entity.getId(), entity.getName(), entity.isDeleted());
		dto.notes(entity.getNotes());
		dto.deletedAt(entity.getDeletedAt());
		dto.createdAt(entity.getCreatedAt());
		dto.updatedAt(entity.getUpdatedAt());
		return dto;
	}
}
