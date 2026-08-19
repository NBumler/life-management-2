package hu.bumler.lm2.gear;

import java.util.List;

import org.springframework.stereotype.Component;

import hu.bumler.lm2.api.model.PackingTemplate;
import hu.bumler.lm2.api.model.PackingTemplateDetail;
import hu.bumler.lm2.api.model.PackingTemplateItem;

@Component
class PackingTemplateMapper {

	PackingTemplate toDto(PackingTemplateEntity entity) {
		PackingTemplate dto = new PackingTemplate(entity.getId(), entity.getName(), entity.isDeleted());
		dto.notes(entity.getNotes());
		dto.deletedAt(entity.getDeletedAt());
		dto.createdAt(entity.getCreatedAt());
		dto.updatedAt(entity.getUpdatedAt());
		return dto;
	}

	/**
	 * documentation/Architektúra/Backend.md "Nested aggregate PUT": {@code items} lists every row
	 * for this template, live or tombstoned — see PackingTemplateDetail.yaml for why.
	 */
	PackingTemplateDetail toDetailDto(PackingTemplateEntity entity, List<PackingTemplateItem> items) {
		PackingTemplateDetail dto = new PackingTemplateDetail(entity.getId(), entity.getName(), entity.isDeleted(), items);
		dto.notes(entity.getNotes());
		dto.deletedAt(entity.getDeletedAt());
		dto.createdAt(entity.getCreatedAt());
		dto.updatedAt(entity.getUpdatedAt());
		return dto;
	}
}
