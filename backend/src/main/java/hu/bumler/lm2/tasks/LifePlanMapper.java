package hu.bumler.lm2.tasks;

import org.springframework.stereotype.Component;

import hu.bumler.lm2.api.model.LifePlan;

@Component
class LifePlanMapper {

	LifePlan toDto(LifePlanEntity entity) {
		LifePlan dto = new LifePlan(entity.getId(), entity.getTitle(), LifePlan.StatusEnum.fromValue(entity.getStatus()),
				entity.isDeleted());
		dto.notes(entity.getNotes());
		dto.targetDate(entity.getTargetDate());
		dto.completedAt(entity.getCompletedAt());
		dto.deletedAt(entity.getDeletedAt());
		dto.createdAt(entity.getCreatedAt());
		dto.updatedAt(entity.getUpdatedAt());
		return dto;
	}
}
