package hu.bumler.lm2.gear;

import org.springframework.stereotype.Component;

import hu.bumler.lm2.api.model.PackingTemplateItem;

@Component
class PackingTemplateItemMapper {

	PackingTemplateItem toDto(PackingTemplateItemEntity entity) {
		PackingTemplateItem dto = new PackingTemplateItem(entity.getId(), entity.getTemplateId(), entity.getGearItemId(),
				entity.getSortOrder(), entity.isDeleted());
		dto.deletedAt(entity.getDeletedAt());
		dto.createdAt(entity.getCreatedAt());
		dto.updatedAt(entity.getUpdatedAt());
		return dto;
	}
}
