package hu.bumler.lm2.tasks;

import org.springframework.stereotype.Component;

import hu.bumler.lm2.api.model.HouseholdTask;

@Component
class HouseholdTaskMapper {

	HouseholdTask toDto(HouseholdTaskEntity entity) {
		HouseholdTask dto = new HouseholdTask(entity.getId(), entity.getRoomId(), entity.getName(),
				HouseholdTask.EnergyLevelEnum.fromValue(entity.getEnergyLevel()), entity.getEstimatedMinutes(), entity.getIntervalDays(),
				entity.getNextDue(), entity.isDeleted());
		dto.lastCompletedAt(entity.getLastCompletedAt());
		dto.notes(entity.getNotes());
		dto.deletedAt(entity.getDeletedAt());
		dto.createdAt(entity.getCreatedAt());
		dto.updatedAt(entity.getUpdatedAt());
		return dto;
	}
}
