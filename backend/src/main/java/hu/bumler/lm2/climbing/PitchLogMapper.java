package hu.bumler.lm2.climbing;

import org.springframework.stereotype.Component;

import hu.bumler.lm2.api.model.PitchLog;

@Component
class PitchLogMapper {

	PitchLog toDto(PitchLogEntity entity) {
		PitchLog dto = new PitchLog(entity.getId(), entity.getAttemptId(), entity.getPitchNumber(), entity.isLead(),
				entity.getOrderIndex(), entity.isDeleted());
		dto.rawGrade(entity.getRawGrade());
		dto.absoluteDifficultyIndex(entity.getAbsoluteDifficultyIndex());
		dto.lengthInMeters(entity.getLengthInMeters());
		dto.deletedAt(entity.getDeletedAt());
		dto.createdAt(entity.getCreatedAt());
		dto.updatedAt(entity.getUpdatedAt());
		return dto;
	}
}
