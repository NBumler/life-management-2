package hu.bumler.lm2.profile;

import org.springframework.stereotype.Component;

import hu.bumler.lm2.api.model.WeightHistoryEntry;

@Component
class WeightHistoryEntryMapper {

	WeightHistoryEntry toDto(WeightHistoryEntryEntity entity) {
		WeightHistoryEntry dto = new WeightHistoryEntry(entity.getId(), entity.getRecordedAt(), entity.getWeightKg(),
				entity.isDeleted());
		dto.deletedAt(entity.getDeletedAt());
		dto.createdAt(entity.getCreatedAt());
		dto.updatedAt(entity.getUpdatedAt());
		return dto;
	}
}
