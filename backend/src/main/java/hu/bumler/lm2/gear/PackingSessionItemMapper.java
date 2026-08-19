package hu.bumler.lm2.gear;

import org.springframework.stereotype.Component;

import hu.bumler.lm2.api.model.PackingSessionItem;

@Component
class PackingSessionItemMapper {

	PackingSessionItem toDto(PackingSessionItemEntity entity) {
		PackingSessionItem dto = new PackingSessionItem(entity.getId(), entity.getSessionId(), entity.getGearItemId(),
				PackingSessionItem.StatusEnum.fromValue(entity.getStatus()), entity.getSortOrder(), entity.isDeleted());
		dto.deletedAt(entity.getDeletedAt());
		dto.createdAt(entity.getCreatedAt());
		dto.updatedAt(entity.getUpdatedAt());
		return dto;
	}
}
