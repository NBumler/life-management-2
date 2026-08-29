package hu.bumler.lm2.climbing;

import org.springframework.stereotype.Component;

import hu.bumler.lm2.api.model.Sector;

@Component
class SectorMapper {

	Sector toDto(SectorEntity entity) {
		Sector dto = new Sector(entity.getId(), entity.getCragId(), entity.getName(), entity.isDeleted());
		dto.defaultAspect(entity.getDefaultAspect());
		dto.deletedAt(entity.getDeletedAt());
		dto.createdAt(entity.getCreatedAt());
		dto.updatedAt(entity.getUpdatedAt());
		return dto;
	}
}
