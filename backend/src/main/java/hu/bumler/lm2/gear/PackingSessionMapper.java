package hu.bumler.lm2.gear;

import java.util.List;

import org.springframework.stereotype.Component;

import hu.bumler.lm2.api.model.PackingSession;
import hu.bumler.lm2.api.model.PackingSessionDetail;
import hu.bumler.lm2.api.model.PackingSessionItem;

@Component
class PackingSessionMapper {

	PackingSession toDto(PackingSessionEntity entity) {
		PackingSession dto = new PackingSession(entity.getId(), entity.isDeleted());
		dto.destination(entity.getDestination());
		dto.sourceTemplateIds(entity.getSourceTemplateIds());
		dto.deletedAt(entity.getDeletedAt());
		dto.createdAt(entity.getCreatedAt());
		dto.updatedAt(entity.getUpdatedAt());
		return dto;
	}

	PackingSessionDetail toDetailDto(PackingSessionEntity entity, List<PackingSessionItem> items) {
		PackingSessionDetail dto = new PackingSessionDetail(entity.getId(), entity.isDeleted(), items);
		dto.destination(entity.getDestination());
		dto.sourceTemplateIds(entity.getSourceTemplateIds());
		dto.deletedAt(entity.getDeletedAt());
		dto.createdAt(entity.getCreatedAt());
		dto.updatedAt(entity.getUpdatedAt());
		return dto;
	}
}
