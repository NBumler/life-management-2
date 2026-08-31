package hu.bumler.lm2.aycm;

import org.springframework.stereotype.Component;

import hu.bumler.lm2.api.model.AycmPartner;

@Component
class AycmPartnerMapper {

	AycmPartner toDto(AycmPartnerEntity entity) {
		AycmPartner dto = new AycmPartner(entity.getId(), entity.getName(), entity.isDeleted());
		dto.notes(entity.getNotes());
		dto.deletedAt(entity.getDeletedAt());
		dto.createdAt(entity.getCreatedAt());
		dto.updatedAt(entity.getUpdatedAt());
		return dto;
	}
}
