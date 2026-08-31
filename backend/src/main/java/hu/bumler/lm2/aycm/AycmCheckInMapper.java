package hu.bumler.lm2.aycm;

import org.springframework.stereotype.Component;

import hu.bumler.lm2.api.model.AycmCheckIn;

@Component
class AycmCheckInMapper {

	AycmCheckIn toDto(AycmCheckInEntity entity) {
		AycmCheckIn dto = new AycmCheckIn(entity.getId(), entity.getCheckInDate(), entity.getCheckInTime(),
				entity.getPartnerId(), entity.getPartnerName(), entity.getRuleLabel(), entity.getListPriceHuf(),
				entity.getCoPaymentHuf(), entity.getVisitValueHuf(), entity.isDeleted());
		dto.ruleId(entity.getRuleId());
		dto.notes(entity.getNotes());
		dto.deletedAt(entity.getDeletedAt());
		dto.createdAt(entity.getCreatedAt());
		dto.updatedAt(entity.getUpdatedAt());
		return dto;
	}
}
