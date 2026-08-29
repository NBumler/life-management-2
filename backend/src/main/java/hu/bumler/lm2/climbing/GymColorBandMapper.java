package hu.bumler.lm2.climbing;

import org.springframework.stereotype.Component;

import hu.bumler.lm2.api.model.GymColorBand;

@Component
class GymColorBandMapper {

	GymColorBand toDto(GymColorBandEntity entity) {
		GymColorBand dto = new GymColorBand(entity.getId(), entity.getGymId(), entity.getName(), entity.getHexColor(),
				GymColorBand.VariantEnum.fromValue(entity.getVariant()), entity.getGradeLower(), entity.getGradeUpper(),
				entity.getAbsoluteDifficultyIndexLower(), entity.getAbsoluteDifficultyIndexUpper(), entity.isDeleted());
		dto.deletedAt(entity.getDeletedAt());
		dto.createdAt(entity.getCreatedAt());
		dto.updatedAt(entity.getUpdatedAt());
		return dto;
	}
}
