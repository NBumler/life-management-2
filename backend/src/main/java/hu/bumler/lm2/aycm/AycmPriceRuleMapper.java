package hu.bumler.lm2.aycm;

import org.springframework.stereotype.Component;

import hu.bumler.lm2.api.model.AycmPriceRule;

@Component
class AycmPriceRuleMapper {

	AycmPriceRule toDto(AycmPriceRuleEntity entity) {
		AycmPriceRule dto = new AycmPriceRule(entity.getId(), entity.getPartnerId(), entity.isAppliesMon(),
				entity.isAppliesTue(), entity.isAppliesWed(), entity.isAppliesThu(), entity.isAppliesFri(),
				entity.isAppliesSat(), entity.isAppliesSun(), entity.getStartTime(), entity.getEndTime(),
				entity.getListPriceHuf(), entity.getCoPaymentHuf(), entity.isDeleted());
		dto.label(entity.getLabel());
		dto.deletedAt(entity.getDeletedAt());
		dto.createdAt(entity.getCreatedAt());
		dto.updatedAt(entity.getUpdatedAt());
		return dto;
	}
}
