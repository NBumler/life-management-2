package hu.bumler.lm2.steps;

import org.springframework.stereotype.Component;

import hu.bumler.lm2.api.model.DailyStepLog;

@Component
class DailyStepLogMapper {

	DailyStepLog toDto(DailyStepLogEntity entity) {
		DailyStepLog dto = new DailyStepLog(entity.getId(), entity.getLogDate(), entity.getStepCount(),
				entity.isDeleted());
		dto.deletedAt(entity.getDeletedAt());
		dto.createdAt(entity.getCreatedAt());
		dto.updatedAt(entity.getUpdatedAt());
		return dto;
	}
}
