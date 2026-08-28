package hu.bumler.lm2.workout;

import org.springframework.stereotype.Component;

import hu.bumler.lm2.api.model.WeeklyPlanSlot;

@Component
class WeeklyPlanSlotMapper {

	WeeklyPlanSlot toDto(WeeklyPlanSlotEntity entity) {
		WeeklyPlanSlot dto = new WeeklyPlanSlot(entity.getId(), entity.getWeeklyPlanId(),
				WeeklyPlanSlot.DayOfWeekEnum.fromValue(entity.getDayOfWeek()), entity.getPlanId(), entity.isDeleted());
		dto.deletedAt(entity.getDeletedAt());
		dto.createdAt(entity.getCreatedAt());
		dto.updatedAt(entity.getUpdatedAt());
		return dto;
	}
}
