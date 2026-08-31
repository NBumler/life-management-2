package hu.bumler.lm2.aycm;

import org.springframework.stereotype.Component;

import hu.bumler.lm2.api.model.AycmSettings;

/** Manual DTO <-> entity mapping (starter kit convention). */
@Component
class AycmSettingsMapper {

	AycmSettings toDto(AycmSettingsEntity entity) {
		AycmSettings dto = new AycmSettings(entity.getId());
		dto.linkedRecurringExpenseId(entity.getLinkedRecurringExpenseId());
		dto.createdAt(entity.getCreatedAt());
		dto.updatedAt(entity.getUpdatedAt());
		return dto;
	}

	/** PUT is a full-body replace (documentation/Architektúra/Backend-offline first.md). */
	void applyTo(AycmSettingsEntity entity, AycmSettings dto) {
		entity.setLinkedRecurringExpenseId(dto.getLinkedRecurringExpenseId().orElse(null));
	}
}
